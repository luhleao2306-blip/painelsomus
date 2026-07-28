import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Catálogo de módulos do sistema. A `key` é o prefixo da rota (idêntico ao usado
// em routeAccess do MainLayout). Mantenha sincronizado com a navegação.
export type ModuleDef = { key: string; label: string; group: string };

export const MODULES: ModuleDef[] = [
  { key: '/dashboard', label: 'Dashboard', group: 'Visão Geral' },

  { key: '/projects-overview', label: 'Visão Geral de Projetos', group: 'Operação' },
  { key: '/projects', label: 'Projetos & Tarefas', group: 'Operação' },
  { key: '/briefings', label: 'Briefings', group: 'Operação' },
  { key: '/agenda', label: 'Agenda', group: 'Operação' },
  { key: '/meetings', label: 'Atas de Reunião', group: 'Operação' },
  { key: '/time-report', label: 'Relatório de Tempo', group: 'Operação' },

  { key: '/clients', label: 'Clientes', group: 'Relacionamento' },
  { key: '/collaborators', label: 'Colaboradores', group: 'Relacionamento' },

  { key: '/comercial', label: 'Dashboard Comercial', group: 'Comercial' },
  { key: '/comercial/prospeccoes', label: 'Funil Comercial', group: 'Comercial' },
  { key: '/comercial/metas', label: 'Metas Comerciais', group: 'Comercial' },
  { key: '/sales-performance', label: 'Performance Comercial', group: 'Comercial' },

  { key: '/financeiro', label: 'Financeiro (DRE)', group: 'Financeiro' },
  { key: '/financeiro/indicadores', label: 'Indicadores Financeiros', group: 'Financeiro' },
  { key: '/contracts', label: 'Contratos', group: 'Financeiro' },

  { key: '/gamificacao', label: 'Carreira', group: 'Carreira' },

  { key: '/documents', label: 'Documentos', group: 'Conhecimento' },
  { key: '/info-center', label: 'Central de Informações', group: 'Conhecimento' },
  { key: '/processes', label: 'Processos & POPs', group: 'Conhecimento' },
  { key: '/intelligent-central', label: 'Central Inteligente', group: 'Conhecimento' },
  { key: '/knowledge-trail', label: 'Trilha da Alcateia', group: 'Conhecimento' },

  { key: '/system-docs', label: 'Documentação do Sistema', group: 'Sistema' },
  { key: '/operacoes/senhas', label: 'Cofre de Senhas', group: 'Sistema' },
];

export type Override = { user_id: string; module_key: string; granted: boolean };

export function useMyModuleOverrides(userId?: string) {
  return useQuery({
    queryKey: ['module-overrides', 'mine', userId ?? 'anon'],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_module_overrides' as any)
        .select('module_key,granted')
        .eq('user_id', userId!);
      if (error) throw error;
      const map = new Map<string, boolean>();
      (data as any[] | null)?.forEach(r => map.set(r.module_key, r.granted));
      return map;
    },
  });
}

export function useAllModuleOverrides() {
  return useQuery({
    queryKey: ['module-overrides', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_module_overrides' as any)
        .select('user_id,module_key,granted');
      if (error) throw error;
      return (data ?? []) as unknown as Override[];
    },
  });
}

export function useSetModuleOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user_id: string; module_key: string; granted: boolean | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (input.granted === null) {
        const { error } = await supabase
          .from('user_module_overrides' as any)
          .delete()
          .eq('user_id', input.user_id)
          .eq('module_key', input.module_key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_module_overrides' as any)
          .upsert(
            {
              user_id: input.user_id,
              module_key: input.module_key,
              granted: input.granted,
              updated_by: user?.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,module_key' },
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['module-overrides'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao salvar permissão'),
  });
}

/**
 * Decide se um módulo está visível dado o acesso por cargo + overrides.
 * - granted === true   → libera (mesmo que cargo não tivesse acesso)
 * - granted === false  → bloqueia (mesmo que cargo tivesse acesso)
 * - sem registro       → mantém comportamento por cargo
 */
export function canAccessModule(roleAllows: boolean, override: boolean | undefined) {
  if (override === true) return true;
  if (override === false) return false;
  return roleAllows;
}
