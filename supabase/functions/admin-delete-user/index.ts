import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'master' && profile?.role !== 'project_manager') {
      return new Response(JSON.stringify({ error: 'Unauthorized: somente gestores podem excluir usuários' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }


    const body = await req.json().catch(() => ({}))
    let { user_id, email } = body as { user_id?: string; email?: string }

    if (!user_id && email) {
      // Find user by email
      const { data: list, error: listErr } = await supabaseClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (listErr) {
        return new Response(JSON.stringify({ error: listErr.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const found = list?.users?.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase())
      user_id = found?.id
      if (!user_id) {
        // No auth user — clean up profile by email if any
        await supabaseClient.from('profiles').delete().eq('email', email)
        return new Response(JSON.stringify({ success: true, note: 'no_auth_user' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id or email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (user_id === user.id) {
      return new Response(JSON.stringify({ error: 'Você não pode excluir o próprio usuário' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Remove profile first (in case FK cascade is missing)
    await supabaseClient.from('profiles').delete().eq('id', user_id)

    const { error } = await supabaseClient.auth.admin.deleteUser(user_id)
    if (error && !/not.?found/i.test(error.message)) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }


    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
