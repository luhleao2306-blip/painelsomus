import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function friendlyAuthMessage(message: string) {
  if (/password|pwned|leaked|compromised|hibp|breached|weak|easy to guess/i.test(message)) {
    return 'Essa senha foi recusada pela proteção de segurança. Gere uma senha mais forte e única.'
  }
  if (/not found|unable to validate|invalid/i.test(message)) {
    return 'Usuário de login não encontrado para este colaborador.'
  }
  return message
}

function isExpectedPasswordValidation(message: string, status?: number) {
  return status === 400 && /password|pwned|leaked|compromised|hibp|breached|weak|easy to guess/i.test(message)
}

async function findUserIdByEmail(supabaseClient: ReturnType<typeof createClient>, email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  let page = 1
  const perPage = 200

  while (page <= 10) {
    const { data, error } = await supabaseClient.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const match = data?.users?.find((user) => user.email?.toLowerCase() === normalizedEmail)
    if (match?.id) return match.id
    if (!data?.users || data.users.length < perPage) break
    page += 1
  }

  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido' }, 405)
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Sessão expirada. Faça login novamente e tente alterar a senha.' }, 401)
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) {
      return jsonResponse({ error: 'Sessão inválida. Faça login novamente e tente alterar a senha.' }, 401)
    }

    const { data: profile } = await supabaseClient
      .from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role !== 'master') {
      return jsonResponse({ error: 'Apenas o Administrador master pode alterar senhas.' }, 403)
    }

    const { user_id, email, password } = await req.json()
    const cleanPassword = typeof password === 'string' ? password.trim() : ''
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if ((!user_id && !cleanEmail) || !cleanPassword || cleanPassword.length < 6) {
      return jsonResponse({ error: 'Informe o colaborador e uma senha com no mínimo 6 caracteres.' }, 400)
    }

    let targetUserId = typeof user_id === 'string' && user_id.trim() ? user_id.trim() : null
    if (!targetUserId && cleanEmail) {
      targetUserId = await findUserIdByEmail(supabaseClient, cleanEmail)
    }

    if (!targetUserId) {
      return jsonResponse({ error: 'Usuário de login não encontrado para este e-mail.' }, 404)
    }

    const { error } = await supabaseClient.auth.admin.updateUserById(targetUserId, { password: cleanPassword })
    if (error) {
      console.error('admin-update-password failed', { status: error.status, name: error.name, message: error.message })
      const body = { success: false, error: friendlyAuthMessage(error.message), raw_error: error.message }
      if (isExpectedPasswordValidation(error.message, error.status)) {
        return jsonResponse(body, 200)
      }
      return jsonResponse(body, error.status || 400)
    }

    return jsonResponse({ success: true })
  } catch (error: any) {
    console.error('admin-update-password unexpected error', { message: error?.message })
    return jsonResponse({ error: error?.message || 'Erro inesperado ao alterar senha' }, 500)
  }
})
