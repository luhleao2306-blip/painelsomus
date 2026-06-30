import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/use-profile';
import { canUserAward } from '@/lib/gamificacao-store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Activity, Plus, Check, Trophy, Trash2, Crown, Flame, Sparkles,
  Camera, Heart, Pencil, Users, ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { approveHabitWithPoints } from '@/lib/habits.functions';

export const Route = createFileRoute('/gamificacao/habitos')({
  component: Habitos,
});

const CATEGORIES = [
  { value: 'exercicio', label: 'Exercício / Treino' },
  { value: 'leitura', label: 'Leitura / Estudo' },
  { value: 'sono', label: 'Sono / Descanso' },
  { value: 'alimentacao', label: 'Alimentação saudável' },
  { value: 'sobriedade', label: 'Sobriedade / Sem álcool' },
  { value: 'meditacao', label: 'Meditação / Mindfulness' },
  { value: 'outro', label: 'Outro' },
] as const;

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));

type Habit = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  points_weight: number;
  start_date: string;
  end_date: string;
  frequency: string;
  target_checkins: number;
  status: string;
  points_awarded: boolean;
};

type Checkin = {
  id: string; habit_id: string; checkin_date: string; user_id: string;
  created_at: string; proof_url: string; note: string | null;
};
type Follower = { habit_id: string; user_id: string; joined_at: string };
type Award = { habit_id: string; user_id: string; points: number; awarded_at: string };
type ProfileLite = { id: string; full_name: string | null; email: string | null };

function useHabits() {
  return useQuery({
    queryKey: ['gamification_habits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_habits')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Habit[];
    },
  });
}

function useCheckins() {
  return useQuery({
    queryKey: ['gamification_habit_checkins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_habit_checkins')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Checkin[];
    },
  });
}

function useFollowers() {
  return useQuery({
    queryKey: ['gamification_habit_followers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_habit_followers')
        .select('*');
      if (error) throw error;
      return (data ?? []) as Follower[];
    },
  });
}

function useAwards() {
  return useQuery({
    queryKey: ['gamification_habit_awards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_habit_awards')
        .select('*');
      if (error) throw error;
      return (data ?? []) as Award[];
    },
  });
}

function useProfilesLite() {
  return useQuery({
    queryKey: ['profiles_lite'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id,full_name,email');
      if (error) throw error;
      return (data ?? []) as ProfileLite[];
    },
  });
}

function getInitials(name?: string | null, email?: string | null) {
  const base = (name || email || '?').trim();
  return base.split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join('');
}

