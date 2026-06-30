import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

// ---------- Public: validate invite ----------
export const getInviteByToken = createServerFn({ method: 'POST' })
  .inputValidator((d: { token: string }) => z.object({ token: z.string().min(10).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: rows, error } = await supabaseAdmin.rpc('get_onboarding_invite', { _token: data.token });
    if (error) return { valid: false as const, reason: 'error' };
    const r = Array.isArray(rows) ? rows[0] : rows;
    if (!r) return { valid: false as const, reason: 'not_found' };
    if (!r.valid) return { valid: false as const, reason: r.reason || 'invalid' };
    return {
      valid: true as const,
      expires_at: r.expires_at as string,
      company_hint: r.company_hint as string | null,
      contact_name: r.contact_name as string | null,
    };
  });

// ---------- Public: submit onboarding ----------
const onboardingSchema = z.object({
  token: z.string().min(10).max(200),
  legal_name: z.string().trim().min(1).max(200),
  trade_name: z.string().trim().min(1).max(200),
  cnpj: z.string().trim().min(14).max(20),
  founded_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  segment: z.string().trim().max(120).optional().or(z.literal('')),
  employees_count: z.string().optional().or(z.literal('')),
  monthly_revenue: z.string().optional().or(z.literal('')),
  website: z.string().trim().max(200).optional().or(z.literal('')),
  instagram: z.string().trim().max(120).optional().or(z.literal('')),
  contact_name: z.string().trim().min(1).max(120),
  contact_role: z.string().trim().max(120).optional().or(z.literal('')),
  contact_cpf: z.string().trim().max(20).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  whatsapp: z.string().trim().max(30).optional().or(z.literal('')),
  email: z.string().trim().email().max(255),
  state: z.string().trim().max(40).optional().or(z.literal('')),
  city: z.string().trim().max(120).optional().or(z.literal('')),
  zip_code: z.string().trim().max(15).optional().or(z.literal('')),
  address: z.string().trim().max(200).optional().or(z.literal('')),
  address_number: z.string().trim().max(20).optional().or(z.literal('')),
  neighborhood: z.string().trim().max(120).optional().or(z.literal('')),
  financial_responsible: z.string().trim().max(120).optional().or(z.literal('')),
});

export const submitOnboarding = createServerFn({ method: 'POST' })
  .inputValidator((d: z.infer<typeof onboardingSchema>) => onboardingSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { token, contact_cpf, zip_code, address, address_number, neighborhood, financial_responsible, ...payload } = data;
    const cleaned: Record<string, unknown> = { ...payload, cnpj: payload.cnpj.replace(/\D/g, '') };
    const { data: regId, error } = await supabaseAdmin.rpc('submit_onboarding', {
      _token: token,
      _payload: cleaned as never,
      _ip: '',
    });
    if (error) {
      const msg = error.message || '';
      if (msg.includes('cnpj_duplicado')) throw new Error('CNPJ já cadastrado.');
      if (msg.includes('token_expired')) throw new Error('Link expirado.');
      if (msg.includes('token_used')) throw new Error('Link já utilizado.');
      if (msg.includes('token_invalidated')) throw new Error('Link invalidado.');
      if (msg.includes('invalid_token')) throw new Error('Link inválido.');
      throw new Error('Não foi possível enviar a ficha. ' + msg);
    }
    // Grava os novos campos diretamente (a RPC ainda não os inclui)
    if (regId) {
      await supabaseAdmin.from('client_registrations').update({
        contact_cpf: contact_cpf?.replace(/\D/g, '') || null,
        zip_code: zip_code?.replace(/\D/g, '') || null,
        address: address || null,
        address_number: address_number || null,
        neighborhood: neighborhood || null,
        financial_responsible: financial_responsible || null,
      }).eq('id', regId as unknown as string);
    }
    return { ok: true as const, id: regId as unknown as string };
  });

// ---------- Internal: invites ----------
function generateToken() {
  // base64url 32 bytes via Web Crypto
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const createInvite = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { contact_name?: string; contact_email?: string; company_hint?: string }) => {
    const clean = {
      contact_name: d.contact_name?.trim() || undefined,
      contact_email: d.contact_email?.trim() || undefined,
      company_hint: d.company_hint?.trim() || undefined,
    };
    return z.object({
      contact_name: z.string().max(120).optional(),
      contact_email: z.string().email().max(255).optional(),
      company_hint: z.string().max(200).optional(),
    }).parse(clean);
  })
  .handler(async ({ data, context }) => {
    const token = generateToken();
    const { data: row, error } = await context.supabase
      .from('onboarding_invites')
      .insert({
        token,
        contact_name: data.contact_name ?? null,
        contact_email: data.contact_email ?? null,
        company_hint: data.company_hint ?? null,
        created_by: context.userId,
      })
      .select('id, token, expires_at')
      .single();
    if (error || !row) throw new Error(error?.message || 'Falha ao criar convite');
    return row;
  });

