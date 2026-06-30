import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TaskType {
  id: string;
  name: string;
  sort_order: number;
}

let cache: TaskType[] | null = null;
const listeners = new Set<(t: TaskType[]) => void>();

async function load() {
  const { data, error } = await supabase
    .from('task_types')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  cache = (data ?? []) as TaskType[];
  listeners.forEach((l) => l(cache!));
  return cache;
}

export function useTaskTypes() {
  const [types, setTypes] = useState<TaskType[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    listeners.add(setTypes);
    if (!cache) {
      load()
        .catch((e) => console.error('load task types', e))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    return () => {
      listeners.delete(setTypes);
    };
  }, []);

  const refresh = useCallback(async () => {
    await load();
  }, []);

  const addType = useCallback(async (name: string) => {
    const clean = name.trim();
    if (!clean) return null;
    const nextOrder = (cache?.reduce((m, t) => Math.max(m, t.sort_order), 0) ?? 0) + 1;
    const { data, error } = await supabase
      .from('task_types')
      .insert({ name: clean, sort_order: nextOrder })
      .select('id, name, sort_order')
      .single();
    if (error) throw error;
    await load();
    return data as TaskType;
  }, []);

  const renameType = useCallback(async (id: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const { error } = await supabase.from('task_types').update({ name: clean }).eq('id', id);
    if (error) throw error;
    await load();
  }, []);

  const deleteType = useCallback(async (id: string) => {
    const { error } = await supabase.from('task_types').delete().eq('id', id);
    if (error) throw error;
    await load();
  }, []);

  return { types, loading, refresh, addType, renameType, deleteType };
}
