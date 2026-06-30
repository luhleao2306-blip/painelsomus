import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate, useRouter, Link } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, PriorityBadge, TimelineStages } from '@/components/design-system/DesignSystem';
import { useData } from '@/contexts/DataContext';
import {
  ArrowLeft, Briefcase, Calendar, User, Users, Flag, Activity,
  LayoutDashboard, CheckSquare, Layers, FileText, NotebookPen, Package, GanttChart,
  Circle, CheckCircle2, UserCheck,
} from 'lucide-react';

export const Route = createFileRoute('/clientes/$clienteId/projetos/$projetoId')({
  component: ProjectInternalPage,
});


function ProjectInternalPage() {
  const { clienteId, projetoId } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const { projects, clients, tasks, documents, minutes, deliverables } = useData();

  const project = projects.find(p => p.id === projetoId);
  const client = clients.find(c => c.id === clienteId);

  if (!project) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
          <h1 className="text-2xl font-black">Projeto não encontrado</h1>
          <p className="text-muted-foreground text-sm">
            O projeto solicitado não existe ou foi removido.
          </p>
          <Button onClick={() => navigate({ to: '/projects' })}>Voltar para Projetos</Button>
        </div>
      </MainLayout>
    );
  }

  const currentStage = project.stages?.[project.currentStageIndex];
  const projectTasks = tasks.filter(t => t.projectId === projetoId);
  const projectDocs = documents.filter(d => d.projectId === projetoId);
  const projectMinutes = minutes.filter(m => m.projectId === projetoId);
  const projectDeliverables = deliverables.filter(d => d.projectId === projetoId);

  const handleBack = () => {
    if (window.history.length > 1) router.history.back();
    else navigate({ to: '/clients/$clientId', params: { clientId: clienteId } });
  };

  return (
    <MainLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Back + breadcrumb */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Link to="/clients" className="hover:text-foreground">Clientes</Link>
            <span>/</span>
            {client ? (
              <Link
                to="/clients/$clientId"
                params={{ clientId: clienteId }}
                className="hover:text-foreground"
              >
                {client.name}
              </Link>
            ) : (
              <span>Cliente</span>
            )}
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-[200px]">{project.name}</span>
          </div>
        </div>

        {/* Header */}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Briefcase className="h-7 w-7" />
            </div>
            <div className="min-w-0 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Projeto
              </p>
              <h1 className="truncate text-2xl sm:text-3xl font-black tracking-tight">
                {project.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={project.status} />
                <PriorityBadge priority={project.priority} />
              </div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="overview" className="gap-2"><LayoutDashboard className="h-4 w-4" /> Visão Geral</TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2"><CheckSquare className="h-4 w-4" /> Tarefas</TabsTrigger>
            <TabsTrigger value="phases" className="gap-2"><Layers className="h-4 w-4" /> Fases</TabsTrigger>
            <TabsTrigger value="documents" className="gap-2"><FileText className="h-4 w-4" /> Documentos</TabsTrigger>
            <TabsTrigger value="minutes" className="gap-2"><NotebookPen className="h-4 w-4" /> Atas</TabsTrigger>
            <TabsTrigger value="deliverables" className="gap-2"><Package className="h-4 w-4" /> Entregáveis</TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2"><GanttChart className="h-4 w-4" /> Cronograma</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoCard icon={User} label="Cliente" value={client?.name || 'Sem cliente'} />
              <InfoCard icon={Users} label="Responsável" value={project.managerName || project.consultantId || 'Não definido'} />
              <InfoCard icon={Activity} label="Fase atual" value={currentStage?.name || 'Não definida'} />
              <InfoCard icon={Calendar} label="Prazo" value={project.deadline ? new Date(project.deadline).toLocaleDateString() : 'Sem prazo'} />
              <InfoCard icon={Calendar} label="Início" value={project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Não definido'} />
              <InfoCard icon={Flag} label="Prioridade" value={project.priority} />
            </div>

            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Progresso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <span className="text-4xl font-black tracking-tight">{project.progress}%</span>
                  <span className="text-xs text-muted-foreground font-medium">
                    Fase {project.currentStageIndex + 1} de {project.stages?.length || 0}
                  </span>
                </div>
                <Progress value={project.progress} className="h-2.5" />
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Descrição do projeto</CardTitle>
              </CardHeader>
              <CardContent>
                {project.description ? (
                  <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{project.description}</p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Nenhuma descrição cadastrada para este projeto.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tarefas */}
          <TabsContent value="tasks">
            <ProjectTasksTab tasks={projectTasks} stages={project.stages || []} />
          </TabsContent>

          {/* Fases */}
          <TabsContent value="phases">
            <PhasesTab
              stages={project.stages || []}
              currentStageIndex={project.currentStageIndex}
              tasks={projectTasks}
            />
          </TabsContent>


          {/* Documentos */}
          <TabsContent value="documents">
            <SectionList
              emptyIcon={FileText}
              emptyLabel="Nenhum documento vinculado a este projeto."
              items={projectDocs.map(d => ({
                id: d.id,
                title: d.name,
                subtitle: d.category || 'Documento',
                badge: d.visibleToClient ? 'Visível ao cliente' : 'Interno',
              }))}
            />
          </TabsContent>

          {/* Atas */}
          <TabsContent value="minutes">
            <SectionList
              emptyIcon={NotebookPen}
              emptyLabel="Nenhuma ata registrada para este projeto."
              items={projectMinutes.map(m => ({
                id: m.id,
                title: m.title,
                subtitle: `${m.attendees?.length ?? 0} participantes`,
                meta: m.date ? new Date(m.date).toLocaleDateString() : '—',
                ataId: m.id,
              }))}
            />
          </TabsContent>

          {/* Entregáveis */}
          <TabsContent value="deliverables">
            <SectionList
              emptyIcon={Package}
              emptyLabel="Nenhum entregável cadastrado."
              items={projectDeliverables.map(d => ({
                id: d.id,
                title: d.name,
                subtitle: d.type || 'Entregável',
                badge: d.status,
                meta: d.forecastDate ? new Date(d.forecastDate).toLocaleDateString() : '—',
              }))}
            />
          </TabsContent>

          {/* Cronograma */}
          <TabsContent value="timeline">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Cronograma de Fases</CardTitle>
              </CardHeader>
              <CardContent>
                {(project.stages?.length ?? 0) === 0 ? (
                  <p className="text-sm italic text-muted-foreground text-center py-6">Cronograma indisponível — nenhuma fase cadastrada.</p>
                ) : (
                  <TimelineStages
                    stages={project.stages}
                    currentStageIndex={project.currentStageIndex}
                    progress={project.progress}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

function SectionList({
  items,
  emptyIcon: Icon,
  emptyLabel,
}: {
  items: { id: string; title: string; subtitle?: string; badge?: string; meta?: string; ataId?: string }[];
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <Card className="border-border/60 border-dashed">
        <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
          <Icon className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {items.map(i => {
        const inner = (
          <Card className="border-border/60 hover:border-primary/30 transition-colors">
            <CardContent className="p-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{i.title}</p>
                {i.subtitle && <p className="text-xs text-muted-foreground truncate">{i.subtitle}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {i.meta && <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{i.meta}</span>}
                {i.badge && <Badge variant="secondary" className="text-[10px]">{i.badge}</Badge>}
              </div>
            </CardContent>
          </Card>
        );
        if (i.ataId) {
          return (
            <Link key={i.id} to="/atas/$ataId" params={{ ataId: i.ataId }} className="block">
              {inner}
            </Link>
          );
        }
        return <div key={i.id}>{inner}</div>;
      })}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground/70">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-sm font-semibold text-foreground truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

type StageLite = { id: string; name: string; description?: string | null; order?: number; status?: string | null; responsible?: string | null; approver?: string | null; deadline?: string | null };
type TaskLite = {
  id: string;
  title: string;
  assignee: string | null;
  status: string;
  priority?: string | null;
  type?: string | null;
  deadline: string | null;
  stageId: string | null;
  delayType?: string | null;
};

function ProjectTasksTab({ tasks, stages }: { tasks: TaskLite[]; stages: StageLite[] }) {
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<string>('all');
  const [delayFilter, setDelayFilter] = useState<string>('all');

  const stageNameById = useMemo(() => {
    const map = new Map<string, string>();
    stages.forEach(s => map.set(s.id, s.name));
    return map;
  }, [stages]);

  const assigneeOptions = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => { if (t.assignee) set.add(t.assignee); });
    return Array.from(set).sort();
  }, [tasks]);

  const isWithin = (deadline: string | null, range: string) => {
    if (range === 'all') return true;
    if (range === 'none') return !deadline;
    if (!deadline) return false;
    const d = new Date(deadline);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (range === 'overdue') return d < today;
    if (range === 'today') return d.toDateString() === now.toDateString();
    if (range === 'week') { const x = new Date(today); x.setDate(x.getDate() + 7); return d >= today && d <= x; }
    if (range === 'month') { const x = new Date(today); x.setDate(x.getDate() + 30); return d >= today && d <= x; }
    return true;
  };

  const visible = useMemo(() => tasks.filter(t => {
    const mStage = stageFilter === 'all' || (stageFilter === 'none' ? !t.stageId : t.stageId === stageFilter);
    const mAssignee = assigneeFilter === 'all' || t.assignee === assigneeFilter;
    const mStatus = statusFilter === 'all' || t.status === statusFilter;
    const mPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const mType = typeFilter === 'all' || t.type === typeFilter;
    const mDeadline = isWithin(t.deadline, deadlineFilter);
    let mDelay = true;
    if (delayFilter === 'overdue') mDelay = !!t.delayType;
    else if (delayFilter === 'client') mDelay = t.delayType === 'Cliente';
    else if (delayFilter === 'team') mDelay = t.delayType === 'Time';
    return mStage && mAssignee && mStatus && mPriority && mType && mDeadline && mDelay;
  }), [tasks, stageFilter, assigneeFilter, statusFilter, priorityFilter, typeFilter, deadlineFilter, delayFilter]);

  const grouped = useMemo(() => {
    const groups: { stageId: string | null; stageName: string; tasks: TaskLite[] }[] = [];
    stages.forEach(s => {
      const its = visible.filter(t => t.stageId === s.id);
      if (its.length > 0) groups.push({ stageId: s.id, stageName: s.name, tasks: its });
    });
    const orphan = visible.filter(t => !t.stageId);
    if (orphan.length > 0) groups.push({ stageId: null, stageName: 'Sem fase', tasks: orphan });
    return groups;
  }, [visible, stages]);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-card/60 border border-border/50 rounded-2xl space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Briefcase className="h-3.5 w-3.5" />
          <span className="font-bold uppercase tracking-wider">Projeto travado neste contexto</span>
          <span className="ml-auto">{visible.length} tarefa(s)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Fase" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as fases</SelectItem>
              <SelectItem value="none">Sem fase</SelectItem>
              {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos responsáveis</SelectItem>
              {assigneeOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {['Backlog','A fazer','Em andamento','Aguardando cliente','Aguardando time','Em revisão','Aprovado','Concluído','Cancelado'].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              {['Baixa','Média','Alta','Crítica'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Demanda" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas demandas</SelectItem>
              <SelectItem value="Cliente">Demanda do cliente</SelectItem>
              <SelectItem value="Time">Demanda do time</SelectItem>
              <SelectItem value="Aprovação">Aprovação</SelectItem>
            </SelectContent>
          </Select>
          <Select value={deadlineFilter} onValueChange={setDeadlineFilter}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Prazo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer prazo</SelectItem>
              <SelectItem value="overdue">Vencidas</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Próximos 7 dias</SelectItem>
              <SelectItem value="month">Próximos 30 dias</SelectItem>
              <SelectItem value="none">Sem prazo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={delayFilter} onValueChange={setDelayFilter}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Atraso" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="overdue">Atrasadas</SelectItem>
              <SelectItem value="client">Atraso cliente</SelectItem>
              <SelectItem value="team">Atraso time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <Card className="border-border/60 border-dashed">
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <CheckSquare className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhuma tarefa para este filtro.</p>
          </CardContent>
        </Card>
      ) : (
        grouped.map(g => (
          <div key={g.stageId ?? 'none'} className="space-y-2">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">{g.stageName}</h3>
              <span className="text-[10px] text-muted-foreground">({g.tasks.length})</span>
            </div>
            <div className="space-y-2">
              {g.tasks.map(t => (
                <Card key={t.id} className="border-border/60">
                  <CardContent className="p-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{t.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Layers className="h-3 w-3" /> {t.stageId ? stageNameById.get(t.stageId) || 'Fase removida' : 'Sem fase'}
                        </Badge>
                        {t.type && <Badge variant="outline" className="text-[10px]">{t.type}</Badge>}
                        {t.priority && <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>}
                        <span className="text-xs text-muted-foreground truncate">{t.assignee || 'Sem responsável'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.deadline && <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{new Date(t.deadline).toLocaleDateString()}</span>}
                      <Badge variant="secondary" className="text-[10px]">{t.status}</Badge>
                      {t.delayType && <Badge variant="destructive" className="text-[10px]">Atrasada</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function PhasesTab({ stages, currentStageIndex, tasks }: { stages: StageLite[]; currentStageIndex: number; tasks: TaskLite[] }) {
  if (stages.length === 0) {
    return (
      <Card className="border-border/60 border-dashed">
        <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
          <Layers className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Nenhuma fase cadastrada.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {stages.map((s, idx) => {
        const done = idx < currentStageIndex;
        const current = idx === currentStageIndex;
        const stageTasks = tasks.filter(t => t.stageId === s.id);
        const stageStatus = s.status || (done ? 'Concluído' : current ? 'Em andamento' : 'Pendente');
        return (
          <Card key={s.id} className={`border ${current ? 'border-primary/40 bg-primary/5' : 'border-border/60'}`}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Circle className={`h-5 w-5 shrink-0 mt-0.5 ${current ? 'text-primary' : 'text-muted-foreground'}`} />
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fase {idx + 1}</span>
                      <p className="text-base font-bold">{s.name}</p>
                    </div>
                    <Badge variant={current ? 'default' : 'secondary'} className="text-[10px]">{stageStatus}</Badge>
                  </div>
                  {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <PhaseMeta icon={User} label="Responsável" value={s.responsible || '—'} />
                    <PhaseMeta icon={UserCheck} label="Aprovador" value={s.approver || '—'} />
                    <PhaseMeta icon={Calendar} label="Prazo" value={s.deadline ? new Date(s.deadline).toLocaleDateString() : '—'} />
                  </div>
                </div>
              </div>

              <div className="pl-8 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Tarefas vinculadas ({stageTasks.length})
                  </span>
                </div>
                {stageTasks.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground">Nenhuma tarefa nesta fase.</p>
                ) : (
                  <div className="space-y-1.5">
                    {stageTasks.map(t => (
                      <div key={t.id} className="flex items-center justify-between gap-3 p-2 rounded-md bg-muted/40 border border-border/40">
                        <div className="min-w-0">
                          <p className="text-sm truncate">{t.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{t.assignee || 'Sem responsável'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {t.deadline && <span className="text-[10px] text-muted-foreground">{new Date(t.deadline).toLocaleDateString()}</span>}
                          <Badge variant="secondary" className="text-[10px]">{t.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PhaseMeta({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
        <p className="text-xs font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

