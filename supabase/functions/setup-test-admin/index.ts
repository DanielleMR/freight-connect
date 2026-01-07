import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Admin de teste padrão
    const adminEmail = "admin@teste.com";
    const adminPassword = "admin123456";

    // Verificar se já existe
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingAdmin = existingUsers?.users?.find(u => u.email === adminEmail);

    let userId: string;

    if (existingAdmin) {
      userId = existingAdmin.id;
      console.log("Admin já existe:", userId);
    } else {
      // Criar usuário admin
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });

      if (createError) {
        throw new Error(`Erro ao criar admin: ${createError.message}`);
      }

      userId = newUser.user!.id;
      console.log("Admin criado:", userId);
    }

    // Verificar/criar role admin
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!existingRole) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });

      if (roleError) {
        console.error("Erro ao criar role:", roleError);
      }
    }

    // Criar produtor de teste (usando o mesmo user_id do admin para simplificar)
    const produtorEmail = "produtor@teste.com";
    const produtorPassword = "produtor123456";
    
    let produtorUserId: string;
    let produtorId: string;
    
    const existingProdutor = existingUsers?.users?.find(u => u.email === produtorEmail);
    
    if (existingProdutor) {
      produtorUserId = existingProdutor.id;
    } else {
      const { data: newProdutor, error: createProdutorError } = await supabase.auth.admin.createUser({
        email: produtorEmail,
        password: produtorPassword,
        email_confirm: true,
      });

      if (createProdutorError) {
        console.error("Erro ao criar produtor user:", createProdutorError);
      } else {
        produtorUserId = newProdutor.user!.id;
        
        // Adicionar role de produtor
        await supabase.from("user_roles").insert({ user_id: produtorUserId, role: "produtor" });
      }
    }

    // Verificar/criar perfil de produtor
    const { data: existingProdutorProfile } = await supabase
      .from("produtores")
      .select("id")
      .eq("user_id", produtorUserId!)
      .maybeSingle();

    if (existingProdutorProfile) {
      produtorId = existingProdutorProfile.id;
    } else if (produtorUserId!) {
      const { data: newProdutorProfile, error: produtorProfileError } = await supabase
        .from("produtores")
        .insert({
          user_id: produtorUserId!,
          nome: "Fazenda São João (Teste)",
          telefone: "(11) 99999-0001",
          cidade: "Ribeirão Preto",
          estado: "SP",
          cpf_cnpj: "12.345.678/0001-90"
        })
        .select("id")
        .single();

      if (produtorProfileError) {
        console.error("Erro ao criar produtor profile:", produtorProfileError);
      } else {
        produtorId = newProdutorProfile.id;
      }
    }

    // Buscar transportador ativo para os fretes de teste
    const { data: transportadores } = await supabase
      .from("transportadores")
      .select("id")
      .eq("ativo", true)
      .limit(1);

    // Criar fretes de teste se houver produtor e transportador
    if (produtorId! && transportadores && transportadores.length > 0) {
      const transportadorId = transportadores[0].id;

      // Verificar se já existem fretes de teste
      const { data: existingFretes } = await supabase
        .from("fretes")
        .select("id")
        .eq("produtor_id", produtorId!)
        .limit(1);

      if (!existingFretes || existingFretes.length === 0) {
        // Criar 2 fretes de teste com valores diferentes
        const fretesData = [
          {
            produtor_id: produtorId!,
            transportador_id: transportadorId,
            status: "aceito",
            origem: "Ribeirão Preto, SP",
            destino: "Campinas, SP",
            tipo_animal: "bovinos",
            quantidade_animais: 25,
            valor_frete: 2500.00,
            tipo_cobranca: "valor_fechado",
            distancia_estimada: 220,
            data_prevista: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            descricao: "Frete de teste - bovinos para abate",
            observacoes_valor: "Valor negociado diretamente"
          },
          {
            produtor_id: produtorId!,
            transportador_id: transportadorId,
            status: "solicitado",
            origem: "Piracicaba, SP",
            destino: "São Paulo, SP",
            tipo_animal: "suínos",
            quantidade_animais: 40,
            valor_frete: 3200.00,
            tipo_cobranca: "valor_por_km",
            distancia_estimada: 165,
            data_prevista: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            descricao: "Frete de teste - suínos para frigorífico",
            observacoes_valor: "Valor calculado por km"
          }
        ];

        const { error: fretesError } = await supabase.from("fretes").insert(fretesData);
        if (fretesError) {
          console.error("Erro ao criar fretes de teste:", fretesError);
        } else {
          console.log("Fretes de teste criados com sucesso");
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin e dados de teste configurados",
        credentials: {
          admin: { email: adminEmail, password: adminPassword },
          produtor: { email: produtorEmail, password: produtorPassword }
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
