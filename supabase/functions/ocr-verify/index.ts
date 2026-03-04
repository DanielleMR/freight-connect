import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OcrRequest {
  documentId: string;
  imageUrl: string;
  tipoDocumento: string;
  userId: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleVisionKey = Deno.env.get("GOOGLE_VISION_API_KEY");

    if (!googleVisionKey) {
      return new Response(
        JSON.stringify({ error: "Google Vision API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const callerUserId = claimsData.claims.sub;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { documentId, imageUrl, tipoDocumento, userId }: OcrRequest = await req.json();

    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch document image");
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    // Call Google Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${googleVisionKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
            },
          ],
        }),
      }
    );

    if (!visionResponse.ok) {
      const errText = await visionResponse.text();
      console.error("Vision API error:", errText);
      throw new Error(`Google Vision API error: ${visionResponse.status}`);
    }

    const visionResult = await visionResponse.json();
    const fullText = visionResult.responses?.[0]?.fullTextAnnotation?.text || "";

    // Extract data based on document type
    const extractedData = extractDocumentData(fullText, tipoDocumento);

    // Fetch user registration data for comparison
    const userData = await getUserRegistrationData(supabase, userId, tipoDocumento);

    // Compare extracted data with registration
    const comparison = compareData(extractedData, userData, tipoDocumento);

    // Determine verification status
    let verificationStatus = "valido";
    if (!fullText || fullText.length < 10) {
      verificationStatus = "ilegivel";
    } else if (comparison.divergences.length > 0) {
      verificationStatus = "divergencia";
    } else if (extractedData.dataValidade && isExpired(extractedData.dataValidade)) {
      verificationStatus = "expirado";
    }

    // Generate document hash
    const encoder = new TextEncoder();
    const data = encoder.encode(base64Image.substring(0, 1000));
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const documentHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Get IP
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // Save verification result
    const { error: insertError } = await supabase
      .from("document_verifications")
      .insert({
        document_id: documentId,
        user_id: userId,
        ocr_service: "google_vision",
        ocr_result: { fullText: fullText.substring(0, 5000), annotationsCount: visionResult.responses?.[0]?.textAnnotations?.length || 0 },
        extracted_data: extractedData,
        comparison_result: comparison,
        status: verificationStatus,
        document_hash: documentHash,
        ip_address: ipAddress,
      });

    if (insertError) {
      console.error("Error saving verification:", insertError);
    }

    // Log audit
    await supabase.rpc("inserir_auditoria_sistema", {
      p_acao: "ocr_verificacao",
      p_tabela: "document_verifications",
      p_registro_id: documentId,
      p_dados_novos: { status: verificationStatus, service: "google_vision", divergences: comparison.divergences.length },
    });

    return new Response(
      JSON.stringify({
        success: true,
        status: verificationStatus,
        extractedData,
        comparison,
        ocrConfidence: fullText.length > 50 ? "high" : fullText.length > 10 ? "medium" : "low",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("OCR verification error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

function extractDocumentData(text: string, tipo: string): Record<string, string | null> {
  const lines = text.toUpperCase().split("\n").map((l: string) => l.trim());
  const fullTextUpper = text.toUpperCase();
  const result: Record<string, string | null> = {};

  // CPF extraction
  const cpfMatch = text.match(/\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2}/);
  result.cpf = cpfMatch ? cpfMatch[0].replace(/[.\s-]/g, "") : null;

  // Name extraction (usually after "NOME" keyword)
  const nomeMatch = text.match(/NOME[:\s]*([A-ZÁÀÃÂÉÈÊÍÌÎÓÒÕÔÚÙÛÇ\s]+)/i);
  result.nome = nomeMatch ? nomeMatch[1].trim() : null;

  if (tipo === "cnh" || tipo === "documento_pessoal") {
    // CNH number
    const cnhMatch = text.match(/(?:REG(?:ISTRO)?|Nº?\s*REG)[:\s]*(\d{9,11})/i);
    result.numeroCnh = cnhMatch ? cnhMatch[1] : null;

    // Category
    const catMatch = text.match(/CAT(?:EGORIA)?[:\s]*([A-E]{1,2})/i);
    result.categoriaCnh = catMatch ? catMatch[1].toUpperCase() : null;

    // Validity
    const valMatch = text.match(/VAL(?:IDADE)?[:\s]*(\d{2}[\/.-]\d{2}[\/.-]\d{4})/i);
    result.dataValidade = valMatch ? valMatch[1] : null;
  }

  if (tipo === "crlv" || tipo === "documento_veiculo") {
    // Plate
    const placaMatch = text.match(/[A-Z]{3}[-\s]?\d[A-Z0-9]\d{2}/i);
    result.placa = placaMatch ? placaMatch[0].toUpperCase().replace(/[-\s]/g, "") : null;

    // RENAVAM
    const renavamMatch = text.match(/RENAVAM[:\s]*(\d{9,11})/i);
    result.renavam = renavamMatch ? renavamMatch[1] : null;
  }

  return result;
}

async function getUserRegistrationData(supabase: any, userId: string, tipo: string) {
  const result: Record<string, string | null> = {};

  // Check transportador
  const { data: transp } = await supabase
    .from("transportadores")
    .select("nome, cpf_cnpj, placa_veiculo")
    .eq("user_id", userId)
    .maybeSingle();

  if (transp) {
    result.nome = transp.nome;
    result.cpf = transp.cpf_cnpj?.replace(/[.\s-/]/g, "") || null;
    result.placa = transp.placa_veiculo?.replace(/[-\s]/g, "").toUpperCase() || null;
  }

  // Check driver_profiles
  const { data: driver } = await supabase
    .from("driver_profiles")
    .select("name, cpf, cnh_number, cnh_category, cnh_expiry")
    .eq("user_id", userId)
    .maybeSingle();

  if (driver) {
    result.nome = result.nome || driver.name;
    result.cpf = result.cpf || driver.cpf?.replace(/[.\s-]/g, "");
    result.numeroCnh = driver.cnh_number || null;
    result.categoriaCnh = driver.cnh_category || null;
  }

  // Check produtor
  const { data: prod } = await supabase
    .from("produtores")
    .select("nome, cpf_cnpj")
    .eq("user_id", userId)
    .maybeSingle();

  if (prod) {
    result.nome = result.nome || prod.nome;
    result.cpf = result.cpf || prod.cpf_cnpj?.replace(/[.\s-/]/g, "");
  }

  return result;
}

function compareData(
  extracted: Record<string, string | null>,
  registered: Record<string, string | null>,
  tipo: string
): { matches: string[]; divergences: { field: string; extracted: string | null; registered: string | null }[] } {
  const matches: string[] = [];
  const divergences: { field: string; extracted: string | null; registered: string | null }[] = [];

  const fieldsToCompare = ["cpf", "nome"];
  if (tipo === "cnh") fieldsToCompare.push("numeroCnh", "categoriaCnh");
  if (tipo === "crlv" || tipo === "documento_veiculo") fieldsToCompare.push("placa");

  for (const field of fieldsToCompare) {
    const ext = extracted[field]?.replace(/\s+/g, "").toUpperCase() || null;
    const reg = registered[field]?.replace(/\s+/g, "").toUpperCase() || null;

    if (!ext || !reg) continue; // Skip if either is missing

    if (field === "nome") {
      // Fuzzy name match - check if first/last name matches
      const extParts = ext.split(/\s+/);
      const regParts = reg.split(/\s+/);
      const firstMatch = extParts[0] === regParts[0];
      const lastMatch = extParts[extParts.length - 1] === regParts[regParts.length - 1];
      if (firstMatch && lastMatch) {
        matches.push(field);
      } else {
        divergences.push({ field, extracted: extracted[field], registered: registered[field] });
      }
    } else {
      if (ext === reg) {
        matches.push(field);
      } else {
        divergences.push({ field, extracted: extracted[field], registered: registered[field] });
      }
    }
  }

  return { matches, divergences };
}

function isExpired(dateStr: string): boolean {
  try {
    const parts = dateStr.split(/[\/.-]/);
    if (parts.length !== 3) return false;
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    const date = new Date(year, month, day);
    return date < new Date();
  } catch {
    return false;
  }
}
