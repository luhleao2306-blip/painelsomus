import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useData } from '@/contexts/DataContext';
import { useProfile } from '@/hooks/use-profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Building2, User, Tag as TagIcon, Search, AlertCircle, CheckCircle2, Clock, LayoutGrid, Settings2 } from 'lucide-react';
import { StatusBadge, MetricCard, EmptyState } from '@/components/design-system/DesignSystem';
import { StageTemplatesDialog } from '@/components/projects/StageTemplatesDialog';
import { useTaskTypes } from '@/hooks/use-task-types';

function TasksByTypeCard({ tasks }: { tasks: Array<{ type?: string | null }> }) {
  const { types } = useTaskTypes();
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      const k = (t.type ?? '').trim() || 'Sem tipo';
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [tasks]);
  const known = types.map((t) => ({ name: t.name, count: counts.get(t.name) ?? 0 }));
  const knownNames = new Set(types.map((t) => t.name));
  const extras = Array.from(counts.entries())
    .filter(([k]) => !knownNames.has(k))
    .map(([name, count]) => ({ name, count }));
  const rows = [...known, ...extras];
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Tarefas por tipo</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem dados.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <div key={r.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground">{r.count}</span>
                </div>
                <Progress value={(r.count / max) * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/projects-overview')({
  component: ProjectsOverviewPage,
});

