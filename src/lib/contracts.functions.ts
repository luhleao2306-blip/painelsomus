import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

function genToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function maskCPF(v?: string) {
  const d = (v || '').replace(/\D/g, '');
  if (d.length !== 11) return v || '';
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}
function maskCNPJ(v?: string) {
  const d = (v || '').replace(/\D/g, '');
  if (d.length !== 14) return v || '';
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}
function maskCEP(v?: string) {
  const d = (v || '').replace(/\D/g, '');
  if (d.length !== 8) return v || '';
  return `${d.slice(0,5)}-${d.slice(5)}`;
}

async function pushHistory(supabase: any, regId: string, userId: string, eventType: string, description: string, metadata: any = null) {
  await supabase.from('registration_history').insert({
    registration_id: regId,
    event_type: eventType,
    description,
    metadata,
    actor_id: userId,
  });
}

// ---------- Build snapshot from registration ----------
function buildContractorSnapshot(r: any) {
  return {
    legal_name: r.legal_name,
    trade_name: r.trade_name,
    cnpj: maskCNPJ(r.cnpj),
    address: r.address || '',
    address_number: r.address_number || '',
    neighborhood: r.neighborhood || '',
    city: r.city || '',
    state: r.state || '',
    zip_code: maskCEP(r.zip_code) || '',
    contact_name: r.contact_name,
    contact_cpf: maskCPF(r.contact_cpf),
    phone: r.phone || '',
    email: r.email,
    financial_responsible: r.financial_responsible || r.contact_name,
  };
}

const DEFAULT_COMMERCIAL = {
  service_name: '',
  monthly_value: '',
  start_date: '',
  due_day: '',
  payment_method: '',
  term_days: '',
  notes: '',
};

// ---------- Prepare (or fetch existing) contract for a registration ----------
export const prepareContract = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { registration_id: string }) => z.object({ registration_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verifica permissão (master ou project_manager)
    const { data: caller } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (caller?.role !== 'master' && caller?.role !== 'project_manager') {
      throw new Error('Sem permissão.');
    }

    // Já existe contrato em aberto para este cadastro?
    const { data: existing } = await supabase
      .from('contracts')
      .select('*')
      .eq('registration_id', data.registration_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && existing.signature_status !== 'signed') {
      return existing;
    }

    const { data: reg, error: regErr } = await supabase
      .from('client_registrations')
      .select('*')
      .eq('id', data.registration_id)
      .maybeSingle();
    if (regErr || !reg) throw new Error('Cadastro não encontrado');

    const snapshot = buildContractorSnapshot(reg);
    const { data: created, error } = await supabase
      .from('contracts')
      .insert({
        registration_id: data.registration_id,
        name: `Contrato — ${reg.trade_name}`,
        signature_status: 'draft',
        commercial_data: DEFAULT_COMMERCIAL,
        contractor_snapshot: snapshot,
        version: 1,
        visible_to_client: true,
      })
      .select('*')
      .single();
    if (error || !created) throw new Error(error?.message || 'Falha ao criar contrato');

    await supabase
      .from('client_registrations')
      .update({ status: 'aguardando_contrato' })
      .eq('id', data.registration_id);

    await pushHistory(supabase, data.registration_id, userId, 'contrato_preparado',
      'Minuta de contrato preparada', { contract_id: created.id });

    return created;
  });

