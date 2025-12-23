import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Acesso negado. Apenas administradores.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const method = req.method;

    // GET /admin/transportadores - List all transportadores
    if (path === 'transportadores' && method === 'GET') {
      const { data, error } = await supabaseClient
        .from('transportadores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /admin/transportadores - Create transportador
    if (path === 'transportadores' && method === 'POST') {
      const body = await req.json();
      const { nome, telefone, placa_veiculo, capacidade_animais } = body;

      if (!nome || !telefone) {
        return new Response(JSON.stringify({ error: 'Nome e telefone são obrigatórios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabaseClient
        .from('transportadores')
        .insert({ nome, telefone, placa_veiculo, capacidade_animais, ativo: true })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT /admin/transportadores/:id - Update transportador
    if (method === 'PUT') {
      const pathParts = url.pathname.split('/');
      const transportadorId = pathParts[pathParts.length - 1];
      
      if (transportadorId && transportadorId !== 'transportadores') {
        const body = await req.json();
        const { telefone, placa_veiculo, capacidade_animais, regiao_atendimento } = body;

        const { data, error } = await supabaseClient
          .from('transportadores')
          .update({ 
            telefone, 
            placa_veiculo, 
            capacidade_animais, 
            regiao_atendimento 
          })
          .eq('id', transportadorId)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // PATCH /admin/transportadores/:id/toggle - Activate/Deactivate transportador
    if (path === 'toggle' && method === 'PATCH') {
      const transportadorId = url.pathname.split('/').slice(-2, -1)[0];
      
      // Get current status
      const { data: current, error: fetchError } = await supabaseClient
        .from('transportadores')
        .select('ativo')
        .eq('id', transportadorId)
        .single();

      if (fetchError) throw fetchError;

      // Toggle status
      const { data, error } = await supabaseClient
        .from('transportadores')
        .update({ ativo: !current.ativo })
        .eq('id', transportadorId)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /admin/produtores - List all produtores
    if (path === 'produtores' && method === 'GET') {
      const { data, error } = await supabaseClient
        .from('user_roles')
        .select(`
          user_id,
          role,
          profiles:user_id (
            id,
            email,
            created_at
          )
        `)
        .eq('role', 'produtor');

      if (error) throw error;
      
      const produtores = data?.map(item => ({
        id: item.user_id,
        email: (item.profiles as any)?.email || 'N/A',
        created_at: (item.profiles as any)?.created_at,
        role: item.role
      })) || [];

      return new Response(JSON.stringify(produtores), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /admin/fretes - List all fretes (read-only)
    if (path === 'fretes' && method === 'GET') {
      const { data, error } = await supabaseClient
        .from('fretes')
        .select(`
          *,
          transportador:transportador_id (
            id,
            nome,
            telefone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Endpoint não encontrado' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Admin function error:', error);
    const message = error instanceof Error ? error.message : 'Erro interno';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
