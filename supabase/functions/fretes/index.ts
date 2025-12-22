import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      console.log('Auth error:', authError)
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
      console.log('GET fretes request for user:', user.id)
      
      if (id) {
        const { data, error } = await supabase
          .from('fretes')
          .select('*, transportadores(*)')
          .eq('id', id)
          .single()

        if (error) {
          console.log('Error fetching frete:', error)
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
        console.log('Error listing fretes:', error)
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
      console.log('POST frete request')
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
        console.log('Error creating frete:', error)
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
      console.log('PUT frete request, action:', action)
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
        console.log('Error updating frete:', error)
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
    console.log('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
