import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProfile } from '@/hooks/use-profile';
import { useData, Task, Project, Priority } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { LevelSeal } from '@/components/gamificacao/LevelSeal';
import {
  CheckCircle2, Calendar, Flame, Trophy, Target,
  Briefcase, ListChecks, ArrowRight, AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MetricCard, StatusBadge, EmptyState } from '@/components/design-system/DesignSystem';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';
import { ProjectDetailDrawer } from '@/components/projects/ProjectDetailDrawer';
import { DashboardWidgets } from '@/components/dashboard/DashboardWidgets';
import { BirthdayWidget } from '@/components/dashboard/BirthdayWidget';
import { MyGoalWidget } from '@/components/dashboard/MyGoalWidget';
import { AlcateiaNewsFeed } from '@/components/dashboard/AlcateiaNewsFeed';
import { BusinessQuoteBanner } from '@/components/client/BusinessQuoteBanner';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});

interface ProfileLite { id: string; full_name: string | null }

const PRIORITY_RANK: Record<Priority, number> = { Crítica: 0, Alta: 1, Média: 2, Baixa: 3 };
const PRIORITY_STYLE: Record<Priority, string> = {
  Crítica: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300',
  Alta: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300',
  Média: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
  Baixa: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
};

const normalizePersonKey = (value: string | null | undefined) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const splitAssigneeNames = (value: string | null | undefined) => {
  const raw = (value ?? '').trim();
  if (!raw) return [];
  const parts = raw.split(/\s*(?:,|;|\/|\+|&|\be\b)\s*/i).filter(Boolean);
  return Array.from(new Set([raw, ...parts]));
};

const assigneeMatches = (candidate: string, currentUser: string) => {
  const candidateName = normalizePersonKey(candidate);
  const currentName = normalizePersonKey(currentUser);
  if (!candidateName || !currentName) return false;
  if (candidateName === currentName) return true;

  const candidateTokens = candidateName.split(' ').filter(token => token.length >= 3);
  const currentTokens = currentName.split(' ').filter(token => token.length >= 3);
  if (!candidateTokens.length || !currentTokens.length) return false;

  return currentTokens.every(token => candidateTokens.includes(token))
    || candidateTokens.every(token => currentTokens.includes(token));
};

const parseLocalDate = (raw: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(raw);
  date.setHours(0, 0, 0, 0);
  return date;
};

const isAssignedToCurrentUser = (task: Task, profileId?: string, profileName?: string | null) => {
  const myId = normalizePersonKey(profileId);
  const myName = (profileName ?? '').trim();
  const assignees = [
    ...splitAssigneeNames(task.assignee),
    ...(task.assignees ?? []).flatMap(splitAssigneeNames),
  ]
    .filter(Boolean);

  return assignees.some((assignee) =>
    (myId && normalizePersonKey(assignee) === myId) ||
    (myName && assigneeMatches(assignee, myName))
  );
};

