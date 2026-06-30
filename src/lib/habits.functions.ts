import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const ADMIN_ROLES = ['super_admin', 'master', 'project_manager'];
const ADMIN_EMAILS = ['wilson@agenciaw2.com.br'];

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role,email')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return false;
  if (ADMIN_ROLES.includes(profile.role)) return true;
  return profile.email && ADMIN_EMAILS.includes(String(profile.email).toLowerCase());
}

export const approveHabitWithPoints = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      habit_id: z.string().uuid(),
      points_weight: z.number().int().min(1).max(10000),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.supabase, context.userId))) {
      throw new Error('Apenas líderes podem definir os pontos do hábito.');
    }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin
      .from('gamification_habits')
      .update({ status: 'active', points_weight: data.points_weight })
      .eq('id', data.habit_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const completeHabitAndAward = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ habit_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    const { data: habit, error: habitErr } = await supabaseAdmin
      .from('gamification_habits')
      .select('*')
      .eq('id', data.habit_id)
      .maybeSingle();
    if (habitErr) throw new Error(habitErr.message);
    if (!habit) throw new Error('Hábito não encontrado.');

    const admin = await isAdmin(context.supabase, context.userId);
    if (habit.user_id !== context.userId && !admin) {
      throw new Error('Você não pode concluir um hábito de outro usuário.');
    }
    if (habit.status !== 'active') {
      throw new Error('Este hábito ainda não foi aprovado pelo líder.');
    }
    if (habit.points_awarded) {
      throw new Error('Pontos já creditados para este hábito.');
    }

    const { count, error: countErr } = await supabaseAdmin
      .from('gamification_habit_checkins')
      .select('id', { count: 'exact', head: true })
      .eq('habit_id', habit.id);
    if (countErr) throw new Error(countErr.message);

    if ((count ?? 0) < habit.target_checkins) {
      throw new Error(
        `Faltam ${habit.target_checkins - (count ?? 0)} check-ins para concluir o hábito.`,
      );
    }

    const { error: pointsErr } = await supabaseAdmin.from('gamification_points').insert({
      user_id: habit.user_id,
      points_amount: habit.points_weight,
      reason: `Hábito concluído: ${habit.title}`,
      source_type: 'habit',
      source_id: habit.id,
      awarded_by: context.userId,
    });
    if (pointsErr) throw new Error(pointsErr.message);

    const { error: updErr } = await supabaseAdmin
      .from('gamification_habits')
      .update({ status: 'completed', points_awarded: true })
      .eq('id', habit.id);
    if (updErr) throw new Error(updErr.message);

    return { ok: true as const, points: habit.points_weight };
  });
