import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  awardGamificationLeaderStar,
  awardGamificationPin,
  awardGamificationPoints,
  revokeGamificationPin,
  setGamificationUserLevel,
} from '@/lib/gamificacao.functions';

// ============= Configuração =============
// Emails de usuários que NÃO participam da gamificação (apenas concedem).
// O dono não compete — ele reconhece.
export const EXCLUDED_FROM_GAMIFICATION_EMAILS = [
  'wilson@agenciaw2.com.br',
];

// Somente estes emails podem conceder Pontos de Caça, Pins e Estrelas do Líder.
// Reconhecimento é responsabilidade do dono da alcateia.
export const SUPER_ADMIN_EMAILS = [
  'wilson@agenciaw2.com.br',
];

export const AWARDER_EMAILS = SUPER_ADMIN_EMAILS;

export function isSuperAdminAccess(email?: string | null, role?: string | null) {
  if (role === 'super_admin' || role === 'master') return true;
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase());
}

export function canUserAward(email?: string | null, role?: string | null) {
  return isSuperAdminAccess(email, role);
}

export const POINTS_LABEL = 'Pontos de Caça';
export const POINTS_LABEL_SHORT = 'pontos';
export const POINTS_LABEL_SINGULAR = 'Ponto de Caça';

// ============= Tipos =============
export type Rarity = 'bronze' | 'silver' | 'gold' | 'legendary';
export type LeaderCategory =
  | 'extraordinary_execution' | 'loyalty' | 'leadership_by_example' | 'high_performance'
  | 'somus_culture' | 'courage_to_solve' | 'collaboration' | 'evolution' | 'ownership' | 'exceptional_result';

export const LEADER_CATEGORY_LABELS: Record<LeaderCategory, string> = {
  extraordinary_execution: 'Execução extraordinária',
  loyalty: 'Lealdade à alcateia',
  leadership_by_example: 'Liderança pelo exemplo',
  high_performance: 'Alta performance',
  somus_culture: 'Cultura SOMUS',
  courage_to_solve: 'Coragem para resolver',
  collaboration: 'Colaboração fora da curva',
  evolution: 'Evolução notável',
  ownership: 'Atitude de dono',
  exceptional_result: 'Resultado excepcional',
};

export const RARITY_LABELS: Record<Rarity, string> = {
  bronze: 'Bronze', silver: 'Prata', gold: 'Ouro', legendary: 'Lendária',
};

export const RARITY_STARS: Record<Rarity, number> = {
  bronze: 25, silver: 50, gold: 100, legendary: 150,
};

export const RARITY_COLORS: Record<Rarity, string> = {
  bronze: 'bg-amber-100 text-amber-800 border-amber-200',
  silver: 'bg-slate-100 text-slate-800 border-slate-300',
  gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  legendary: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-900 border-purple-300',
};

export type Level = {
  name: string;
  min: number;
  max: number;
};

export const LEVELS: Level[] = [
  { name: 'Colaborador',            min: 0,    max: 49 },
  { name: 'Lobo Aprendiz',          min: 50,   max: 119 },
  { name: 'Lobo em Treinamento',    min: 120,  max: 219 },
  { name: 'Lobo Executor',          min: 220,  max: 349 },
  { name: 'Lobo Caçador',           min: 350,  max: 499 },
  { name: 'Lobo Veterano',          min: 500,  max: 699 },
  { name: 'Lobo de Elite',          min: 700,  max: 949 },
  { name: 'Lobo Sentinela',         min: 950,  max: 1249 },
  { name: 'Lobo Beta',              min: 1250, max: 1599 },
  { name: 'Lobo Alfa',              min: 1600, max: 2099 },
  { name: 'Lobo Mítico',            min: 2100, max: 2799 },
  { name: 'Lenda da Alcateia',      min: 2800, max: Infinity },
];

/**
 * Resolve o nível de um colaborador a partir do nome definido pelo Super Admin
 * (`current_level`). Não há mais cálculo automático por pontuação — o estágio
 * de maturidade é critério humano.
 */