// ---------- Update commercial data ----------
const commercialSchema = z.object({
  service_name: z.string().max(200).optional().or(z.literal('')),
  monthly_value: z.string().max(30).optional().or(z.literal('')),
  start_date: z.string().max(20).optional().or(z.literal('')),
  due_day: z.string().max(5).optional().or(z.literal('')),
  payment_method: z.string().max(120).optional().or(z.literal('')),
  term_days: z.string().max(10).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export const updateContractCommercial = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; commercial: any }) => z.object({
    id: z.string().uuid(),
    commercial: commercialSchema,
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from('contracts')
      .update({ commercial_data: data.commercial, updated_at: new Date().toISOString() })
      .eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Send contract for signature ----------
export const sendContractForSignature = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const token = genToken();
    const { data: updated, error } = await supabase
      .from('contracts')
      .update({
        signature_token: token,
        signature_status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', data.id)
      .select('id, registration_id')
      .single();
    if (error || !updated) throw new Error(error?.message || 'Falha ao gerar link');

    if (updated.registration_id) {
      await supabase
        .from('client_registrations')
        .update({ status: 'aguardando_assinatura' })
        .eq('id', updated.registration_id);
      await pushHistory(supabase, updated.registration_id, userId, 'contrato_enviado',
        'Contrato enviado para assinatura do cliente', { contract_id: updated.id });
    }

    return { ok: true, token };
  });

// ---------- Public: fetch contract by token ----------
export const getContractByToken = createServerFn({ method: 'POST' })
  .inputValidator((d: { token: string }) => z.object({ token: z.string().min(10).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: rows, error } = await supabaseAdmin.rpc('get_contract_by_token', { _token: data.token });
    if (error) return { valid: false as const };
    const r = Array.isArray(rows) ? rows[0] : rows;
    if (!r) return { valid: false as const };
    if (r.signature_status !== 'sent') return { valid: false as const, reason: r.signature_status };
    return {
      valid: true as const,
      contract: {
        id: r.id as string,
        commercial_data: r.commercial_data,
        contractor_snapshot: r.contractor_snapshot,
        sent_at: r.sent_at as string,
        version: r.version as number,
      },
    };
  });

// ---------- Public: sign contract ----------
export const signContract = createServerFn({ method: 'POST' })
  .inputValidator((d: { token: string; name: string; cpf: string; html: string }) =>
    z.object({
      token: z.string().min(10).max(200),
      name: z.string().trim().min(3).max(200),
      cpf: z.string().min(11).max(20),
      html: z.string().max(200000),
    }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { getRequestIP } = await import('@tanstack/react-start/server');
    const ip = (() => { try { return getRequestIP({ xForwardedFor: true }) || ''; } catch { return ''; } })();
    const cpfDigits = data.cpf.replace(/\D/g, '');

    const { data: contractId, error } = await supabaseAdmin.rpc('sign_contract', {
      _token: data.token,
      _name: data.name,
      _cpf: cpfDigits,
      _ip: ip,
      _html: data.html,
    });
    if (error) {
      const msg = error.message || '';
      if (msg.includes('invalid_cpf')) throw new Error('CPF inválido');
      if (msg.includes('invalid_name')) throw new Error('Nome inválido');
      if (msg.includes('invalid_token')) throw new Error('Link inválido');
      if (msg.includes('token_signed')) throw new Error('Este contrato já foi assinado');
      if (msg.includes('token_')) throw new Error('Link não está mais disponível');
      throw new Error(msg || 'Não foi possível assinar o contrato');
    }
    return { ok: true as const, id: contractId as unknown as string };
  });

// ---------- Internal: release access (after signed) ----------
export const releaseAccess = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { registration_id: string }) => z.object({ registration_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: caller } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (caller?.role !== 'master' && caller?.role !== 'project_manager') {
      throw new Error('Sem permissão.');
    }

    const { data: reg, error: regErr } = await supabase
      .from('client_registrations').select('*').eq('id', data.registration_id).maybeSingle();
    if (regErr || !reg) throw new Error('Cadastro não encontrado');

    // Precisa ter contrato assinado
    const { data: contract } = await supabase
      .from('contracts').select('*')
      .eq('registration_id', data.registration_id)
      .eq('signature_status', 'signed')
      .order('signed_at', { ascending: false })
      .limit(1).maybeSingle();
    if (!contract) throw new Error('O contrato precisa estar assinado antes de liberar o acesso.');

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { getRequestHost, getRequestHeader } = await import('@tanstack/react-start/server');
    const host = getRequestHost();
    const proto = getRequestHeader('x-forwarded-proto') || 'https';
    const redirectTo = `${proto}://${host}/reset-password`;

    // Cria cliente
    const { data: client, error: clientErr } = await supabaseAdmin.from('clients').insert({
      name: reg.trade_name,
      industry: reg.segment,
      email: reg.email,
      phone: reg.phone,
      responsible_name: reg.contact_name,
      observations: `CNPJ: ${reg.cnpj}`,
      status: 'Ativo',
    }).select('id').single();
    if (clientErr || !client) throw new Error(clientErr?.message || 'Falha ao criar cliente');

    // Convite por e-mail (ou reutiliza usuário existente)
    let createdUserId: string | null = null;
    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      reg.email,
      {
        redirectTo,
        data: {
          full_name: reg.contact_name,
          role: 'client',
          company_name: reg.trade_name,
          client_id: client.id,
        },
      },
    );
    if (invited?.user) {
      createdUserId = invited.user.id;
    } else {
      const msg = (inviteErr?.message || '').toLowerCase();
      const alreadyExists = msg.includes('already') || msg.includes('registered') || msg.includes('exists');
      if (!alreadyExists) {
        await supabaseAdmin.from('clients').delete().eq('id', client.id);
        throw new Error(inviteErr?.message || 'Falha ao enviar e-mail de convite');
      }
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users?.find((u: any) => (u.email || '').toLowerCase() === reg.email.toLowerCase());
      if (!existing) {
        await supabaseAdmin.from('clients').delete().eq('id', client.id);
        throw new Error('E-mail já cadastrado, não foi possível localizar usuário.');
      }
      createdUserId = existing.id;
      await supabaseAdmin.auth.resetPasswordForEmail(reg.email, { redirectTo });
    }

    await supabaseAdmin.from('profiles').upsert({
      id: createdUserId,
      full_name: reg.contact_name,
      email: reg.email,
      role: 'client',
      status: 'active',
      client_id: client.id,
      phone: reg.phone,
      must_change_password: true,
    }, { onConflict: 'id' });

    // Vincula contrato assinado ao cliente
    await supabaseAdmin.from('contracts')
      .update({ client_id: client.id, status: 'Ativo' })
      .eq('id', contract.id);

    await supabase.from('client_registrations').update({
      status: 'ativo', created_user_id: createdUserId,
    }).eq('id', data.registration_id);

    await pushHistory(supabase, data.registration_id, userId, 'acesso_liberado',
      `Acesso liberado para ${reg.email}`, { user_id: createdUserId, client_id: client.id, contract_id: contract.id });

    return { ok: true, userId: createdUserId, email: reg.email, clientId: client.id };
  });

// ---------- Fetch contract for registration (internal) ----------
export const getContractForRegistration = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { registration_id: string }) => z.object({ registration_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from('contracts')
      .select('*')
      .eq('registration_id', data.registration_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return row;
  });
