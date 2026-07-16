import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const schema = z.object({
  client_id: z.string().uuid(),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(1).max(120),
});

const clientWithLoginSchema = z.object({
  name: z.string().trim().min(1).max(200),
  industry: z.string().trim().max(120).optional().nullable(),
  status: z.enum(['Ativo', 'Pendente', 'Em Pausa']).default('Ativo'),
  responsible_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().nullable(),
  manager_name: z.string().trim().max(120).optional().nullable(),
  manager_id: z.string().uuid().optional().nullable(),
  contract_start: z.string().optional().nullable(),
  contract_end: z.string().optional().nullable(),
  is_ongoing: z.boolean().optional().default(false),
  birthday: z.string().optional().nullable(),
  observations: z.string().max(4000).optional().nullable(),
  client_password: z.string().min(8).max(72).optional().or(z.literal('')),
});

export const createClientWithLogin = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof clientWithLoginSchema>) => clientWithLoginSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: caller, error: callerErr } = await context.supabase
      .from('profiles').select('role').eq('id', context.userId).maybeSingle();
    if (callerErr) throw new Error(callerErr.message);
    if (!caller || (caller.role !== 'master' && caller.role !== 'project_manager')) {
      throw new Error('Sem permissão para cadastrar clientes.');
    }

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const password = data.client_password?.trim() || '';

    const { data: client, error: clientErr } = await supabaseAdmin
      .from('clients')
      .insert({
        name: data.name,
        industry: data.industry || null,
        status: data.status,
        responsible_name: data.responsible_name || null,
        email: data.email,
        phone: data.phone || null,
        manager_name: data.manager_name || null,
        manager_id: data.manager_id || null,
        contract_start: data.contract_start || null,
        contract_end: data.is_ongoing ? null : (data.contract_end || null),
        is_ongoing: !!data.is_ongoing,
        birthday: data.birthday || null,
        observations: data.observations || null,
      })
      .select('*')
      .single();

    if (clientErr || !client) {
      throw new Error(clientErr?.message || 'Falha ao cadastrar cliente.');
    }

    if (!password) {
      return { client, loginCreated: false as const };
    }

    let userId: string | undefined;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: data.responsible_name || data.name, role: 'client' },
    });

    if (created?.user) {
      userId = created.user.id;
    } else {
      const msg = (createErr?.message || '').toLowerCase();
      const exists = msg.includes('already') || msg.includes('registered') || msg.includes('exists');
      if (!exists) {
        await supabaseAdmin.from('clients').delete().eq('id', client.id);
        throw new Error(createErr?.message || 'Falha ao criar acesso do cliente.');
      }

      let page = 1;
      while (!userId && page <= 20) {
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (listErr) {
          await supabaseAdmin.from('clients').delete().eq('id', client.id);
          throw new Error(listErr.message);
        }
        const found = list.users.find((u) => (u.email || '').toLowerCase() === data.email.toLowerCase());
        if (found) { userId = found.id; break; }
        if (list.users.length < 200) break;
        page += 1;
      }

      if (!userId) {
        await supabaseAdmin.from('clients').delete().eq('id', client.id);
        throw new Error('Usuário existente não encontrado para vincular.');
      }

      const { error: passwordErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (passwordErr) {
        await supabaseAdmin.from('clients').delete().eq('id', client.id);
        throw new Error(passwordErr.message);
      }
    }

    const { error: upErr } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      full_name: data.responsible_name || data.name,
      email: data.email,
      role: 'client',
      client_id: client.id,
      status: 'active',
      phone: data.phone || null,
    }, { onConflict: 'id' });

    if (upErr) {
      await supabaseAdmin.from('clients').delete().eq('id', client.id);
      throw new Error(upErr.message);
    }

    return { client, loginCreated: true as const, userId };
  });

export const createClientLogin = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof schema>) => schema.parse(d))
  .handler(async ({ data, context }) => {
    // Authorize: only master or project_manager can create client logins
    const { data: caller, error: callerErr } = await context.supabase
      .from('profiles').select('role').eq('id', context.userId).maybeSingle();
    if (callerErr) throw new Error(callerErr.message);
    if (!caller || (caller.role !== 'master' && caller.role !== 'project_manager')) {
      throw new Error('Sem permissão');
    }

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    let userId: string | undefined;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, role: 'client' },
    });
    if (created?.user) {
      userId = created.user.id;
    } else {
      // If user already exists, find them and (optionally) reset password
      const msg = (createErr?.message || '').toLowerCase();
      const exists = msg.includes('already') || msg.includes('registered') || msg.includes('exists');
      if (!exists) throw new Error(createErr?.message || 'Falha ao criar usuário');
      // Lookup user by email via listUsers (paginated)
      let page = 1;
      while (!userId && page <= 20) {
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (listErr) throw new Error(listErr.message);
        const found = list.users.find(u => (u.email || '').toLowerCase() === data.email.toLowerCase());
        if (found) { userId = found.id; break; }
        if (list.users.length < 200) break;
        page += 1;
      }
      if (!userId) throw new Error('Usuário existente não encontrado para vincular');
      // Update password
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: data.password });
    }
    const { error: upErr } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      full_name: data.full_name,
      email: data.email,
      role: 'client',
      client_id: data.client_id,
      status: 'active',
    }, { onConflict: 'id' });
    if (upErr) throw new Error(upErr.message);

    return { ok: true as const, userId };
  });
