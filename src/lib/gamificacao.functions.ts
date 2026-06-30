import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { LeaderCategory, Rarity } from '@/lib/gamificacao-store';

const superAdminRoles = ['super_admin', 'master'];
const superAdminEmails = ['wilson@agenciaw2.com.br'];
const DEFAULT_POINTS_REASON = 'Concessão manual de pontos';

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role,email')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const hasSuperAdminRole = superAdminRoles.includes(profile?.role);
  const hasSuperAdminEmail = profile?.email && superAdminEmails.includes(String(profile.email).toLowerCase());
  if (!profile || (!hasSuperAdminRole && !hasSuperAdminEmail)) {
    throw new Error('Apenas Super Admin pode conceder pontos e gerenciar a gamificação.');
  }
}

export const awardGamificationPoints = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    user_id: z.string().uuid(),
    points_amount: z.number().int().min(-100000).max(100000).refine((value) => value !== 0, 'Informe uma pontuação diferente de zero.'),
    reason: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? DEFAULT_POINTS_REASON : value),
      z.string().trim().min(1).max(500).default(DEFAULT_POINTS_REASON),
    ),
  }).parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    const { error } = await supabaseAdmin.from('gamification_points').insert({
      user_id: data.user_id,
      points_amount: data.points_amount,
      reason: data.reason,
      source_type: 'manual',
      awarded_by: context.userId,
    });

    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setGamificationUserLevel = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    user_id: z.string().uuid(),
    level_name: z.string().trim().min(1).max(120),
  }).parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    const { error } = await supabaseAdmin
      .from('gamification_profiles')
      .upsert(
        { user_id: data.user_id, current_level: data.level_name },
        { onConflict: 'user_id' },
      );

    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const awardGamificationPin = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    user_id: z.string().uuid(),
    pin_id: z.string().uuid(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    const { error } = await supabaseAdmin.from('gamification_user_pins').upsert(
      {
        user_id: data.user_id,
        pin_id: data.pin_id,
        source_type: 'manual',
        unlocked_by: context.userId,
      },
      { onConflict: 'user_id,pin_id' },
    );

    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const revokeGamificationPin = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    user_id: z.string().uuid(),
    pin_id: z.string().uuid(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    const { error } = await supabaseAdmin
      .from('gamification_user_pins')
      .delete()
      .eq('user_id', data.user_id)
      .eq('pin_id', data.pin_id);

    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const awardGamificationLeaderStar = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    user_id: z.string().uuid(),
    title: z.string().trim().max(160).optional(),
    reason: z.string().trim().min(1).max(1000),
    category: z.enum(['extraordinary_execution', 'loyalty', 'leadership_by_example', 'high_performance', 'somus_culture', 'courage_to_solve', 'collaboration', 'evolution', 'ownership', 'exceptional_result']),
    rarity: z.enum(['bronze', 'silver', 'gold', 'legendary']),
    bonus_stars: z.number().int().min(1).max(100000),
    public_message: z.string().trim().max(1000).optional(),
    internal_note: z.string().trim().max(1000).optional(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    const { error } = await supabaseAdmin.from('gamification_leader_stars').insert({
      ...data,
      category: data.category as LeaderCategory,
      rarity: data.rarity as Rarity,
      title: data.title || null,
      public_message: data.public_message || null,
      internal_note: data.internal_note || null,
      awarded_by: context.userId,
    });

    if (error) throw new Error(error.message);
    return { ok: true as const };
  });