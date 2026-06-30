import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { Database } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];

// ---------- Shared helpers ----------

async function requireAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || (data.role !== 'master' && data.role !== 'project_manager')) {
    throw new Error('Sem permissão');
  }
}

// ---------- Client Agents ----------

const agentSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  category: z.string().trim().max(100).nullable().optional(),
  icon: z.string().trim().max(100).nullable().optional(),
  external_url: z.string().trim().min(1).max(1000),
  is_active: z.boolean().optional(),
  display_order: z.number().int().optional(),
});

export const listClientAgents = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('client_agents')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Tables['client_agents']['Row'][];
  });

export const listClientAgentsForAdmin = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { client_id: string }) => z.object({ client_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from('client_agents')
      .select('*')
      .eq('client_id', data.client_id)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Tables['client_agents']['Row'][];
  });

export const upsertClientAgent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof agentSchema>) => agentSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from('client_agents').update(rest).eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from('client_agents').insert(rest);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const deleteClientAgent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from('client_agents').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------- Learning Tracks ----------

const trackSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  cover_url: z.string().trim().max(1000).nullable().optional(),
  category: z.string().trim().max(100).nullable().optional(),
  is_published: z.boolean().optional(),
  display_order: z.number().int().optional(),
});

export const listLearningTracks = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('client_learning_tracks')
      .select('*')
      .eq('is_published', true)
      .order('display_order', { ascending: true })
      .order('title', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Tables['client_learning_tracks']['Row'][];
  });

export const listLearningTracksForAdmin = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { client_id: string }) => z.object({ client_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from('client_learning_tracks')
      .select('*')
      .eq('client_id', data.client_id)
      .order('display_order', { ascending: true })
      .order('title', { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Tables['client_learning_tracks']['Row'][];
  });

export const upsertLearningTrack = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof trackSchema>) => trackSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from('client_learning_tracks').update(rest).eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from('client_learning_tracks').insert(rest);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const deleteLearningTrack = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from('client_learning_tracks').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------- Learning Items ----------

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  track_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  content_type: z.enum(['video', 'article', 'pdf', 'link']),
  url: z.string().trim().min(1).max(1000),
  duration_minutes: z.number().int().nullable().optional(),
  display_order: z.number().int().optional(),
});

export const listLearningItems = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { track_id: string }) => z.object({ track_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from('client_learning_items')
      .select('*')
      .eq('track_id', data.track_id)
      .order('display_order', { ascending: true })
      .order('title', { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Tables['client_learning_items']['Row'][];
  });

export const listLearningItemsForAdmin = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { track_id: string }) => z.object({ track_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from('client_learning_items')
      .select('*')
      .eq('track_id', data.track_id)
      .order('display_order', { ascending: true })
      .order('title', { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Tables['client_learning_items']['Row'][];
  });

export const upsertLearningItem = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof itemSchema>) => itemSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from('client_learning_items').update(rest).eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from('client_learning_items').insert(rest);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const deleteLearningItem = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from('client_learning_items').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------- Glossary ----------

const glossarySchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  term: z.string().trim().min(1).max(200),
  definition: z.string().trim().min(1).max(4000),
  category: z.string().trim().max(100).nullable().optional(),
  examples: z.string().trim().max(2000).nullable().optional(),
});

export const listGlossaryTerms = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('client_glossary_terms')
      .select('*')
      .order('category', { ascending: true })
      .order('term', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Tables['client_glossary_terms']['Row'][];
  });

export const listGlossaryTermsForAdmin = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { client_id: string }) => z.object({ client_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from('client_glossary_terms')
      .select('*')
      .eq('client_id', data.client_id)
      .order('category', { ascending: true })
      .order('term', { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Tables['client_glossary_terms']['Row'][];
  });

export const upsertGlossaryTerm = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof glossarySchema>) => glossarySchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from('client_glossary_terms').update(rest).eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from('client_glossary_terms').insert(rest);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const deleteGlossaryTerm = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from('client_glossary_terms').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------- Strategic Goals ----------

const goalSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  metric: z.string().trim().max(200).nullable().optional(),
  target_value: z.number().nullable().optional(),
  current_value: z.number().optional(),
  unit: z.string().trim().max(50).nullable().optional(),
  period_start: z.string().nullable().optional(),
  period_end: z.string().nullable().optional(),
  status: z.enum(['on_track', 'at_risk', 'achieved', 'missed']).optional(),
  category: z.enum(['estrategica', 'operacional', 'economica']).optional(),
  display_order: z.number().int().optional(),
});

export const listStrategicGoals = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('client_strategic_goals')
      .select('*')
      .order('display_order', { ascending: true })
      .order('title', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Tables['client_strategic_goals']['Row'][];
  });

export const listStrategicGoalsForAdmin = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { client_id: string }) => z.object({ client_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from('client_strategic_goals')
      .select('*')
      .eq('client_id', data.client_id)
      .order('display_order', { ascending: true })
      .order('title', { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Tables['client_strategic_goals']['Row'][];
  });

export const upsertStrategicGoal = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof goalSchema>) => goalSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from('client_strategic_goals').update(rest).eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from('client_strategic_goals').insert(rest);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const deleteStrategicGoal = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from('client_strategic_goals').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
