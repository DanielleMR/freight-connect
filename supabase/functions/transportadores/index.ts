import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // GET - List or get single transportador
    if (req.method === 'GET') {
      logSafely('info', 'TRANSPORTADORES_GET', { hasId: !!id })
      if (id) {
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
      
      const { data, error } = await supabase
        .from('transportadores')
        .insert({
          nome: body.nome,
          telefone: body.telefone,
          placa_veiculo: body.placa_veiculo,
          capacidade_animais: body.capacidade_animais,
          user_id: body.user_id,
        })
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

      const body = await req.json()
      
      const { data, error } = await supabase
        .from('transportadores')
        .update({
          nome: body.nome,
          telefone: body.telefone,
          placa_veiculo: body.placa_veiculo,
          capacidade_animais: body.capacidade_animais,
        })
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
