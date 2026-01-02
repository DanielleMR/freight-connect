import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  user_id: z.string().uuid().optional().nullable(),
});

const TransportadorUpdateSchema = z.object({
  nome: z.string().min(3).max(200).optional(),
  telefone: z.string().min(10).max(20).optional(),
  placa_veiculo: z.string().max(10).optional().nullable(),
  capacidade_animais: z.number().int().positive().max(1000).optional().nullable(),
  regiao_atendimento: z.string().max(500).optional().nullable(),
  tipo_caminhao: z.string().max(50).optional().nullable(),
  tipo_animal: z.string().max(100).optional().nullable(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logSafely('warn', 'AUTH_FAILED', { reason: 'invalid_or_missing_token' })
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const id = url.searchParams.get('id')

    // GET - List or get single transportador (uses RLS)
    if (req.method === 'GET') {
      logSafely('info', 'TRANSPORTADORES_GET', { hasId: !!id })
      
      if (id) {
        // Validate UUID format
        const uuidValidation = z.string().uuid().safeParse(id);
        if (!uuidValidation.success) {
          return new Response(JSON.stringify({ error: 'ID inválido' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const { data, error } = await supabase
          .from('transportadores')
          .select('*')
          .eq('id', id)
          .single()

        if (error) {
          logSafely('error', 'DB_ERROR', { operation: 'SELECT', table: 'transportadores' })
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data, error } = await supabase
        .from('transportadores')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        logSafely('error', 'DB_ERROR', { operation: 'SELECT_LIST', table: 'transportadores' })
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // POST - Create transportador (admin only via RLS)
    if (req.method === 'POST') {
      logSafely('info', 'TRANSPORTADORES_POST')
      const body = await req.json()
      
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
      
      const { data, error } = await supabase
        .from('transportadores')
        .insert(validatedData)
        .select()
        .single()

      if (error) {
        logSafely('error', 'DB_ERROR', { operation: 'INSERT', table: 'transportadores' })
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // PUT - Update transportador (admin only via RLS)
    if (req.method === 'PUT') {
      logSafely('info', 'TRANSPORTADORES_PUT', { hasId: !!id })
      if (!id) {
        return new Response(JSON.stringify({ error: 'ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Validate UUID format
      const uuidValidation = z.string().uuid().safeParse(id);
      if (!uuidValidation.success) {
        return new Response(JSON.stringify({ error: 'ID inválido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const body = await req.json()
      
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
      
      const { data, error } = await supabase
        .from('transportadores')
        .update(validatedData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        logSafely('error', 'DB_ERROR', { operation: 'UPDATE', table: 'transportadores' })
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // DELETE - Delete transportador (admin only via RLS)
    if (req.method === 'DELETE') {
      logSafely('info', 'TRANSPORTADORES_DELETE', { hasId: !!id })
      if (!id) {
        return new Response(JSON.stringify({ error: 'ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Validate UUID format
      const uuidValidation = z.string().uuid().safeParse(id);
      if (!uuidValidation.success) {
        return new Response(JSON.stringify({ error: 'ID inválido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error } = await supabase
        .from('transportadores')
        .delete()
        .eq('id', id)

      if (error) {
        logSafely('error', 'DB_ERROR', { operation: 'DELETE', table: 'transportadores' })
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logSafely('error', 'UNEXPECTED_ERROR', { type: 'internal' })
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
