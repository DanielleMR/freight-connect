import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailRequest {
  type:
    | "documento_aprovado"
    | "documento_rejeitado"
    | "divergencia_detectada"
    | "frete_aceito"
    | "pagamento_confirmado"
    | "disputa_aberta"
    | "suspensao_aplicada";
  userId: string;
  recipientEmail: string;
  recipientName?: string;
  details?: Record<string, string>;
}

const EMAIL_TEMPLATES: Record<string, { subject: string; body: (name: string, details: Record<string, string>) => string }> = {
  documento_aprovado: {
    subject: "✅ Documento aprovado – FreteBoi",
    body: (name, d) => `
      <p>Olá, <strong>${name}</strong>!</p>
      <p>Seu documento <strong>${d.tipo || "enviado"}</strong> foi <span style="color:#16a34a;font-weight:bold">aprovado</span> pela nossa equipe.</p>
      <p>Você já pode aceitar contratos na plataforma.</p>
    `,
  },
  documento_rejeitado: {
    subject: "❌ Documento reprovado – FreteBoi",
    body: (name, d) => `
      <p>Olá, <strong>${name}</strong>!</p>
      <p>Seu documento <strong>${d.tipo || ""}</strong> foi <span style="color:#dc2626;font-weight:bold">reprovado</span>.</p>
      <p><strong>Motivo:</strong> ${d.motivo || "Não especificado"}</p>
      <p>Por favor, envie novamente um documento válido.</p>
    `,
  },
  divergencia_detectada: {
    subject: "⚠️ Divergência detectada no documento – FreteBoi",
    body: (name, d) => `
      <p>Olá, <strong>${name}</strong>!</p>
      <p>A verificação automatizada do seu documento <strong>${d.tipo || ""}</strong> detectou divergências com os dados cadastrados.</p>
      <p>Um administrador irá analisar manualmente. Se necessário, você será notificado para reenvio.</p>
    `,
  },
  frete_aceito: {
    subject: "🚛 Frete aceito – FreteBoi",
    body: (name, d) => `
      <p>Olá, <strong>${name}</strong>!</p>
      <p>O frete <strong>${d.publicId || ""}</strong> de ${d.origem || "?"} para ${d.destino || "?"} foi <strong>aceito</strong>.</p>
    `,
  },
  pagamento_confirmado: {
    subject: "💰 Pagamento confirmado – FreteBoi",
    body: (name, d) => `
      <p>Olá, <strong>${name}</strong>!</p>
      <p>O pagamento do frete <strong>${d.publicId || ""}</strong> no valor de <strong>${d.valor || ""}</strong> foi confirmado.</p>
    `,
  },
  disputa_aberta: {
    subject: "⚠️ Disputa aberta – FreteBoi",
    body: (name, d) => `
      <p>Olá, <strong>${name}</strong>!</p>
      <p>Uma disputa foi aberta para o frete <strong>${d.publicId || ""}</strong>.</p>
      <p><strong>Motivo:</strong> ${d.motivo || "Não informado"}</p>
      <p>Um administrador irá analisar o caso.</p>
    `,
  },
  suspensao_aplicada: {
    subject: "🚫 Conta suspensa – FreteBoi",
    body: (name, d) => `
      <p>Olá, <strong>${name}</strong>!</p>
      <p>Sua conta foi <strong>suspensa</strong>.</p>
      <p><strong>Motivo:</strong> ${d.motivo || "Não informado"}</p>
      <p>Entre em contato com o suporte para mais informações.</p>
    `,
  },
};

function wrapInTemplate(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr><td style="background:#1a7a3a;padding:24px;text-align:center">
          <h1 style="color:#ffffff;margin:0;font-size:24px">🐂 FreteBoi</h1>
          <p style="color:#d4edda;margin:4px 0 0;font-size:12px">Plataforma de Intermediação de Frete Boiadeiro</p>
        </td></tr>
        <tr><td style="padding:32px 24px;font-size:14px;line-height:1.6;color:#333">
          ${bodyHtml}
        </td></tr>
        <tr><td style="background:#f8f9fa;padding:16px 24px;text-align:center;font-size:11px;color:#888">
          <p style="margin:0">Este é um email automático. Não responda diretamente.</p>
          <p style="margin:4px 0 0">A verificação documental possui caráter informativo e não constitui certificação integral da idoneidade do transportador.</p>
          <p style="margin:4px 0 0">© FreteBoi – Intermediação Digital</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { type, userId, recipientEmail, recipientName, details }: EmailRequest = await req.json();

    const template = EMAIL_TEMPLATES[type];
    if (!template) {
      return new Response(
        JSON.stringify({ error: `Unknown email type: ${type}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const name = recipientName || "Usuário";
    const htmlBody = wrapInTemplate(template.body(name, details || {}));

    // Send via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FreteBoi <noreply@freteboi.com.br>",
        to: [recipientEmail],
        subject: template.subject,
        html: htmlBody,
      }),
    });

    const resendResult = await resendResponse.json();
    const emailStatus = resendResponse.ok ? "sent" : "failed";

    // Log email
    await supabase.from("email_logs").insert({
      user_id: userId,
      email_type: type,
      subject: template.subject,
      recipient: recipientEmail,
      status: emailStatus,
      resend_id: resendResult.id || null,
      error_message: resendResponse.ok ? null : JSON.stringify(resendResult),
      metadata: { details, resendStatus: resendResponse.status },
    });

    // Also create in-app notification
    if (userId) {
      await supabase.rpc("criar_notificacao", {
        p_user_id: userId,
        p_tipo: type,
        p_titulo: template.subject.replace(/[✅❌⚠️🚛💰🚫]/g, "").trim(),
        p_mensagem: `Email enviado para ${recipientEmail}`,
      });
    }

    return new Response(
      JSON.stringify({ success: true, emailStatus, resendId: resendResult.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Send email error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
