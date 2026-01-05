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

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin de teste configurado",
        credentials: {
          email: adminEmail,
          password: adminPassword
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
