import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ClientDemand = {
  id: string;
  name: string;
  project_name: string | null;
  folder_name: string | null;
  situation: 'em_andamento' | 'entregue';
  due_date: string | null;
  delivered_at: string | null;
};

export type UsefulLink = {
  id: string;
  client_id: string;
  title: string;
  url: string;
  description?: string | null;
  category?: string | null;
};

/** Demandas liberadas para o cliente logado (somente em andamento/entregue). */
export function useMyClientDemands() {
  return useQuery({
    queryKey: ['my-client-demands'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_my_client_demands');
      if (error) throw error;
      return (data ?? []) as ClientDemand[];
    },
    refetchInterval: 60_000,
  });
}

/** Demandas de um cliente (visão interna) com flag de visibilidade. */
export function useClientDemandsAdmin(clientId?: string) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ['client-demands-admin', clientId],
    queryFn: async () => {
      const { data: folders, error: fe } = await (supabase as any)
        .from('op_folders').select('id, name, client_id').eq('client_id', clientId);
      if (fe) throw fe;
      const folderIds = (folders ?? []).map((f: any) => f.id);
      if (!folderIds.length) return [];

      const { data: projects } = await (supabase as any)
        .from('op_projects').select('id, name, folder_id').in('folder_id', folderIds);
      const projectIds = (projects ?? []).map((p: any) => p.id);
      if (!projectIds.length) return [];

      const { data: sections } = await (supabase as any)
        .from('op_sections').select('id, project_id').in('project_id', projectIds);
      const sectionIds = (sections ?? []).map((s: any) => s.id);
      if (!sectionIds.length) return [];

      const { data: tasks, error: te } = await (supabase as any)
        .from('op_tasks')
        .select('id, name, status, due_date, section_id, client_visible')
        .in('section_id', sectionIds);
      if (te) throw te;

      const projById = new Map((projects ?? []).map((p: any) => [p.id, p]));
      const secById = new Map((sections ?? []).map((s: any) => [s.id, s]));

      return (tasks ?? []).map((t: any) => {
        const sec = secById.get(t.section_id);
        const proj = sec ? projById.get(sec.project_id) : null;
        return {
          id: t.id as string,
          name: t.name as string,
          status: t.status as string,
          due_date: t.due_date as string | null,
          client_visible: !!t.client_visible,
          project_name: (proj?.name ?? null) as string | null,
        };
      });
    },
  });
}

export function useSetDemandVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const { error } = await (supabase as any)
        .from('op_tasks').update({ client_visible: visible }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-demands-admin'] }),
  });
}

/** Pastas de operações e seu vínculo com clientes. */
export function useOpFolders() {
  return useQuery({
    queryKey: ['op-folders-clients'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('op_folders').select('id, name, client_id').order('name');
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; client_id: string | null }[];
    },
  });
}

export function useLinkFolderToClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ folderId, clientId }: { folderId: string; clientId: string | null }) => {
      const { error } = await (supabase as any)
        .from('op_folders').update({ client_id: clientId }).eq('id', folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['op-folders-clients'] });
      qc.invalidateQueries({ queryKey: ['client-demands-admin'] });
    },
  });
}

/** Links úteis */
export function useUsefulLinks(clientId?: string) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ['client-useful-links', clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('client_useful_links').select('*').eq('client_id', clientId).order('created_at');
      if (error) throw error;
      return (data ?? []) as UsefulLink[];
    },
  });
}

export function useMyUsefulLinks(clientId?: string | null) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ['my-useful-links', clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('client_useful_links').select('*').eq('client_id', clientId).order('created_at');
      if (error) throw error;
      return (data ?? []) as UsefulLink[];
    },
  });
}

export function useUpsertUsefulLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<UsefulLink>) => {
      const { error } = await (supabase as any).from('client_useful_links').upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-useful-links'] }),
  });
}

export function useDeleteUsefulLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('client_useful_links').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-useful-links'] }),
  });
}

/** Entregas realizadas visíveis ao cliente */
export function useMyDeliverables(clientId?: string | null) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ['my-deliverables', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliverables')
        .select('id, name, type, status, link, actual_date, forecast_date, visible_to_client')
        .eq('client_id', clientId!)
        .eq('visible_to_client', true)
        .order('actual_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Atas visíveis ao cliente */
export function useMyMinutes(clientId?: string | null) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ['my-minutes', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_minutes')
        .select('id, title, meeting_date, decisions, next_steps, client_pending, external_link, visible_to_client')
        .eq('client_id', clientId!)
        .eq('visible_to_client', true)
        .order('meeting_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