function Habitos() {
  const { profile, role } = useProfile();
  const isAdmin = canUserAward(profile?.email, role) || role === 'project_manager';
  const { data: habits = [], isLoading } = useHabits();
  const { data: checkins = [] } = useCheckins();
  const { data: followers = [] } = useFollowers();
  const { data: awards = [] } = useAwards();
  const { data: profiles = [] } = useProfilesLite();

  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileLite>();
    profiles.forEach(p => m.set(p.id, p));
    return m;
  }, [profiles]);

  // checkins per (habit, user)
  const checkinsByHabitUser = useMemo(() => {
    const m = new Map<string, number>();
    checkins.forEach(c => {
      const k = `${c.habit_id}::${c.user_id}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return m;
  }, [checkins]);

  const todayKeySet = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const s = new Set<string>();
    checkins.forEach(c => { if (c.checkin_date === today) s.add(`${c.habit_id}::${c.user_id}`); });
    return s;
  }, [checkins]);

  // participants per habit: owner + followers (dedup)
  const participantsByHabit = useMemo(() => {
    const m = new Map<string, string[]>();
    habits.forEach(h => m.set(h.id, [h.user_id]));
    followers.forEach(f => {
      const arr = m.get(f.habit_id) ?? [];
      if (!arr.includes(f.user_id)) arr.push(f.user_id);
      m.set(f.habit_id, arr);
    });
    return m;
  }, [habits, followers]);

  // awarded per (habit, user)
  const awardedSet = useMemo(() => {
    const s = new Set<string>();
    awards.forEach(a => s.add(`${a.habit_id}::${a.user_id}`));
    return s;
  }, [awards]);

  // Ranking: total stars earned via habits
  const vitrine = useMemo(() => {
    const map = new Map<string, { user_id: string; checkins: number; earnedPoints: number; awardsCount: number }>();
    const ensure = (uid: string) => {
      if (!map.has(uid)) map.set(uid, { user_id: uid, checkins: 0, earnedPoints: 0, awardsCount: 0 });
      return map.get(uid)!;
    };
    checkins.forEach(c => { ensure(c.user_id).checkins += 1; });
    awards.forEach(a => {
      const r = ensure(a.user_id);
      r.earnedPoints += a.points;
      r.awardsCount += 1;
    });
    return Array.from(map.values()).sort((a, b) => (b.earnedPoints - a.earnedPoints) || (b.checkins - a.checkins));
  }, [checkins, awards]);

  const recentCheckins = checkins.slice(0, 8);
  const pendingHabits = habits.filter(h => h.status === 'pending_review');
  const myId = profile?.id;
  const visibleHabits = habits.filter(h => h.status !== 'pending_review' || h.user_id === myId || isAdmin);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={<Activity className="h-5 w-5" />} label="Hábitos ativos" value={habits.filter(h => h.status === 'active').length} />
        <Stat icon={<Sparkles className="h-5 w-5" />} label="Aguardando líder" value={pendingHabits.length} />
        <Stat icon={<Check className="h-5 w-5" />} label="Check-ins hoje" value={todayKeySet.size} />
        <Stat icon={<Trophy className="h-5 w-5" />} label="Recompensas pagas" value={awards.length} />
      </div>

      {/* Vitrine */}
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
        <div className="border-b border-border bg-card/60 p-5">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-display text-lg font-semibold">Vitrine da Alcateia</h2>
              <p className="text-sm text-muted-foreground">Ranking dos hábitos saudáveis — quem está honrando os compromissos?</p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-border">
          {vitrine.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">Ainda não há atividade. Lance ou entre em um hábito!</p>
          )}
          {vitrine.slice(0, 8).map((row, idx) => {
            const p = profileMap.get(row.user_id);
            return (
              <div key={row.user_id} className="flex items-center gap-4 p-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${idx === 0 ? 'bg-yellow-400/20 text-yellow-600' : idx === 1 ? 'bg-zinc-300/30 text-zinc-600' : idx === 2 ? 'bg-amber-700/20 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                  {idx + 1}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{getInitials(p?.full_name, p?.email)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p?.full_name ?? p?.email ?? 'Membro'}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.awardsCount} recompensa(s) · {row.checkins} check-ins
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{row.earnedPoints} ⭐</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Feed */}
      {recentCheckins.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <h3 className="font-semibold">Check-ins recentes</h3>
          </div>
          <div className="space-y-2">
            {recentCheckins.map(c => {
              const h = habits.find(hh => hh.id === c.habit_id);
              const p = profileMap.get(c.user_id);
              return (
                <div key={c.id} className="flex items-center gap-3 text-sm">
                  <CheckinThumb proofUrl={c.proof_url} />
                  <span className="font-medium">{p?.full_name ?? 'Alguém'}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="truncate">{h?.title ?? 'hábito'}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Pendentes */}
      {isAdmin && pendingHabits.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="font-display text-lg font-semibold">⏳ Aguardando sua aprovação</h2>
            <p className="text-sm text-muted-foreground">Defina o peso em pontos para ativar o hábito.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {pendingHabits.map(h => (
              <PendingHabitCard key={h.id} habit={h} ownerName={profileMap.get(h.user_id)?.full_name ?? profileMap.get(h.user_id)?.email ?? 'Membro'} />
            ))}
          </div>
        </div>
      )}

      {/* Lista geral de hábitos */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Hábitos da Alcateia</h2>
          <p className="text-sm text-muted-foreground">Crie o seu ou junte-se a um — todos que cumprirem a meta ganham os pontos.</p>
        </div>
        <NewHabit />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {visibleHabits.length === 0 && !isLoading && (
          <Card className="p-6 text-center text-sm text-muted-foreground md:col-span-2">
            Nenhum hábito ainda. Comece com "Treinar 3x/semana", "Ler 1 livro/mês"...
          </Card>
        )}
        {visibleHabits.map(h => {
          const participants = participantsByHabit.get(h.id) ?? [h.user_id];
          const myKey = myId ? `${h.id}::${myId}` : '';
          const myCount = checkinsByHabitUser.get(myKey) ?? 0;
          const checkedToday = !!myId && todayKeySet.has(myKey);
          const isFollowing = participants.includes(myId ?? '');
          const myAwarded = !!myId && awardedSet.has(myKey);
          return (
            <HabitCard
              key={h.id}
              habit={h}
              participants={participants}
              profileMap={profileMap}
              myCount={myCount}
              checkedToday={checkedToday}
              isFollowing={isFollowing}
              myAwarded={myAwarded}
              isOwner={h.user_id === myId}
              isAdmin={isAdmin}
            />
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function PendingHabitCard({ habit, ownerName }: { habit: Habit; ownerName: string }) {
  const qc = useQueryClient();
  const approveFn = useServerFn(approveHabitWithPoints);
  const [points, setPoints] = useState(30);

  const approve = useMutation({
    mutationFn: async () => approveFn({ data: { habit_id: habit.id, points_weight: points } }),
    onSuccess: () => {
      toast.success(`Hábito aprovado com ${points} pontos.`);
      qc.invalidateQueries({ queryKey: ['gamification_habits'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro'),
  });

  return (
    <Card className="p-5 space-y-3 border-yellow-500/40 bg-yellow-500/5">
      <div>
        <p className="text-xs text-muted-foreground">{ownerName} propõe</p>
        <h3 className="font-semibold">{habit.title}</h3>
        <Badge variant="outline" className="mt-1">{CATEGORY_LABEL[habit.category] ?? habit.category}</Badge>
        {habit.description && <p className="mt-2 text-sm text-muted-foreground">{habit.description}</p>}
        <p className="mt-2 text-xs text-muted-foreground">
          Meta: {habit.target_checkins} check-ins ({habit.frequency === 'daily' ? 'diário' : 'semanal'}) · até {new Date(habit.end_date).toLocaleDateString('pt-BR')}
        </p>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs">Pontos ao concluir</Label>
          <Input type="number" min={1} value={points} onChange={e => setPoints(Number(e.target.value))} />
        </div>
        <Button disabled={approve.isPending || points < 1} onClick={() => approve.mutate()}>
          <Check className="mr-1 h-4 w-4" /> Aprovar
        </Button>
      </div>
    </Card>
  );
}

function HabitCard({
  habit, participants, profileMap, myCount, checkedToday, isFollowing, myAwarded, isOwner, isAdmin,
}: {
  habit: Habit;
  participants: string[];
  profileMap: Map<string, ProfileLite>;
  myCount: number;
  checkedToday: boolean;
  isFollowing: boolean;
  myAwarded: boolean;
  isOwner: boolean;
  isAdmin: boolean;
}) {
  const { profile } = useProfile();
  const qc = useQueryClient();
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const ownerProfile = profileMap.get(habit.user_id);

  const join = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Usuário não identificado.');
      const { error } = await supabase
        .from('gamification_habit_followers')
        .insert({ habit_id: habit.id, user_id: profile.id });
      if (error && !String(error.message).includes('duplicate')) throw error;
    },
    onSuccess: () => {
      toast.success('Você entrou neste hábito! Bons check-ins 💪');
      qc.invalidateQueries({ queryKey: ['gamification_habit_followers'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro'),
  });

  const leave = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Usuário não identificado.');
      const { error } = await supabase
        .from('gamification_habit_followers')
        .delete()
        .eq('habit_id', habit.id)
        .eq('user_id', profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Você saiu do hábito.');
      qc.invalidateQueries({ queryKey: ['gamification_habit_followers'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro'),
  });

  const claim = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('claim_habit_reward', { _habit_id: habit.id });
      if (error) throw error;
      return data?.[0];
    },
    onSuccess: (res: any) => {
      if (res?.awarded) {
        toast.success(`+${res.points} ⭐ creditados!`);
      } else {
        toast.error(res?.message ?? 'Não foi possível receber a recompensa.');
      }
      qc.invalidateQueries({ queryKey: ['gamification_habit_awards'] });
      qc.invalidateQueries({ queryKey: ['gamification_habits'] });
      qc.invalidateQueries({ queryKey: ['gamification_profiles'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro'),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('gamification_habits').delete().eq('id', habit.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Hábito removido.');
      qc.invalidateQueries({ queryKey: ['gamification_habits'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro'),
  });

  const target = Math.max(1, habit.target_checkins);
  const myProgress = Math.min(100, Math.round((myCount / target) * 100));
  const reachedGoal = myCount >= target;
  const isPending = habit.status === 'pending_review';
  const isActive = habit.status === 'active';
  const canEdit = (isOwner || isAdmin) && habit.status !== 'completed';

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{habit.title}</h3>
            <Badge variant="outline">{CATEGORY_LABEL[habit.category] ?? habit.category}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            por {ownerProfile?.full_name ?? ownerProfile?.email ?? 'Membro'}
            {isOwner && ' (você)'}
          </p>
          {habit.description && <p className="mt-2 text-sm text-muted-foreground">{habit.description}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={habit.status === 'completed' ? 'default' : isActive ? 'secondary' : 'outline'}>
            {habit.status === 'completed' ? 'Concluído' : isActive ? 'Ativo' : isPending ? 'Aguardando líder' : habit.status}
          </Badge>
          {canEdit && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditOpen(true)} title="Editar">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Participantes */}
      <div className="flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex -space-x-2">
          {participants.slice(0, 5).map(uid => {
            const p = profileMap.get(uid);
            return (
              <Avatar key={uid} className="h-6 w-6 border-2 border-card">
                <AvatarFallback className="text-[10px]">{getInitials(p?.full_name, p?.email)}</AvatarFallback>
              </Avatar>
            );
          })}
        </div>
        {participants.length > 5 && (
          <span className="text-xs text-muted-foreground">+{participants.length - 5}</span>
        )}
        <span className="text-xs text-muted-foreground ml-1">{participants.length} participante(s)</span>
      </div>

      {/* Progresso individual */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Seu progresso: {myCount}/{target} · {habit.frequency === 'daily' ? 'diário' : 'semanal'}</span>
          <span className="font-semibold text-primary">
            {isPending ? 'A definir' : `+${habit.points_weight} ⭐`}
          </span>
        </div>
        <Progress value={myProgress} className="h-2" />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Até {new Date(habit.end_date).toLocaleDateString('pt-BR')}</span>
        {myAwarded && <Badge variant="secondary" className="text-[10px]">Recompensa recebida</Badge>}
      </div>

      {isActive && (
        <div className="flex flex-wrap gap-2 pt-1">
          {!isFollowing && !isOwner && (
            <Button size="sm" variant="default" disabled={join.isPending} onClick={() => join.mutate()}>
              <Heart className="mr-1 h-4 w-4" /> Aderir
            </Button>
          )}
          {(isFollowing || isOwner) && (
            <>
              <Button
                size="sm"
                variant={checkedToday ? 'secondary' : 'default'}
                disabled={checkedToday}
                onClick={() => setCheckinOpen(true)}
                className="flex-1 min-w-[140px]"
              >
                <Camera className="mr-1 h-4 w-4" />
                {checkedToday ? 'Check-in feito hoje' : 'Check-in com foto'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!reachedGoal || myAwarded || claim.isPending}
                onClick={() => claim.mutate()}
                title={!reachedGoal ? `Faltam ${target - myCount} check-ins` : myAwarded ? 'Já recebido' : ''}
              >
                <Trophy className="mr-1 h-4 w-4" />
                {myAwarded ? 'Recebido' : 'Receber +' + habit.points_weight}
              </Button>
              {!isOwner && (
                <Button size="sm" variant="ghost" onClick={() => leave.mutate()} title="Sair do hábito">
                  Sair
                </Button>
              )}
            </>
          )}
          {isOwner && (
            <Button size="icon" variant="ghost" onClick={() => { if (confirm('Remover este hábito?')) remove.mutate(); }} title="Remover">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      {isPending && isOwner && (
        <div className="pt-1 flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => remove.mutate()}>
            <Trash2 className="mr-1 h-4 w-4" /> Cancelar proposta
          </Button>
        </div>
      )}

      <HabitCheckinDialog
        open={checkinOpen}
        onOpenChange={setCheckinOpen}
        habit={habit}
      />
      <EditHabitDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        habit={habit}
        isAdmin={isAdmin}
      />
    </Card>
  );
}

function HabitCheckinDialog({
  open, onOpenChange, habit,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; habit: Habit;
}) {
  const { profile } = useProfile();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) { setFile(null); setPreview(null); setNote(''); }
  }, [open]);

  const handleFile = (f: File | null) => {
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const submit = async () => {
    if (!profile?.id) { toast.error('Usuário não identificado.'); return; }
    if (!file) { toast.error('Envie uma foto como prova do check-in.'); return; }
    if (!file.type.startsWith('image/')) { toast.error('O arquivo deve ser uma imagem.'); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error('Imagem muito grande (máx 8MB).'); return; }
    setSubmitting(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const today = new Date().toISOString().slice(0, 10);
      const path = `${profile.id}/${habit.id}/${today}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('habit-proofs')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('gamification_habit_checkins').insert({
        habit_id: habit.id,
        user_id: profile.id,
        checkin_date: today,
        proof_url: path,
        note: note || null,
      });
      if (insErr) {
        await supabase.storage.from('habit-proofs').remove([path]);
        throw insErr;
      }
      toast.success('Check-in registrado com foto! 📸');
      qc.invalidateQueries({ queryKey: ['gamification_habit_checkins'] });
      onOpenChange(false);
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      toast.error(msg.includes('duplicate') ? 'Você já fez check-in hoje neste hábito.' : (msg || 'Erro ao registrar check-in.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Check-in com foto — {habit.title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Anexe a foto como prova (ex.: foto na academia, livro lido, prato saudável...).
          </p>
          <div
            className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition"
            onClick={() => fileRef.current?.click()}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="mx-auto max-h-60 rounded" />
            ) : (
              <div className="py-6">
                <Camera className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm">Clique para escolher ou tirar uma foto</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, WEBP — até 8MB</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <Label>Nota (opcional)</Label>
            <Textarea placeholder="Conte algo sobre o check-in..." value={note} onChange={e => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting || !file}>
            {submitting ? 'Enviando...' : 'Registrar check-in'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditHabitDialog({
  open, onOpenChange, habit, isAdmin,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; habit: Habit; isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: habit.title,
    description: habit.description ?? '',
    category: habit.category,
    frequency: habit.frequency,
    target_checkins: habit.target_checkins,
    end_date: habit.end_date,
    points_weight: habit.points_weight,
  });

  useEffect(() => {
    if (open) {
      setForm({
        title: habit.title,
        description: habit.description ?? '',
        category: habit.category,
        frequency: habit.frequency,
        target_checkins: habit.target_checkins,
        end_date: habit.end_date,
        points_weight: habit.points_weight,
      });
    }
  }, [open, habit]);

  const save = useMutation({
    mutationFn: async () => {
      const patch: any = {
        title: form.title,
        description: form.description || null,
        category: form.category,
        frequency: form.frequency,
        target_checkins: form.target_checkins,
        end_date: form.end_date,
      };
      if (isAdmin) patch.points_weight = form.points_weight;
      const { error } = await supabase.from('gamification_habits').update(patch).eq('id', habit.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Hábito atualizado.');
      qc.invalidateQueries({ queryKey: ['gamification_habits'] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar hábito</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequência</Label>
              <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="1x_week">1x na semana</SelectItem>
                  <SelectItem value="2x_week">2x na semana</SelectItem>
                  <SelectItem value="3x_week">3x na semana</SelectItem>
                  <SelectItem value="4x_week">4x na semana</SelectItem>
                  <SelectItem value="5x_week">5x na semana</SelectItem>
                  <SelectItem value="6x_week">6x na semana</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quinzenal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="semiannual">Semestral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Meta de check-ins</Label>
              <Input type="number" min={1} value={form.target_checkins}
                onChange={e => setForm({ ...form, target_checkins: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Data final</Label>
              <Input type="date" value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          {isAdmin && (
            <div>
              <Label>Pontos por participante (líder)</Label>
              <Input type="number" min={1} value={form.points_weight}
                onChange={e => setForm({ ...form, points_weight: Number(e.target.value) })} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!form.title || save.isPending} onClick={() => save.mutate()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckinThumb({ proofUrl }: { proofUrl: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!proofUrl) { setSrc(null); return; }
    (async () => {
      const { data } = await supabase.storage.from('habit-proofs').createSignedUrl(proofUrl, 3600);
      if (!cancelled) setSrc(data?.signedUrl ?? null);
    })();
    return () => { cancelled = true; };
  }, [proofUrl]);
  if (!proofUrl) {
    return <Check className="h-4 w-4 text-green-500 shrink-0" />;
  }
  if (!src) {
    return <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
  return (
    <a href={src} target="_blank" rel="noreferrer" className="shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="prova" className="h-8 w-8 rounded object-cover border border-border" />
    </a>
  );
}

function NewHabit() {
  const { profile } = useProfile();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'outro',
    frequency: 'daily',
    target_checkins: 30,
    end_date: '',
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Usuário não identificado.');
      const today = new Date();
      const endDate = form.end_date || new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);
      const { error } = await supabase.from('gamification_habits').insert({
        user_id: profile.id,
        title: form.title,
        description: form.description || null,
        category: form.category,
        frequency: form.frequency,
        target_checkins: form.target_checkins,
        end_date: endDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Proposta enviada! Aguarde o líder definir os pontos.');
      qc.invalidateQueries({ queryKey: ['gamification_habits'] });
      setOpen(false);
      setForm({ title: '', description: '', category: 'outro', frequency: 'daily', target_checkins: 30, end_date: '' });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro'),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-1 h-4 w-4" /> Lançar hábito</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo hábito saudável</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Você define o compromisso. O líder define quantos pontos vale, e cada participante que cumprir ganha esses pontos.
          </p>
          <div>
            <Label>Hábito</Label>
            <Input
              placeholder="Ex: Treinar 4x por semana"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea
              placeholder="O compromisso, regras, motivação..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequência</Label>
              <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="1x_week">1x na semana</SelectItem>
                  <SelectItem value="2x_week">2x na semana</SelectItem>
                  <SelectItem value="3x_week">3x na semana</SelectItem>
                  <SelectItem value="4x_week">4x na semana</SelectItem>
                  <SelectItem value="5x_week">5x na semana</SelectItem>
                  <SelectItem value="6x_week">6x na semana</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quinzenal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="semiannual">Semestral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Meta de check-ins</Label>
              <Input
                type="number"
                min={1}
                value={form.target_checkins}
                onChange={e => setForm({ ...form, target_checkins: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Data final</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!form.title || create.isPending} onClick={() => create.mutate()}>
            Enviar para aprovação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
