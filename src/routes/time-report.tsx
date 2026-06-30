import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProfile } from '@/hooks/use-profile';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetricCard } from '@/components/design-system/DesignSystem';
import { formatHM } from '@/components/tasks/TaskTimerSection';
import { Clock, Users, Briefcase, ListChecks, Loader2 } from 'lucide-react';

export const Route = createFileRoute('/time-report')({
  component: TimeReportPage,
});

interface Row {
  id: string;
  task_id: string;
  user_id: string;
  duration_seconds: number;
  started_at: string;
  ended_at: string | null;
}

function TimeReportPage() {
  const { role, loading: pLoading } = useProfile();
  const navigate = useNavigate();
  const { tasks, clients, projects } = useData();
  const canView = role === 'master' || role === 'project_manager';

  const [rows, setRows] = useState<Row[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [clientFilter, setClientFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');

  useEffect(() => { if (!pLoading && !canView) navigate({ to: '/dashboard' }); }, [pLoading, canView, navigate]);

  useEffect(() => {
    if (!canView) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase.from('task_time_sessions').select('id, task_id, user_id, duration_seconds, started_at, ended_at');
      if (!active) return;
      setRows((data ?? []) as Row[]);
      const ids = Array.from(new Set((data ?? []).map((r: any) => r.user_id)));
      if (ids.length) {
        const { data: ps } = await supabase.from('profiles').select('id, full_name').in('id', ids);
        const map: Record<string, string> = {};
        (ps ?? []).forEach((p: any) => { map[p.id] = p.full_name ?? 'Usuário'; });
        if (active) setProfilesMap(map);
      }
      setLoading(false);
    };
    load();
    const ch = supabase.channel('time-report').on('postgres_changes', { event: '*', schema: 'public', table: 'task_time_sessions' }, load).subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [canView]);

  const taskMap = useMemo(() => Object.fromEntries(tasks.map(t => [t.id, t])), [tasks]);

  const filtered = useMemo(() => {
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(new Date(to).getTime() + 86400000) : null;
    return rows.filter(r => {
      const t = taskMap[r.task_id];
      if (!t) return false;
      if (clientFilter !== 'all' && t.clientId !== clientFilter) return false;
      if (projectFilter !== 'all' && t.projectId !== projectFilter) return false;
      if (stageFilter !== 'all' && (stageFilter === 'none' ? t.stageId : t.stageId !== stageFilter)) return false;
      if (userFilter !== 'all' && r.user_id !== userFilter) return false;
      const d = new Date(r.started_at);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [rows, taskMap, from, to, clientFilter, projectFilter, stageFilter, userFilter]);

  const total = filtered.reduce((s, r) => s + (r.duration_seconds || 0), 0);

  const groupBy = (keyFn: (r: Row) => string, labelFn: (k: string) => string) => {
    const m = new Map<string, number>();
    for (const r of filtered) {
      const k = keyFn(r);
      m.set(k, (m.get(k) ?? 0) + (r.duration_seconds || 0));
    }
    return Array.from(m.entries()).map(([k, v]) => ({ key: k, label: labelFn(k), seconds: v }))
      .sort((a, b) => b.seconds - a.seconds);
  };

  const byUser = useMemo(() => groupBy(r => r.user_id, k => profilesMap[k] ?? 'Usuário'), [filtered, profilesMap]);
  const byClient = useMemo(() => groupBy(r => taskMap[r.task_id]?.clientId ?? '—', k => clients.find(c => c.id === k)?.name ?? '—'), [filtered, taskMap, clients]);
  const byProject = useMemo(() => groupBy(r => taskMap[r.task_id]?.projectId ?? '—', k => projects.find(p => p.id === k)?.name ?? '—'), [filtered, taskMap, projects]);
  const byTask = useMemo(() => groupBy(r => r.task_id, k => taskMap[k]?.title ?? '—'), [filtered, taskMap]);
  const byStage = useMemo(() => groupBy(r => taskMap[r.task_id]?.stageId ?? 'none', k => {
    if (k === 'none' || !k) return 'Sem fase';
    for (const p of projects) { const s = p.stages?.find((x: any) => x.id === k); if (s) return s.name; }
    return 'Fase';
  }), [filtered, taskMap, projects]);

  const userOptions = useMemo(() => Object.entries(profilesMap), [profilesMap]);
  const stageOptions = useMemo(() => {
    if (projectFilter === 'all') return [];
    return projects.find(p => p.id === projectFilter)?.stages || [];
  }, [projectFilter, projects]);

  if (pLoading || loading) {
    return <MainLayout><div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></MainLayout>;
  }
  if (!canView) return null;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatório de Tempo</h1>
          <p className="text-muted-foreground">Tempo investido por usuário, cliente, projeto, fase e tarefa.</p>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div><Label className="text-xs">De</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div><Label className="text-xs">Até</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
            <div>
              <Label className="text-xs">Cliente</Label>
              <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); setProjectFilter('all'); setStageFilter('all'); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Projeto</Label>
              <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); setStageFilter('all'); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {projects.filter(p => clientFilter === 'all' || p.clientId === clientFilter).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Fase</Label>
              <Select value={stageFilter} onValueChange={setStageFilter} disabled={projectFilter === 'all'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="none">Sem fase</SelectItem>
                  {stageOptions.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Usuário</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {userOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Tempo total" value={formatHM(total)} icon={Clock} />
          <MetricCard title="Sessões" value={filtered.length} icon={ListChecks} />
          <MetricCard title="Usuários" value={byUser.length} icon={Users} />
          <MetricCard title="Tarefas" value={byTask.length} icon={Briefcase} />
        </div>

        <Tabs defaultValue="user">
          <TabsList>
            <TabsTrigger value="user">Por Usuário</TabsTrigger>
            <TabsTrigger value="client">Por Cliente</TabsTrigger>
            <TabsTrigger value="project">Por Projeto</TabsTrigger>
            <TabsTrigger value="stage">Por Fase</TabsTrigger>
            <TabsTrigger value="task">Por Tarefa</TabsTrigger>
          </TabsList>
          <TabsContent value="user"><GroupTable rows={byUser} /></TabsContent>
          <TabsContent value="client"><GroupTable rows={byClient} /></TabsContent>
          <TabsContent value="project"><GroupTable rows={byProject} /></TabsContent>
          <TabsContent value="stage"><GroupTable rows={byStage} /></TabsContent>
          <TabsContent value="task"><GroupTable rows={byTask} /></TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

function GroupTable({ rows }: { rows: { key: string; label: string; seconds: number }[] }) {
  if (!rows.length) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Sem dados para os filtros selecionados.</CardContent></Card>;
  }
  const total = rows.reduce((s, r) => s + r.seconds, 0);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Distribuição</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rows.map(r => {
            const pct = total > 0 ? Math.round((r.seconds / total) * 100) : 0;
            return (
              <div key={r.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate">{r.label}</span>
                  <span className="tabular-nums text-muted-foreground">{formatHM(r.seconds)} <span className="text-xs">({pct}%)</span></span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
