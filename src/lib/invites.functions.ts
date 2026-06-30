import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const tokenSchema = z.object({ token: z.string().uuid() });

export const validateInvite = createServerFn({ method: 'POST' })
  .inputValidator((d: { token: string }) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: invite, error } = await supabaseAdmin
      .from('collaborator_invites')
      .select('id, token, role, expires_at, max_uses, uses_count, active, note')
      .eq('token', data.token)
      .maybeSingle();

    if (error || !invite) return { valid: false as const, reason: 'not_found' };
    if (!invite.active) return { valid: false as const, reason: 'inactive' };
    if (new Date(invite.expires_at) < new Date()) return { valid: false as const, reason: 'expired' };
    if (invite.uses_count >= invite.max_uses) return { valid: false as const, reason: 'exhausted' };
    return { valid: true as const, role: invite.role, expires_at: invite.expires_at, note: invite.note };
  });

const collaboratorRedeemSchema = z.object({
  kind: z.literal('collaborator'),
  token: z.string().uuid(),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(1).max(120),
  cpf: z.string().trim().min(11).max(20),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  role_function: z.string().trim().min(1).max(120),
});

const clientRedeemSchema = z.object({
  kind: z.literal('client'),
  token: z.string().uuid(),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(1).max(120),
  company_name: z.string().trim().min(1).max(200),
  cnpj: z.string().trim().min(11).max(20),
  industry: z.string().trim().max(120).optional().default(''),
  phone: z.string().trim().max(30).optional().default(''),
});

const redeemSchema = z.discriminatedUnion('kind', [collaboratorRedeemSchema, clientRedeemSchema]);

export const redeemInvite = createServerFn({ method: 'POST' })
  .inputValidator((d: z.infer<typeof redeemSchema>) => redeemSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    const { data: invite, error: invErr } = await supabaseAdmin
      .from('collaborator_invites')
      .select('*')
      .eq('token', data.token)
      .maybeSingle();
    if (invErr || !invite) throw new Error('Convite não encontrado');
    if (!invite.active) throw new Error('Convite desativado');
    if (new Date(invite.expires_at) < new Date()) throw new Error('Convite expirado');
    if (invite.uses_count >= invite.max_uses) throw new Error('Convite esgotado');

    if (data.kind === 'client' && invite.role !== 'client') {
      throw new Error('Este link não é para cadastro de cliente.');
    }
    if (data.kind === 'collaborator' && invite.role === 'client') {
      throw new Error('Este link é para cadastro de cliente.');
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, role: invite.role },
    });
    if (createErr || !created.user) throw new Error(createErr?.message || 'Falha ao criar usuário');

    const userId = created.user.id;

    if (data.kind === 'client') {
      // Create the client company record
      const { data: client, error: clientErr } = await supabaseAdmin
        .from('clients')
        .insert({
          name: data.company_name,
          industry: data.industry || null,
          email: data.email,
          phone: data.phone || null,
          responsible_name: data.full_name,
          observations: `CNPJ: ${data.cnpj}`,
          status: 'Ativo',
        })
        .select('id')
        .single();
      if (clientErr || !client) throw new Error(clientErr?.message || 'Falha ao criar cliente');

      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        full_name: data.full_name,
        email: data.email,
        role: 'client',
        status: 'active',
        client_id: client.id,
        phone: data.phone || null,
      }, { onConflict: 'id' });
    } else {
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        full_name: data.full_name,
        email: data.email,
        role: invite.role,
        status: 'active',
      }, { onConflict: 'id' });

      await supabaseAdmin.from('collaborators').insert({
        profile_id: userId,
        full_name: data.full_name,
        email: data.email,
        cpf: data.cpf,
        birth_date: data.birth_date,
        role_function: data.role_function,
        status: 'ativo',
        access_level: invite.role === 'master' ? 'super_admin' : 'colaborador',
      });
    }

    await supabaseAdmin
      .from('collaborator_invites')
      .update({ uses_count: invite.uses_count + 1 })
      .eq('id', invite.id);

    return { ok: true as const, userId };
  });