export function getLevelInfo(levelName?: string | null) {
  const found = LEVELS.findIndex(l => l.name === levelName);
  const safeIdx = found === -1 ? 0 : found;
  const current = LEVELS[safeIdx];
  const next = LEVELS[safeIdx + 1] ?? null;
  return { current, next, progress: 0, levelIndex: safeIdx };
}

export const MOTIVATIONAL_PHRASES = [
  'A alcateia cresce quando cada lobo evolui.',
  'Consistência também é força.',
  'Toda entrega fortalece a alcateia.',
  'Performance é ritmo, não sorte.',
  'Quem executa, lidera.',
  'O lobo forte joga pelo bando.',
  'A cultura se prova na atitude.',
  'A honra da alcateia está na execução.',
  'Cada Ponto de Caça é uma marca da sua presença.',
  'O lobo que caça hoje, lidera amanhã.',
  'Não espere a próxima missão. Vá atrás dela.',
  'A vitrine de prêmios é só o começo. O orgulho da alcateia é o que fica.',
  'Pontos somam. Atitude multiplica.',
  'Quem evolui um nível, eleva o bando inteiro.',
];

export const LEADER_PHRASES = [
  'A Estrela do Líder não premia cargo. Premia atitude.',
  'Liderança reconhece aquilo que fortalece a alcateia.',
  'A honra da alcateia está nas atitudes que ninguém pediu, mas todos perceberam.',
  'Alguns lobos não esperam comando. Eles protegem, executam e elevam o bando.',
  'A Estrela do Líder é para quem joga acima da própria função.',
  'Cultura forte nasce quando a atitude certa é reconhecida.',
];

// ============= Queries =============
export function useGamificationProfiles() {
  return useQuery({
    queryKey: ['gam', 'profiles'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('gamification_profiles')
        .select('*')
        .order('total_stars', { ascending: false });
      if (error) throw error;

      const userIds = (profiles ?? []).map(p => p.user_id);
      const { data: users } = userIds.length
        ? await supabase.from('profiles').select('id,full_name,email,role,avatar_url,avatar_key').in('id', userIds)
        : { data: [] as any[] };

      // Also pull "everyone internal" so the gallery shows users w/o gamification rows
      const { data: allInternal } = await supabase
        .from('profiles')
        .select('id,full_name,email,role,avatar_url,avatar_key')
        .neq('role', 'client');

      const profMap = new Map((profiles ?? []).map(p => [p.user_id, p]));
      const merged = (allInternal ?? [])
        .map(u => {
          const p = profMap.get(u.id);
          return {
            user_id: u.id,
            full_name: u.full_name || u.email || 'Sem nome',
            email: u.email,
            role: u.role,
            avatar_url: u.avatar_url,
            avatar_key: (u as any).avatar_key ?? null,
            total_stars: p?.total_stars ?? 0,
            current_level: p?.current_level ?? 'Colaborador',
            leader_stars_count: p?.leader_stars_count ?? 0,
          };
        }).sort((a, b) => b.total_stars - a.total_stars)
        .map((u, i) => ({ ...u, ranking_position: i + 1 }));

      return merged;
    },
  });
}

export function useMyGamificationProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['gam', 'my-profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gamification_profiles')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle();
      return data;
    },
  });
}

