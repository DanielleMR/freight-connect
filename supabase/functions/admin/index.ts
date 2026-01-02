import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanitized logging helper - never logs PII or sensitive details
function logSafely(level: 'info' | 'warn' | 'error', context: string, metadata?: Record<string, string | number | boolean>) {
  const sanitized = {
    timestamp: new Date().toISOString(),
    context,
    ...metadata
  };
  console[level](JSON.stringify(sanitized));
}

// Validation schemas
const TransportadorCreateSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(200, "Nome deve ter no máximo 200 caracteres"),
  telefone: z.string().min(10, "Telefone inválido").max(20, "Telefone inválido"),
  placa_veiculo: z.string().max(10, "Placa inválida").optional().nullable(),
  capacidade_animais: z.number().int().positive().max(1000, "Capacidade máxima de 1000").optional().nullable(),
  regiao_atendimento: z.string().max(500, "Região muito longa").optional().nullable(),
  tipo_caminhao: z.string().max(50).optional().nullable(),
  tipo_animal: z.string().max(100).optional().nullable(),
  whatsapp: z.string().max(20).optional().nullable(),
  cpf_cnpj: z.string().max(20).optional().nullable(),
});

const TransportadorUpdateSchema = z.object({
  telefone: z.string().min(10).max(20).optional(),
  placa_veiculo: z.string().max(10).optional().nullable(),
  capacidade_animais: z.number().int().positive().max(1000).optional().nullable(),
  regiao_atendimento: z.string().max(500).optional().nullable(),
  tipo_caminhao: z.string().max(50).optional().nullable(),
  tipo_animal: z.string().max(100).optional().nullable(),
});

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
      logSafely('warn', 'AUTH_MISSING_HEADER');
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      logSafely('warn', 'AUTH_INVALID_TOKEN');
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
      logSafely('warn', 'AUTH_ACCESS_DENIED', { reason: 'not_admin' });
      return new Response(JSON.stringify({ error: 'Acesso negado. Apenas administradores.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const method = req.method;

    logSafely('info', 'ADMIN_REQUEST', { path: path || 'unknown', method });

    // GET /admin/transportadores - List all transportadores
    if (path === 'transportadores' && method === 'GET') {
      const { data, error } = await supabaseClient
        .from('transportadores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logSafely('error', 'DB_ERROR', { operation: 'SELECT', table: 'transportadores' });
        throw error;
      }
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /admin/transportadores - Create transportador
    if (path === 'transportadores' && method === 'POST') {
      const body = await req.json();
      
      // Validate input
      const validation = TransportadorCreateSchema.safeParse(body);
      if (!validation.success) {
        return new Response(JSON.stringify({ 
          error: 'Dados inválidos', 
          details: validation.error.errors 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const validatedData = validation.data;

      const { data, error } = await supabaseClient
        .from('transportadores')
        .insert({ ...validatedData, ativo: true })
        .select()
        .single();

      if (error) {
        logSafely('error', 'DB_ERROR', { operation: 'INSERT', table: 'transportadores' });
        throw error;
      }
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
        
        // Validate input
        const validation = TransportadorUpdateSchema.safeParse(body);
        if (!validation.success) {
          return new Response(JSON.stringify({ 
            error: 'Dados inválidos', 
            details: validation.error.errors 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const validatedData = validation.data;

        const { data, error } = await supabaseClient
          .from('transportadores')
          .update(validatedData)
          .eq('id', transportadorId)
          .select()
          .single();

        if (error) {
          logSafely('error', 'DB_ERROR', { operation: 'UPDATE', table: 'transportadores' });
          throw error;
        }
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

      if (fetchError) {
        logSafely('error', 'DB_ERROR', { operation: 'SELECT', table: 'transportadores' });
        throw fetchError;
      }

      // Toggle status
      const { data, error } = await supabaseClient
        .from('transportadores')
        .update({ ativo: !current.ativo })
        .eq('id', transportadorId)
        .select()
        .single();

      if (error) {
        logSafely('error', 'DB_ERROR', { operation: 'UPDATE', table: 'transportadores' });
        throw error;
      }
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

      if (error) {
        logSafely('error', 'DB_ERROR', { operation: 'SELECT', table: 'user_roles' });
        throw error;
      }
      
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

      if (error) {
        logSafely('error', 'DB_ERROR', { operation: 'SELECT', table: 'fretes' });
        throw error;
      }
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Endpoint não encontrado' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    logSafely('error', 'ADMIN_FUNCTION_ERROR', { type: 'internal' });
    const message = error instanceof Error ? error.message : 'Erro interno';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