export const listInvites = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('onboarding_invites')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    const invites = data ?? [];
    const ids = Array.from(new Set(invites.map((i: any) => i.created_by).filter(Boolean))) as string[];
    let profilesMap: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await context.supabase
        .from('profiles').select('id, full_name, email').in('id', ids);
      profilesMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name || p.email || '—']));
    }
    return invites.map((i: any) => ({ ...i, created_by_name: profilesMap[i.created_by] ?? null }));
  });

export const invalidateInvite = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from('onboarding_invites')
      .update({ status: 'invalidated', invalidated_at: new Date().toISOString() })
      .eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Internal: registrations ----------
export const listRegistrations = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('client_registrations')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteRegistration = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from('registration_history').delete().eq('registration_id', data.id);
    const { error } = await context.supabase.from('client_registrations').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getRegistration = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: reg, error } = await context.supabase
      .from('client_registrations').select('*').eq('id', data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!reg) throw new Error('Cadastro não encontrado');
    const { data: history } = await context.supabase
      .from('registration_history').select('*').eq('registration_id', data.id).order('created_at', { ascending: false });
    return { registration: reg, history: history ?? [] };
  });

async function pushHistory(supabase: any, registration_id: string, actor_id: string, event_type: string, description: string, metadata?: any) {
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', actor_id).maybeSingle();
  await supabase.from('registration_history').insert({
    registration_id, actor_id, actor_name: profile?.full_name ?? null,
    event_type, description, metadata: metadata ?? null,
  });
}

export const updateRegistrationStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string; reason: string; notes?: string }) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(['pendente','em_analise','aguardando_correcao','aprovado','reprovado']),
      reason: z.string().trim().min(1).max(500),
      notes: z.string().max(2000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: prev } = await context.supabase
      .from('client_registrations').select('status').eq('id', data.id).single();
    const patch: any = { status: data.status };
    if (data.notes !== undefined) patch.internal_notes = data.notes;
    const { error } = await context.supabase.from('client_registrations').update(patch).eq('id', data.id);
    if (error) throw new Error(error.message);
    await pushHistory(context.supabase, data.id, context.userId, 'status_alterado',
      `Status alterado de ${prev?.status ?? '—'} para ${data.status}`, { reason: data.reason });
    return { ok: true };
  });

export const updateInternalNotes = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; notes: string }) =>
    z.object({ id: z.string().uuid(), notes: z.string().max(4000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from('client_registrations').update({ internal_notes: data.notes }).eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const requestCorrection = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; fields: string[]; note: string }) =>
    z.object({
      id: z.string().uuid(),
      fields: z.array(z.string()).min(1),
      note: z.string().trim().min(1).max(1000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const token = generateToken();
    const expires = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

    const { data: reg } = await context.supabase
      .from('client_registrations').select('email, contact_name, trade_name')
      .eq('id', data.id).single();

    const { data: invite, error: invErr } = await context.supabase
      .from('onboarding_invites').insert({
        token, expires_at: expires,
        contact_email: reg?.email, contact_name: reg?.contact_name, company_hint: reg?.trade_name,
        created_by: context.userId,
      }).select('id, token').single();
    if (invErr || !invite) throw new Error(invErr?.message || 'Falha ao gerar novo link');

    const { error } = await context.supabase.from('client_registrations').update({
      status: 'aguardando_correcao',
      correction_fields: data.fields as never,
      correction_note: data.note,
    }).eq('id', data.id);
    if (error) throw new Error(error.message);

    await pushHistory(context.supabase, data.id, context.userId, 'correcao_solicitada',
      'Correção solicitada', { fields: data.fields, note: data.note, new_token: invite.token });

    return { ok: true, token: invite.token };
  });

export const rejectRegistration = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; reason: string }) =>
    z.object({ id: z.string().uuid(), reason: z.string().trim().min(1).max(1000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('client_registrations').update({
      status: 'reprovado', rejection_reason: data.reason,
    }).eq('id', data.id);
    if (error) throw new Error(error.message);
    await pushHistory(context.supabase, data.id, context.userId, 'reprovado',
      'Cadastro reprovado', { reason: data.reason });
    return { ok: true };
  });

export const approveRegistration = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: caller } = await context.supabase
      .from('profiles').select('role').eq('id', context.userId).single();
    if (caller?.role !== 'master' && caller?.role !== 'project_manager') {
      throw new Error('Sem permissão para aprovar.');
    }

    const { data: reg, error: regErr } = await context.supabase
      .from('client_registrations').select('*').eq('id', data.id).single();
    if (regErr || !reg) throw new Error('Cadastro não encontrado');

    // Aprovação apenas marca a ficha como aprovada. O usuário e o cliente só
    // serão criados depois que o contrato for assinado e a equipe clicar em
    // "Liberar Acesso" (releaseAccess em contracts.functions.ts).
    await context.supabase.from('client_registrations').update({
      status: 'aprovado',
    }).eq('id', data.id);

    await pushHistory(context.supabase, data.id, context.userId, 'aprovado',
      'Ficha cadastral aprovada — pronta para preparar contrato', { email: reg.email });

    return { ok: true, email: reg.email };
  });
