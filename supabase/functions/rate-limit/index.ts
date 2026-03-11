import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limit configurations
const RATE_LIMITS: Record<string, { maxRequests: number; windowSeconds: number }> = {
  login: { maxRequests: 5, windowSeconds: 60 },
  signup: { maxRequests: 3, windowSeconds: 60 },
  document_upload: { maxRequests: 10, windowSeconds: 3600 },
  report: { maxRequests: 5, windowSeconds: 300 },
  password_reset: { maxRequests: 3, windowSeconds: 300 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, identifier } = await req.json();

    if (!action || !identifier) {
      return new Response(
        JSON.stringify({ error: "action and identifier required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const config = RATE_LIMITS[action];
    if (!config) {
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const key = `${action}:${identifier}`;

    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max_requests: config.maxRequests,
      p_window_seconds: config.windowSeconds,
    });

    if (error) {
      console.error("Rate limit check error:", error.message);
      // Fail open - allow request if rate limit check fails
      return new Response(
        JSON.stringify({ allowed: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({
          allowed: false,
          error: "Muitas tentativas. Tente novamente em alguns minutos.",
          retryAfter: config.windowSeconds,
        }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ allowed: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Rate limit error:", error.message);
    return new Response(
      JSON.stringify({ allowed: true }), // fail open
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
