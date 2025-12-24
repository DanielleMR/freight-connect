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
    const action = url.searchParams.get('action')

    // GET - List fretes for the user
    if (req.method === 'GET') {
      logSafely('info', 'FRETES_GET', { hasId: !!id })
      
      if (id) {
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
      
      const { data, error } = await supabase
        .from('fretes')
        .insert({
          produtor_id: user.id,
          transportador_id: body.transportador_id,
          descricao: body.descricao,
          quantidade_animais: body.quantidade_animais,
          origem: body.origem,
          destino: body.destino,
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

      let newStatus: string
      if (action === 'aceitar') {
        newStatus = 'aceito'
      } else if (action === 'recusar') {
        newStatus = 'recusado'
      } else {
        return new Response(JSON.stringify({ error: 'Invalid action. Use aceitar or recusar' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

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
