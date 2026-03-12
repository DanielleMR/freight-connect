import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user with getUser (correct Supabase JS v2 method)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = user.id;
    const userEmail = user.email;
    const { password } = await req.json();

    if (!password) {
      return new Response(
        JSON.stringify({ error: "Senha obrigatória para confirmar exclusão" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify password by attempting sign-in
    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "Email do usuário não encontrado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: userEmail,
      password,
    });

    if (signInError) {
      return new Response(
        JSON.stringify({ error: "Senha incorreta" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Delete storage files
    const buckets = ["documentos", "chat-anexos"];
    for (const bucket of buckets) {
      try {
        const { data: files } = await supabase.storage.from(bucket).list(userId);
        if (files && files.length > 0) {
          const paths = files.map((f) => `${userId}/${f.name}`);
          await supabase.storage.from(bucket).remove(paths);
        }
      } catch (storageErr) {
        // Log but continue - data anonymization is more important
        console.error(`Storage cleanup error for ${bucket}:`, (storageErr as Error).message);
      }
    }

    // 2. Run database anonymization via security definer function
    const { error: deleteError } = await supabase.rpc("delete_user_data", {
      p_user_id: userId,
    });

    if (deleteError) {
      console.error("Error deleting user data:", deleteError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao excluir dados. Tente novamente." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3. Delete auth user (via admin API)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error("Error deleting auth user:", authDeleteError.message);
      // Data was already anonymized, log the auth deletion failure
    }

    return new Response(
      JSON.stringify({ success: true, message: "Conta excluída com sucesso" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete account error:", errMsg);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar exclusão" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
