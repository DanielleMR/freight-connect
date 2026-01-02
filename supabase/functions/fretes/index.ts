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
const FreteCreateSchema = z.object({
  transportador_id: z.string().uuid("ID do transportador inválido"),
  descricao: z.string().max(1000, "Descrição muito longa").optional().nullable(),
  quantidade_animais: z.number().int().positive().max(1000, "Quantidade máxima de 1000").optional().nullable(),
  origem: z.string().min(2, "Origem obrigatória").max(500, "Origem muito longa"),
  destino: z.string().min(2, "Destino obrigatório").max(500, "Destino muito longo"),
  tipo_animal: z.string().max(100, "Tipo de animal inválido").optional().nullable(),
  valor_frete: z.number().positive().max(1000000, "Valor máximo excedido").optional().nullable(),
  data_prevista: z.string().optional().nullable(),
});

const FreteActionSchema = z.enum(['aceitar', 'recusar', 'em_andamento', 'concluir']);

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
    const action = url.searchParams.get('action')

    // GET - List fretes for the user
    if (req.method === 'GET') {
      logSafely('info', 'FRETES_GET', { hasId: !!id })
      
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
          .from('fretes')
          .select('*, transportadores(*)')
          .eq('id', id)
          .single()

        if (error) {
          logSafely('error', 'DB_ERROR', { operation: 'SELECT', table: 'fretes' })
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
        .from('fretes')
        .select('*, transportadores(*)')
        .order('created_at', { ascending: false })

      if (error) {
        logSafely('error', 'DB_ERROR', { operation: 'SELECT_LIST', table: 'fretes' })
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // POST - Create frete (produtor only via RLS)
    if (req.method === 'POST') {
      logSafely('info', 'FRETES_POST')
      const body = await req.json()
      
      // Validate input
      const validation = FreteCreateSchema.safeParse(body);
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
        .from('fretes')
        .insert({
          produtor_id: user.id,
          transportador_id: validatedData.transportador_id,
          descricao: validatedData.descricao,
          quantidade_animais: validatedData.quantidade_animais,
          origem: validatedData.origem,
          destino: validatedData.destino,
          tipo_animal: validatedData.tipo_animal,
          valor_frete: validatedData.valor_frete,
          data_prevista: validatedData.data_prevista,
          status: 'solicitado',
        })
        .select('*, transportadores(*)')
        .single()

      if (error) {
        logSafely('error', 'DB_ERROR', { operation: 'INSERT', table: 'fretes' })
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

    // PUT - Update frete status (transportador: accept/reject)
    if (req.method === 'PUT') {
      logSafely('info', 'FRETES_PUT', { hasAction: !!action })
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

      // Validate action
      const actionValidation = FreteActionSchema.safeParse(action);
      if (!actionValidation.success) {
        return new Response(JSON.stringify({ error: 'Ação inválida. Use aceitar, recusar, em_andamento ou concluir' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const statusMap: Record<string, string> = {
        'aceitar': 'aceito',
        'recusar': 'recusado',
        'em_andamento': 'em_andamento',
        'concluir': 'concluido'
      };

      const newStatus = statusMap[actionValidation.data];

      const { data, error } = await supabase
        .from('fretes')
        .update({ status: newStatus })
        .eq('id', id)
        .select('*, transportadores(*)')
        .single()

      if (error) {
        logSafely('error', 'DB_ERROR', { operation: 'UPDATE', table: 'fretes' })
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify(data), {
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