function ProjectsOverviewPage() {
  const navigate = useNavigate();
  const { role } = useProfile();
  const { filteredProjects, clients, filteredTasks, loading } = useData();
  const canManage = role === 'master' || role === 'project_manager';

  const [scope, setScope] = useState<'all' | 'cliente' | 'interno'>('all');
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'andamento' | 'atrasados' | 'concluidos'>('all');
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const allTags = useMemo(() => Array.from(new Set(filteredProjects.flatMap(p => p.tags || []))).sort(), [filteredProjects]);
  const today = new Date(); today.setHours(0,0,0,0);

  const projects = useMemo(() => filteredProjects.filter(p => {
    if (scope === 'cliente' && p.isInternal) return false;
    if (scope === 'interno' && !p.isInternal) return false;
    const q = search.toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q)
      || (p.tags || []).some(t => t.toLowerCase().includes(q))
      || (clients.find(c => c.id === p.clientId)?.name.toLowerCase().includes(q) ?? false);
    const matchesTags = tagFilter.length === 0 || tagFilter.every(t => (p.tags || []).includes(t));
    const overdue = !!p.deadline && new Date(p.deadline) < today && p.status !== 'Concluído';
    let matchesStatus = true;
    if (statusFilter === 'andamento') matchesStatus = p.status === 'Em andamento';
    else if (statusFilter === 'atrasados') matchesStatus = overdue;
    else if (statusFilter === 'concluidos') matchesStatus = p.status === 'Concluído';
    return matchesSearch && matchesTags && matchesStatus;
  }), [filteredProjects, scope, search, tagFilter, statusFilter, today, clients]);

  const kpis = useMemo(() => {
    const all = filteredProjects;
    const internos = all.filter(p => p.isInternal);
    const cliente = all.filter(p => !p.isInternal);
    const ativos = all.filter(p => ['Em andamento','Planejamento','Finalizando'].includes(p.status));
    const atrasados = all.filter(p => p.deadline && new Date(p.deadline) < today && p.status !== 'Concluído');
    const concluidos = all.filter(p => p.status === 'Concluído');
    return { total: all.length, internos: internos.length, cliente: cliente.length, ativos: ativos.length, atrasados: atrasados.length, concluidos: concluidos.length };
  }, [filteredProjects, today]);

  const tasksByProject = useMemo(() => {
    const map = new Map<string, { total: number; done: number; overdue: number }>();
    for (const t of filteredTasks) {
      const cur = map.get(t.projectId) || { total: 0, done: 0, overdue: 0 };
      cur.total++;
      if (t.status === 'Concluído') cur.done++;
      if (t.deadline && new Date(t.deadline) < today && !['Concluído','Cancelado'].includes(t.status)) cur.overdue++;
      map.set(t.projectId, cur);
    }
    return map;
  }, [filteredTasks, today]);

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-border/40">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Portfolio</span>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-[34px]">Visão Geral de Projetos</h1>
            <p className="text-sm text-muted-foreground">Acompanhe projetos de clientes e iniciativas internas em um só lugar.</p>
          </div>
          {canManage && (
            <Button variant="outline" onClick={() => setTemplatesOpen(true)} className="gap-2">
              <Settings2 className="h-4 w-4" /> Templates de funil
            </Button>
          )}
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
          <MetricCard title="Total" value={kpis.total} icon={Briefcase} />
          <MetricCard title="Cliente" value={kpis.cliente} icon={User} />
          <MetricCard title="Internos" value={kpis.internos} icon={Building2} />
          <MetricCard title="Ativos" value={kpis.ativos} icon={Clock} />
          <MetricCard title="Atrasados" value={kpis.atrasados} icon={AlertCircle} variant={kpis.atrasados ? 'destructive' : 'default'} />
          <MetricCard title="Concluídos" value={kpis.concluidos} icon={CheckCircle2} />
        </div>

        <TasksByTypeCard tasks={filteredTasks} />

        {/* Filters */}
        <div className="flex flex-col gap-3 p-3 rounded-2xl bg-card/60 border border-border/40 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar por nome, cliente ou tag…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 rounded-xl" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={scope === 'all' ? 'secondary' : 'outline'} onClick={() => setScope('all')}>Todos</Button>
              <Button size="sm" variant={scope === 'cliente' ? 'secondary' : 'outline'} onClick={() => setScope('cliente')}><User className="h-3 w-3 mr-1" />Cliente</Button>
              <Button size="sm" variant={scope === 'interno' ? 'secondary' : 'outline'} onClick={() => setScope('interno')}><Building2 className="h-3 w-3 mr-1" />Internos</Button>
              <div className="w-px bg-border mx-1" />
              <Button size="sm" variant={statusFilter === 'all' ? 'secondary' : 'outline'} onClick={() => setStatusFilter('all')}>Todos status</Button>
              <Button size="sm" variant={statusFilter === 'andamento' ? 'secondary' : 'outline'} onClick={() => setStatusFilter('andamento')}>Em andamento</Button>
              <Button size="sm" variant={statusFilter === 'atrasados' ? 'secondary' : 'outline'} onClick={() => setStatusFilter('atrasados')}>Atrasados</Button>
              <Button size="sm" variant={statusFilter === 'concluidos' ? 'secondary' : 'outline'} onClick={() => setStatusFilter('concluidos')}>Concluídos</Button>
            </div>
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><TagIcon className="h-3 w-3" />Tags:</span>
              {allTags.map(tag => {
                const active = tagFilter.includes(tag);
                return (
                  <button key={tag} type="button" onClick={() => setTagFilter(prev => active ? prev.filter(t => t !== tag) : [...prev, tag])}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}>
                    {tag}
                  </button>
                );
              })}
              {tagFilter.length > 0 && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setTagFilter([])}>Limpar</Button>}
            </div>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">Carregando…</div>
        ) : projects.length === 0 ? (
          <EmptyState icon={Briefcase} title="Nenhum projeto" description="Ajuste os filtros ou crie um novo projeto na aba Projetos." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map(p => {
              const stats = tasksByProject.get(p.id) || { total: 0, done: 0, overdue: 0 };
              const overdue = !!p.deadline && new Date(p.deadline) < today && p.status !== 'Concluído';
              return (
                <Card key={p.id}
                  onClick={() => navigate({ to: '/tasks', search: { projectId: p.id } })}
                  className={`group cursor-pointer rounded-2xl transition-all hover:shadow-lg hover:-translate-y-0.5 border-border/50 ${overdue ? 'border-destructive/30' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {p.isInternal ? (
                          <Badge variant="secondary" className="gap-1 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20"><Building2 className="h-3 w-3" />Interno</Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1"><User className="h-3 w-3" />{clients.find(c => c.id === p.clientId)?.name || 'Sem cliente'}</Badge>
                        )}
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                    <CardTitle className="text-lg font-bold mt-2 line-clamp-2">{p.name}</CardTitle>
                    {p.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description}</p>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(p.tags?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.tags!.map(t => (
                          <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-semibold">
                            <TagIcon className="h-2.5 w-2.5" />{t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div>
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1.5 text-muted-foreground">
                        <span>Progresso</span><span className="text-foreground">{p.progress}%</span>
                      </div>
                      <Progress value={p.progress} className="h-2 rounded-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border/40">
                      <div>
                        <div className="text-lg font-bold">{stats.total}</div>
                        <div className="text-[9px] uppercase font-bold text-muted-foreground">Tarefas</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-emerald-600">{stats.done}</div>
                        <div className="text-[9px] uppercase font-bold text-muted-foreground">Feitas</div>
                      </div>
                      <div>
                        <div className={`text-lg font-bold ${stats.overdue > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{stats.overdue}</div>
                        <div className="text-[9px] uppercase font-bold text-muted-foreground">Atraso</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span>Prazo: <strong className={overdue ? 'text-destructive' : 'text-foreground'}>{p.deadline ? new Date(p.deadline).toLocaleDateString() : '—'}</strong></span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 font-semibold text-primary">
                        Abrir <LayoutGrid className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <StageTemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} />
    </MainLayout>
  );
}