function DashboardPage() {
  const { role, profile } = useProfile();
  const { filteredTasks, filteredProjects } = useData();
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [myLevel, setMyLevel] = useState<string | null>(null);
  const [myPins, setMyPins] = useState<Array<{ id: string; name: string; icon: string | null; rarity: string }>>([]);

  useEffect(() => {
    supabase.from('profiles').select('id, full_name').then(({ data }) => {
      if (data) setProfiles(data as ProfileLite[]);
    });
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    supabase.from('gamification_profiles').select('current_level').eq('user_id', profile.id).maybeSingle().then(({ data }) => {
      setMyLevel((data?.current_level as string | undefined) ?? null);
    });
    supabase
      .from('gamification_user_pins')
      .select('pin:gamification_pins(id, name, icon, rarity)')
      .eq('user_id', profile.id)
      .then(({ data }) => {
        const pins = (data ?? [])
          .map((r: { pin: { id: string; name: string; icon: string | null; rarity: string } | null }) => r.pin)
          .filter((p): p is { id: string; name: string; icon: string | null; rarity: string } => !!p);
        setMyPins(pins);
      });
  }, [profile?.id]);

  const me = profile?.id;
  const nameOf = (id?: string | null) => profiles.find(p => p.id === id)?.full_name || '—';
  const projectName = (id?: string) => filteredProjects.find(p => p.id === id)?.name || '—';

  const todayStart = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const next7Days = useMemo(() => { const d = new Date(todayStart); d.setDate(d.getDate() + 7); return d; }, [todayStart]);

  const isOpen = (t: Task) => !['Concluído', 'Cancelado', 'Aprovado'].includes(t.status);
  const isDone = (t: Task) => t.status === 'Concluído';

  const myTasks = useMemo(
    () => (me || profile?.full_name) ? filteredTasks.filter(t => isAssignedToCurrentUser(t, me, profile?.full_name)) : [],
    [filteredTasks, me, profile?.full_name]
  );
  const myOpen = useMemo(() => myTasks.filter(isOpen), [myTasks]);
  const myInProgress = useMemo(() => myTasks.filter(t => t.status === 'Em andamento'), [myTasks]);
  const myDone = useMemo(() => myTasks.filter(isDone), [myTasks]);


  const myFocus = useMemo(() => {
    return myOpen
      .filter(t => t.deadline && parseLocalDate(t.deadline).getTime() <= todayStart.getTime())
      .sort((a, b) => {
        const da = a.deadline ? parseLocalDate(a.deadline).getTime() : 0;
        const db = b.deadline ? parseLocalDate(b.deadline).getTime() : 0;
        return da - db;
      });
  }, [myOpen, todayStart]);

  const myPerf = useMemo(() => {
    const onTime = myDone.filter(t => !t.deadline || parseLocalDate(t.deadline) >= todayStart);
    const dueToday = myOpen.filter(t => t.deadline && parseLocalDate(t.deadline).getTime() === todayStart.getTime());
    const onTimeRate = myDone.length ? Math.round((onTime.length / myDone.length) * 100) : 0;
    return {
      monthDone: myDone.length,
      onTimeRate,
      inProgress: myInProgress.length,
      dueToday: dueToday.length,
      openTotal: myOpen.length,
    };
  }, [myDone, myOpen, myInProgress, todayStart]);


  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Lobo';
  const wolfTitle = /a$/i.test(firstName) ? 'Loba' : 'Lobo';

  if (role === 'client') return <ClientDashboard />;

  return (
    <MainLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Seu dia</span>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-[34px]">
            Bem-vindo{wolfTitle === 'Loba' ? 'a' : ''}, {wolfTitle} {firstName} 👋
          </h1>
          {myLevel && (
            <div className="flex items-center gap-2">
              <LevelSeal levelName={myLevel} size="xs" className="shrink-0" />
              <p className="text-sm font-semibold text-primary">
                {`${wolfTitle} ${myLevel.replace(/^Lobo\s+/i, '').replace(/^Loba\s+/i, '')}`}
              </p>
            </div>
          )}
          {myPins.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {myPins.map(p => (
                <span
                  key={p.id}
                  title={p.name}
                  className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-semibold text-foreground"
                >
                  <span className="text-base leading-none">{p.icon || '📌'}</span>
                  {p.name}
                </span>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground">Foco nas suas tarefas com prazo nos próximos 7 dias.</p>
        </div>


        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 auto-rows-fr">
          <Link to="/tasks" className="block h-full">
            <MetricCard title="Abertas" value={myPerf.openTotal} icon={ListChecks} description="suas tarefas" accent="blue" />
          </Link>
          <Link to="/tasks" className="block h-full">
            <MetricCard
              title="Vencem hoje"
              value={myPerf.dueToday}
              icon={Calendar}
              description="prazo hoje"
              accent="amber"
            />
          </Link>
          <Link to="/tasks" className="block h-full">
            <MetricCard title="Em andamento" value={myPerf.inProgress} icon={Flame} description="ativas agora" accent="violet" />
          </Link>
          <Link to="/tasks" className="block h-full">
            <MetricCard title="Concluídas" value={myPerf.monthDone} icon={Trophy} description={`${myPerf.onTimeRate}% no prazo`} accent="emerald" />
          </Link>
        </div>



        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" /> Foco
              </CardTitle>
              <Badge variant="secondary" className="text-[10px]">{myFocus.length}</Badge>
            </CardHeader>
            <CardContent>
              {myFocus.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Tudo em dia" description="Nenhuma tarefa atrasada ou com vencimento para hoje." />
              ) : (
                <div className="space-y-1.5">
                  {myFocus.slice(0, 6).map((task) => {
                    const dl = task.deadline ? parseLocalDate(task.deadline) : null;
                    const isOverdue = dl && dl.getTime() < todayStart.getTime();
                    return (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/40 transition-colors"
                      >
                        <span className={`h-2 w-2 rounded-full shrink-0 ${isOverdue ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate">{task.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{projectName(task.projectId)}</div>
                        </div>
                        <Badge variant="outline" className={`text-[10px] font-bold shrink-0 ${PRIORITY_STYLE[task.priority]}`}>
                          {task.priority}
                        </Badge>
                        <span className={`text-[11px] font-medium shrink-0 w-20 text-right ${isOverdue ? 'text-rose-600' : 'text-amber-600'}`}>
                          {isOverdue ? 'Atrasada' : 'Hoje'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Concluídas
              </CardTitle>
              <Badge variant="secondary" className="text-[10px]">{myDone.length}</Badge>
            </CardHeader>
            <CardContent>
              {myDone.length === 0 ? (
                <EmptyState icon={Trophy} title="Nenhuma entrega ainda" description="Suas tarefas concluídas aparecerão aqui." />
              ) : (
                <div className="space-y-1.5">
                  {myDone.slice(0, 6).map((task) => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/40 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate line-through decoration-muted-foreground/40">{task.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{projectName(task.projectId)}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                        Concluída
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>


        <div className="grid gap-4 lg:grid-cols-2">
          <AlcateiaNewsFeed />
          <div className="space-y-4">
            <BirthdayWidget />
            {me && <MyGoalWidget userId={me} />}
          </div>
        </div>
        {me && <DashboardWidgets userId={me} />}

      </div>

      <TaskDetailDialog
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(o) => !o && setSelectedTask(null)}
      />
      <ProjectDetailDrawer
        project={selectedProject}
        open={!!selectedProject}
        onOpenChange={(o) => !o && setSelectedProject(null)}
        canManage={role === 'master' || role === 'project_manager'}
      />
    </MainLayout>
  );
}

function ClientDashboard() {
  const navigate = useNavigate();
  const { filteredProjects, filteredTasks, filteredDocuments, filteredContracts, filteredMinutes, getDownloadUrl } = useData();
  const mainProject = filteredProjects[0];
  const contracts = filteredContracts;

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const in30 = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() + 30); return d; }, [today]);

  const stats = useMemo(() => {
    const openTasks = filteredTasks.filter(t => !['Concluído', 'Cancelado'].includes(t.status));
    const inProgressTasks = filteredTasks.filter(t => t.status === 'Em andamento');
    const doneTasks = filteredTasks.filter(t => t.status === 'Concluído');
    const upcomingMeetings = filteredMinutes.filter(m => { const d = new Date(m.date); return d >= today && d <= in30; });
    return { openTasks, inProgressTasks, doneTasks, upcomingMeetings };
  }, [filteredTasks, filteredMinutes, today, in30]);

  const upcomingTasks = useMemo(
    () => stats.openTasks
      .filter(t => t.deadline)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 5),
    [stats.openTasks]
  );

  const upcomingMeetingsList = useMemo(
    () => [...filteredMinutes]
      .filter(m => { const d = new Date(m.date); return d >= today && d <= in30; })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5),
    [filteredMinutes, today, in30]
  );

  const handleOpenContract = async () => {
    const contract = contracts[0];
    if (!contract) return;
    if (contract.filePath) {
      const url = await getDownloadUrl(contract.filePath);
      if (url) { window.open(url, '_blank', 'noopener,noreferrer'); return; }
    }
    if (contract.externalLink) { window.open(contract.externalLink, '_blank', 'noopener,noreferrer'); return; }
    navigate({ to: '/contracts' });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <BusinessQuoteBanner />
        <div className="flex flex-col gap-1 pb-2 border-b border-border/40">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Visão geral</span>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-[34px]">Meu Painel</h1>
          <p className="text-sm text-muted-foreground">Acompanhe seus projetos, cronograma e atas de reunião.</p>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 auto-rows-fr">
          <MetricCard title="Projetos Ativos" value={filteredProjects.length} icon={Briefcase} description="em andamento" accent="indigo" />
          <MetricCard title="Tarefas Abertas" value={stats.openTasks.length} icon={ListChecks} description={`${stats.doneTasks.length} concluídas`} accent="blue" />
          <MetricCard title="Concluídas" value={stats.doneTasks.length} icon={Trophy} description="entregues" accent="emerald" />
          <MetricCard title="Reuniões (30d)" value={stats.upcomingMeetings.length} icon={Calendar} description="próximos 30 dias" accent="violet" />
        </div>


        {mainProject ? (
          <Card
            className="border-border/50 shadow-sm cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => navigate({ to: '/projects/$projectId', params: { projectId: mainProject.id } })}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Em Andamento</span>
                  <CardTitle className="text-lg font-bold mt-1">{mainProject.name}</CardTitle>
                </div>
                <StatusBadge status={mainProject.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider mb-1.5 text-muted-foreground">
                  <span>Progresso geral</span>
                  <span className="text-foreground">{mainProject.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${mainProject.progress}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                <span>Prazo: <strong className="text-foreground">{mainProject.deadline ? new Date(mainProject.deadline).toLocaleDateString() : '—'}</strong></span>
                <span className="inline-flex items-center gap-1 font-semibold text-primary">Abrir <ArrowRight className="h-3 w-3" /></span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyState icon={Briefcase} title="Nada em andamento" description="Você ainda não possui itens vinculados a esta conta." />
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Próximas Tarefas
              </CardTitle>
              <Badge variant="secondary" className="text-[10px]">{upcomingTasks.length}</Badge>
            </CardHeader>
            <CardContent>
              {upcomingTasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-lg">
                  Nenhuma tarefa com prazo definido
                </div>
              ) : (
                <div className="space-y-1.5">
                  {upcomingTasks.map(t => {
                    const d = new Date(t.deadline!);
                    const isOverdue = d < today;
                    return (
                      <button
                        key={t.id}
                        onClick={() => navigate({ to: '/tasks', search: { projectId: undefined } })}
                        className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/50 hover:border-primary/40 transition-colors"
                      >
                        <span className={`h-2 w-2 rounded-full shrink-0 ${isOverdue ? 'bg-destructive' : 'bg-primary'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium truncate">{t.title}</div>
                          <div className="text-[10px] text-muted-foreground">{d.toLocaleDateString()}</div>
                        </div>
                        <Badge variant={isOverdue ? 'destructive' : 'secondary'} className="text-[9px] font-bold shrink-0">
                          {t.status}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Próximas Reuniões
              </CardTitle>
              <Badge variant="secondary" className="text-[10px]">{upcomingMeetingsList.length}</Badge>
            </CardHeader>
            <CardContent>
              {upcomingMeetingsList.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-lg">
                  Nenhuma reunião agendada
                </div>
              ) : (
                <div className="space-y-1.5">
                  {upcomingMeetingsList.map(m => (
                    <button
                      key={m.id}
                      onClick={() => navigate({ to: '/meetings' })}
                      className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/50 hover:border-primary/40 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold uppercase leading-none">{new Date(m.date).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                        <span className="text-sm font-bold leading-none">{new Date(m.date).getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium truncate">{m.title || 'Reunião'}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(m.date).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
