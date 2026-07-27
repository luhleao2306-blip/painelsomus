import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PersonalChecklistPanel } from '@/components/dashboard/PersonalChecklistPanel';
import {
  Sparkles, Activity, Clock3, CalendarDays, Music2, ListTodo, ArrowRight, Crosshair,
} from 'lucide-react';

import { WolfAvatar } from '@/components/WolfAvatar';

type PointRow = { id: string; points_amount: number; reason: string; created_at: string; user_id: string; user: { full_name: string | null; avatar_key: string | null } | null };
type HabitRow = { id: string; checkin_date: string; habit: { title: string; category: string } | null };
type AgendaRow = { id: string; title: string; scheduled_date: string; location: string | null };
type MissionRow = { id: string; name: string; description: string | null; category: string | null; stars_reward: number; deadline: string | null };

function formatSeconds(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h === 0) return `${m}min`;
  return `${h}h ${m.toString().padStart(2, '0')}min`;
}

export function DashboardWidgets({ userId }: { userId: string }) {
  const [points, setPoints] = useState<PointRow[]>([]);
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [agenda, setAgenda] = useState<AgendaRow[]>([]);
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [timeToday, setTimeToday] = useState(0);
  const [timeWeek, setTimeWeek] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);

    (async () => {
      const { data: ptData } = await supabase
        .from('gamification_points')
        .select('id, points_amount, reason, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(8);
      const rows = (ptData ?? []) as Array<{ id: string; points_amount: number; reason: string; created_at: string; user_id: string }>;
      const ids = Array.from(new Set(rows.map(r => r.user_id))).filter(Boolean);
      let profMap: Record<string, { full_name: string | null; avatar_key: string | null }> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_key')
          .in('id', ids);
        profMap = Object.fromEntries((profs ?? []).map((p: { id: string; full_name: string | null; avatar_key: string | null }) => [p.id, { full_name: p.full_name, avatar_key: p.avatar_key }]));
      }
      setPoints(rows.map(r => ({ id: r.id, points_amount: r.points_amount, reason: r.reason, created_at: r.created_at, user_id: r.user_id, user: profMap[r.user_id] ?? null })));
    })();

    supabase
      .from('gamification_habit_checkins')
      .select('id, checkin_date, habit:gamification_habits(title, category)')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false })
      .limit(5)
      .then(({ data }) => setHabits((data as unknown as HabitRow[]) ?? []));

    supabase
      .from('work_schedule_items')
      .select('id, title, scheduled_date, location, schedule:work_schedules!inner(created_by, is_active)')
      .eq('schedule.created_by', userId)
      .eq('schedule.is_active', true)
      .gte('scheduled_date', todayStart.toISOString())
      .order('scheduled_date', { ascending: true })
      .limit(5)
      .then(({ data }) => setAgenda((data as unknown as AgendaRow[]) ?? []));

    supabase
      .from('task_time_sessions')
      .select('duration_seconds, started_at')
      .eq('user_id', userId)
      .gte('started_at', weekStart.toISOString())
      .then(({ data }) => {
        let today = 0; let week = 0;
        (data ?? []).forEach((r: { duration_seconds: number; started_at: string }) => {
          week += r.duration_seconds || 0;
          if (new Date(r.started_at) >= todayStart) today += r.duration_seconds || 0;
        });
        setTimeToday(today); setTimeWeek(week);
      });

    supabase
      .from('gamification_missions')
      .select('id, name, description, category, stars_reward, deadline')
      .eq('status', 'active')
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(5)
      .then(({ data }) => setMissions((data as MissionRow[] | null) ?? []));
  }, [userId]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Caçada da Alcateia - missões coletivas */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-rose-950/20 shadow-sm lg:col-span-2">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-orange-600" />
            Caçada da Alcateia
          </CardTitle>
          <Link to="/gamificacao" className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            ver tudo <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {missions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-amber-500/30 rounded-lg">
              Nenhuma caçada ativa no momento. A próxima missão aparecerá aqui para toda a alcateia.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {missions.map(m => {
                const deadline = m.deadline ? new Date(m.deadline) : null;
                const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86400000) : null;
                return (
                  <div key={m.id} className="rounded-lg border border-amber-500/30 bg-background/70 backdrop-blur p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">{m.name}</div>
                        {m.category && (
                          <div className="text-[10px] uppercase tracking-wider text-orange-700 dark:text-orange-300 font-semibold mt-0.5">{m.category}</div>
                        )}
                      </div>
                      <Badge className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white font-bold">+{m.stars_reward}</Badge>
                    </div>
                    {m.description && (
                      <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">{m.description}</p>
                    )}
                    {deadline && (
                      <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {daysLeft !== null && daysLeft >= 0 ? `${daysLeft}d restantes` : 'encerrada'} · {deadline.toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Últimos pontos do time */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" /> Últimos pontos do time
          </CardTitle>
          <Link to="/gamificacao" className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            ver tudo <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {points.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-lg">Nenhum ponto registrado ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {points.map(p => {
                const name = p.user?.full_name || 'Colaborador';
                return (
                  <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-background">
                    <WolfAvatar
                      avatarKey={p.user?.avatar_key}
                      seed={p.user_id}
                      name={name}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{p.reason}</div>
                    </div>
                    <Badge variant="secondary" className="font-bold shrink-0">+{p.points_amount}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Hábitos lançados */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" /> Hábitos lançados
          </CardTitle>
          <Link to="/gamificacao" className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            ver tudo <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {habits.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-lg">Nenhum check-in recente.</p>
          ) : (
            <div className="space-y-1.5">
              {habits.map(h => (
                <div key={h.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-background">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                    <Activity className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{h.habit?.title || 'Hábito'}</div>
                    <div className="text-[11px] text-muted-foreground capitalize">
                      {h.habit?.category || '—'} · {new Date(h.checkin_date).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Relatório de tempo */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-blue-500" /> Relatório de tempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg border border-border/50 bg-background">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Hoje</div>
              <div className="text-2xl font-bold mt-1">{formatSeconds(timeToday)}</div>
            </div>
            <div className="p-4 rounded-lg border border-border/50 bg-background">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Últimos 7 dias</div>
              <div className="text-2xl font-bold mt-1">{formatSeconds(timeWeek)}</div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Tempo investido nas tarefas via timer.
          </p>
        </CardContent>
      </Card>

      {/* Agenda */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-rose-500" /> Próximos da agenda
          </CardTitle>
          <Link to="/agenda" className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            abrir <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {agenda.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-lg">Nada agendado.</p>
          ) : (
            <div className="space-y-1.5">
              {agenda.map(a => {
                const d = new Date(a.scheduled_date);
                return (
                  <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-background">
                    <div className="h-10 w-10 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] uppercase font-bold leading-none">{d.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                      <span className="text-sm font-bold leading-none">{d.getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{a.title}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        {a.location ? ` · ${a.location}` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Playlist Somus */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Music2 className="h-4 w-4 text-violet-500" /> Playlist Somus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg overflow-hidden border border-border/50 bg-background">
            <iframe
              title="Playlist Somus"
              src="https://open.spotify.com/embed/playlist/7HaBZAiy0tyJrPXyPlXEv1?utm_source=generator&theme=0"
              width="100%"
              height="152"
              frameBorder={0}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Trilha sonora oficial da alcateia para o foco.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
