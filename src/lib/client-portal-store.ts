import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ---------- Agents ----------
export type ClientAgent = {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  external_url: string;
  is_active: boolean;
  display_order: number;
};

export function useClientAgents(clientId?: string | null) {
  return useQuery({
    queryKey: ['client_agents', clientId ?? 'me'],
    queryFn: async () => {
      let q = supabase.from('client_agents').select('*').order('display_order').order('name');
      if (clientId) q = q.eq('client_id', clientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ClientAgent[];
    },
  });
}

export function useUpsertClientAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ClientAgent> & { client_id: string; name: string; external_url: string }) => {
      const { id, ...rest } = input;
      if (id) {
        const { error } = await supabase.from('client_agents').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('client_agents').insert(rest as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client_agents'] }),
  });
}

export function useDeleteClientAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_agents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client_agents'] }),
  });
}

// ---------- Tracks & Items ----------
export type LearningTrack = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  category: string | null;
  display_order: number;
  is_published: boolean;
};

export type LearningItem = {
  id: string;
  track_id: string;
  title: string;
  description: string | null;
  content_type: string;
  url: string;
  duration_minutes: number | null;
  display_order: number;
};

export function useLearningTracks(clientId?: string | null) {
  return useQuery({
    queryKey: ['learning_tracks', clientId ?? 'me'],
    queryFn: async () => {
      let q = supabase.from('client_learning_tracks').select('*').order('display_order').order('title');
      if (clientId) q = q.eq('client_id', clientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LearningTrack[];
    },
  });
}

export function useLearningItems(trackId?: string | null) {
  return useQuery({
    enabled: !!trackId,
    queryKey: ['learning_items', trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_learning_items')
        .select('*')
        .eq('track_id', trackId!)
        .order('display_order')
        .order('title');
      if (error) throw error;
      return (data ?? []) as LearningItem[];
    },
  });
}

export function useUpsertTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<LearningTrack> & { client_id: string; title: string }) => {
      const { id, ...rest } = input;
      if (id) {
        const { error } = await supabase.from('client_learning_tracks').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('client_learning_tracks').insert(rest as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['learning_tracks'] }),
  });
}

export function useDeleteTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_learning_tracks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['learning_tracks'] }),
  });
}

export function useUpsertItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<LearningItem> & { track_id: string; title: string; url: string }) => {
      const { id, ...rest } = input;
      if (id) {
        const { error } = await supabase.from('client_learning_items').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('client_learning_items').insert(rest as any);
        if (error) throw error;
      }
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['learning_items', vars.track_id] }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; track_id: string }) => {
      const { error } = await supabase.from('client_learning_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['learning_items', vars.track_id] }),
  });
}

// ---------- Glossary ----------
export type GlossaryTerm = {
  id: string;
  client_id: string;
  term: string;
  definition: string;
  category: string | null;
  examples: string | null;
};

export function useGlossary(clientId?: string | null) {
  return useQuery({
    queryKey: ['glossary', clientId ?? 'me'],
    queryFn: async () => {
      let q = supabase.from('client_glossary_terms').select('*').order('term');
      if (clientId) q = q.eq('client_id', clientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as GlossaryTerm[];
    },
  });
}

export function useUpsertGlossary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<GlossaryTerm> & { client_id: string; term: string; definition: string }) => {
      const { id, ...rest } = input;
      if (id) {
        const { error } = await supabase.from('client_glossary_terms').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('client_glossary_terms').insert(rest as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['glossary'] }),
  });
}

export function useDeleteGlossary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_glossary_terms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['glossary'] }),
  });
}

// ---------- Strategic Goals ----------
export type GoalCategory = 'estrategica' | 'operacional' | 'economica';
export type StrategicGoal = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  metric: string | null;
  target_value: number | null;
  current_value: number;
  unit: string | null;
  period_start: string | null;
  period_end: string | null;
  status: string;
  category: GoalCategory;
  display_order: number;
};


export function useStrategicGoals(clientId?: string | null) {
  return useQuery({
    queryKey: ['strategic_goals', clientId ?? 'me'],
    queryFn: async () => {
      let q = supabase.from('client_strategic_goals').select('*').order('display_order').order('title');
      if (clientId) q = q.eq('client_id', clientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as StrategicGoal[];
    },
  });
}

export function useUpsertGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<StrategicGoal> & { client_id: string; title: string }) => {
      const { id, ...rest } = input;
      if (id) {
        const { error } = await supabase.from('client_strategic_goals').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('client_strategic_goals').insert(rest as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['strategic_goals'] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_strategic_goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['strategic_goals'] }),
  });
}