export function usePins() {
  return useQuery({
    queryKey: ['gam', 'pins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_pins')
        .select('*')
        .order('category')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUserPins(userId?: string) {
  return useQuery({
    queryKey: ['gam', 'user-pins', userId ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('gamification_user_pins').select('*');
      if (userId) q = q.eq('user_id', userId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMissions() {
  return useQuery({
    queryKey: ['gam', 'missions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_missions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRewards() {
  return useQuery({
    queryKey: ['gam', 'rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_rewards')
        .select('*')
        .order('stars_cost');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRedemptions() {
  return useQuery({
    queryKey: ['gam', 'redemptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_reward_redemptions')
        .select('*, reward:gamification_rewards(name,category)')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLeaderStars() {
  return useQuery({
    queryKey: ['gam', 'leader-stars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_leader_stars')
        .select('*')
        .order('awarded_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePoints() {
  return useQuery({
    queryKey: ['gam', 'points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_points')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ============= Mutations =============
export function useAwardStars() {
  const qc = useQueryClient();
  const awardPoints = useServerFn(awardGamificationPoints);
  return useMutation({
    mutationFn: async (input: { user_id: string; points_amount: number; reason: string }) => {
      await awardPoints({ data: input });
    },
    onSuccess: () => {
      toast.success('Pontos de Caça concedidos!');
      qc.invalidateQueries({ queryKey: ['gam'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao conceder pontos'),
  });
}

export function useSetUserLevel() {
  const qc = useQueryClient();
  const setLevelFn = useServerFn(setGamificationUserLevel);
  return useMutation({
    mutationFn: async (input: { user_id: string; level_name: string }) => {
      await setLevelFn({ data: input });
    },
    onSuccess: () => {
      toast.success('Nível atualizado!');
      qc.invalidateQueries({ queryKey: ['gam'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao atualizar nível'),
  });
}

export function useAwardPin() {
  const qc = useQueryClient();
  const awardPinFn = useServerFn(awardGamificationPin);
  return useMutation({
    mutationFn: async (input: { user_id: string; pin_id: string }) => {
      await awardPinFn({ data: input });
    },
    onSuccess: () => {
      toast.success('Selo concedido ao lobo!');
      qc.invalidateQueries({ queryKey: ['gam'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao conceder selo'),
  });
}

export function useRevokePin() {
  const qc = useQueryClient();
  const revokePinFn = useServerFn(revokeGamificationPin);
  return useMutation({
    mutationFn: async (input: { user_id: string; pin_id: string }) => {
      await revokePinFn({ data: input });
    },
    onSuccess: () => {
      toast.success('Selo removido');
      qc.invalidateQueries({ queryKey: ['gam'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao remover selo'),
  });
}

export function useAwardLeaderStar() {
  const qc = useQueryClient();
  const awardLeaderStarFn = useServerFn(awardGamificationLeaderStar);
  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      title?: string;
      reason: string;
      category: LeaderCategory;
      rarity: Rarity;
      bonus_stars: number;
      public_message?: string;
      internal_note?: string;
    }) => {
      await awardLeaderStarFn({ data: input });
    },
    onSuccess: () => {
      toast.success('Estrela do Líder concedida!');
      qc.invalidateQueries({ queryKey: ['gam'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao conceder Estrela do Líder'),
  });
}

export function useCreateMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; category?: string; stars_reward: number; deadline?: string; criteria?: string; subtasks?: string[] }) => {
      const { subtasks, ...mission } = input;
      const { data, error } = await supabase.from('gamification_missions').insert(mission).select('id').single();
      if (error) throw error;
      const cleanSubs = (subtasks ?? []).map(s => s.trim()).filter(Boolean);
      if (data && cleanSubs.length > 0) {
        const rows = cleanSubs.map((title, i) => ({ mission_id: data.id, title, position: i }));
        const { error: subErr } = await (supabase as any).from('gamification_mission_subtasks').insert(rows);
        if (subErr) throw subErr;
      }
    },
    onSuccess: () => {
      toast.success('Missão criada!');
      qc.invalidateQueries({ queryKey: ['gam', 'missions'] });
      qc.invalidateQueries({ queryKey: ['gam', 'mission_subtasks'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export type MissionSubtask = {
  id: string;
  mission_id: string;
  title: string;
  description: string | null;
  position: number;
  claimed_by: string | null;
  claimed_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  status: 'open' | 'claimed' | 'completed';
  due_date: string | null;
};


export function useMissionSubtasks() {
  return useQuery({
    queryKey: ['gam', 'mission_subtasks'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gamification_mission_subtasks')
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as MissionSubtask[];
    },
  });
}

export function useClaimSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (subtaskId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada');
      const { error } = await (supabase as any)
        .from('gamification_mission_subtasks')
        .update({ claimed_by: user.id, claimed_at: new Date().toISOString(), status: 'claimed' })
        .eq('id', subtaskId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Você puxou essa atividade!'); qc.invalidateQueries({ queryKey: ['gam', 'mission_subtasks'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useReleaseSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (subtaskId: string) => {
      const { error } = await (supabase as any)
        .from('gamification_mission_subtasks')
        .update({ claimed_by: null, claimed_at: null, status: 'open' })
        .eq('id', subtaskId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gam', 'mission_subtasks'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCompleteSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (subtaskId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada');
      const { error } = await (supabase as any)
        .from('gamification_mission_subtasks')
        .update({ status: 'completed', completed_by: user.id, completed_at: new Date().toISOString() })
        .eq('id', subtaskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Subtarefa concluída! +100 pontos 🌟');
      qc.invalidateQueries({ queryKey: ['gam', 'mission_subtasks'] });
      qc.invalidateQueries({ queryKey: ['gam', 'profiles'] });
      qc.invalidateQueries({ queryKey: ['gam', 'points'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAddSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { mission_id: string; title: string; due_date?: string | null }) => {
      const { error } = await (supabase as any)
        .from('gamification_mission_subtasks')
        .insert({ mission_id: input.mission_id, title: input.title, due_date: input.due_date ?? null });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gam', 'mission_subtasks'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; title?: string; due_date?: string | null; description?: string | null }) => {
      const { id, ...patch } = input;
      const { error } = await (supabase as any)
        .from('gamification_mission_subtasks')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gam', 'mission_subtasks'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; description?: string | null; category?: string | null; deadline?: string | null; criteria?: string | null; status?: string }) => {
      const { id, ...patch } = input;
      const { error } = await (supabase as any)
        .from('gamification_missions')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Missão atualizada'); qc.invalidateQueries({ queryKey: ['gam', 'missions'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('gamification_missions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Missão removida');
      qc.invalidateQueries({ queryKey: ['gam', 'missions'] });
      qc.invalidateQueries({ queryKey: ['gam', 'mission_subtasks'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}


export function useCreateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; category?: string; stars_cost: number; stock?: number; image_url?: string }) => {
      const { error } = await supabase.from('gamification_rewards').insert(input);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Prêmio criado!'); qc.invalidateQueries({ queryKey: ['gam', 'rewards'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRequestRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reward_id: string; stars_cost: number; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada');
      const { error } = await supabase.from('gamification_reward_redemptions').insert({
        reward_id: input.reward_id,
        user_id: user.id,
        stars_cost: input.stars_cost,
        notes: input.notes,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Resgate solicitado! Aguarde aprovação.'); qc.invalidateQueries({ queryKey: ['gam', 'redemptions'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: 'approved' | 'rejected' | 'delivered'; stars_cost?: number; user_id?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const patch: any = { status: input.status };
      if (input.status === 'approved') {
        patch.approved_by = user?.id;
        patch.approved_at = new Date().toISOString();
        // Debita as estrelas
        if (input.user_id && input.stars_cost) {
          const { error: pErr } = await supabase.from('gamification_points').insert({
            user_id: input.user_id,
            points_amount: -input.stars_cost,
            reason: 'Resgate de prêmio aprovado',
            source_type: 'redemption',
            source_id: input.id,
            awarded_by: user?.id,
          });
          if (pErr) throw pErr;
        }
      }
      if (input.status === 'delivered') {
        patch.delivered_at = new Date().toISOString();
      }
      const { error } = await supabase.from('gamification_reward_redemptions').update(patch).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Resgate atualizado'); qc.invalidateQueries({ queryKey: ['gam'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}
