import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useData } from '@/contexts/DataContext';
import { useAssignableUsers } from '@/components/shared/AssigneeSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MetricCard, EmptyState } from '@/components/design-system/DesignSystem';
import {
  CheckCircle2, Clock, AlertTriangle, ListChecks, Trophy, Users, TrendingUp, Package,
} from 'lucide-react';

const initials = (n: string) =>
  n.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('') || '?';

export const Route = createFileRoute('/team-performance')({
  component: TeamPerformancePage,
});

type MemberStats = {
  name: string;
  avatarUrl: string | null;
  total: number;
  done: number;
  inProgress: number;
  pending: number;
  overdue: number;
  deliveriesDone: number;
  deliveriesTotal: number;
  completionRate: number;
  hoursLogged: number;
};

function TeamPerformancePage() {
  const { tasks, deliverables, clients, projects } = useData();
  const team = useAssignableUsers();

  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('');

  const inPeriod = (dateStr?: string | null) => {
    if (!periodStart && !periodEnd) return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    if (periodStart && d < new Date(periodStart + 'T00:00:00')) return false;
    if (periodEnd && d > new Date(periodEnd + 'T23:59:59')) return false;
    return true;
  };

  const matchesClient = (clientId?: string | null) =>
    clientFilter === 'all' || clientId === clientFilter;

  const filteredTasks = useMemo(
    () => tasks.filter(t =>
      matchesClient(t.clientId) &&
      inPeriod((t as any).updatedAt ?? (t as any).createdAt ?? t.deadline ?? t.startDate),
    ),
    [tasks, clientFilter, periodStart, periodEnd],
  );

  const filteredDeliverables = useMemo(
    () => deliverables.filter(d =>
      matchesClient(d.clientId) &&
      inPeriod((d as any).forecastDate ?? (d as any).createdAt),
    ),
    [deliverables, clientFilter, periodStart, periodEnd],
  );

  const stats: MemberStats[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return team.map(member => {
      const name = (member.full_name || '').trim();
      const mine = filteredTasks.filter(
        t => t.assignee === name || (Array.isArray(t.assignees) && t.assignees.includes(name)),
      );
      const done = mine.filter(t => t.status === 'Concluído' || t.status === 'Aprovado').length;
      const inProgress = mine.filter(t => t.status === 'Em andamento' || t.status === 'Em revisão').length;
      const pending = mine.filter(t => t.status === 'Backlog' || t.status === 'A fazer' || t.status === 'Aguardando cliente' || t.status === 'Aguardando time').length;
      const overdue = mine.filter(t => {
        if (t.status === 'Concluído' || t.status === 'Aprovado' || t.status === 'Cancelado') return false;
        if (!t.deadline) return false;

        const d = new Date(t.deadline);
        return !isNaN(d.getTime()) && d < today;
      }).length;

      const myDeliveries = filteredDeliverables.filter(
        d => (d as any).assignee === name || (d as any).responsible === name,
      );
      const deliveriesDone = myDeliveries.filter(d => d.status === 'Entregue' || d.status === 'Aprovado').length;

      const seconds = mine.reduce(
        (sum, t) => sum + (((t as any).timeInvestedSeconds as number) || 0),
        0,
      );

      return {
        name,
        avatarUrl: (member as any).avatar_url ?? null,
        total: mine.length,
        done,
        inProgress,
        pending,
        overdue,
        deliveriesDone,
        deliveriesTotal: myDeliveries.length,
        completionRate: mine.length ? Math.round((done / mine.length) * 100) : 0,
        hoursLogged: Math.round((seconds / 3600) * 10) / 10,
      };
    }).sort((a, b) => b.done - a.done);
  }, [team, filteredTasks, filteredDeliverables]);

  const teamTotals = useMemo(() => stats.reduce(
    (acc, s) => ({
      total: acc.total + s.total,
      done: acc.done + s.done,
      overdue: acc.overdue + s.overdue,
      deliveriesDone: acc.deliveriesDone + s.deliveriesDone,
      hours: acc.hours + s.hoursLogged,
    }),
    { total: 0, done: 0, overdue: 0, deliveriesDone: 0, hours: 0 },
  ), [stats]);

  const teamCompletion = teamTotals.total ? Math.round((teamTotals.done / teamTotals.total) * 100) : 0;
  const topPerformer = stats.find(s => s.total > 0);

  const memberDetail = useMemo(() => {
    if (!selectedMember) return null;
    const member = stats.find(s => s.name === selectedMember);
    if (!member) return null;
    const myTasks = filteredTasks.filter(
      t => t.assignee === selectedMember || (Array.isArray(t.assignees) && t.assignees.includes(selectedMember)),
    );
    const myDeliveries = filteredDeliverables.filter(
      d => (d as any).assignee === selectedMember || (d as any).responsible === selectedMember,
    );
    return { member, tasks: myTasks, deliveries: myDeliveries };
  }, [selectedMember, stats, filteredTasks, filteredDeliverables]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Performance do Time</h1>
          <p className="text-muted-foreground">Entregas por membro, comparativos e análise individual.</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cliente</Label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">De</Label>
                <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Até</Label>
                <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="h-9" />
              </div>
              {(clientFilter !== 'all' || periodStart || periodEnd) && (
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={() => { setClientFilter('all'); setPeriodStart(''); setPeriodEnd(''); }} className="h-9">
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Overview metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <MetricCard icon={Users} title="Membros ativos" value={String(stats.length)} />
          <MetricCard icon={ListChecks} title="Tarefas no período" value={String(teamTotals.total)} />
          <MetricCard icon={CheckCircle2} title="Concluídas" value={String(teamTotals.done)} />
          <MetricCard icon={AlertTriangle} title="Atrasadas" value={String(teamTotals.overdue)} />
          <MetricCard icon={TrendingUp} title="Conclusão do time" value={`${teamCompletion}%`} />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5"><Users className="h-4 w-4" /> Visão do time</TabsTrigger>
            <TabsTrigger value="individual" className="gap-1.5"><TrendingUp className="h-4 w-4" /> Análise individual</TabsTrigger>
          </TabsList>

          {/* Team view */}
          <TabsContent value="overview" className="space-y-4">
            {topPerformer && (
              <Card className="bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-950/20 border-amber-200/40">
                <CardContent className="flex items-center gap-3 py-4">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <Avatar className="h-7 w-7">
                    {topPerformer.avatarUrl && <AvatarImage src={topPerformer.avatarUrl} alt={topPerformer.name} />}
                    <AvatarFallback className="text-[10px]">{initials(topPerformer.name)}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Destaque do período: </span>
                    <span className="font-semibold">{topPerformer.name}</span>
                    <span className="text-muted-foreground"> — {topPerformer.done} entregas concluídas ({topPerformer.completionRate}%)</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/10">
                        <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Membro</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-muted-foreground">Total</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-muted-foreground">Concluídas</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-muted-foreground">Em andamento</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-muted-foreground">Pendentes</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-muted-foreground">Atrasadas</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-muted-foreground">Entregáveis</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-muted-foreground">Horas</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold uppercase text-muted-foreground">Conclusão</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {stats.length === 0 && (
                        <tr><td colSpan={10} className="py-10"><EmptyState icon={Users} title="Nenhum membro cadastrado" description="Cadastre membros do time para acompanhar performance." /></td></tr>
                      )}
                      {stats.map(s => (
                        <tr key={s.name} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-semibold">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                {s.avatarUrl && <AvatarImage src={s.avatarUrl} alt={s.name} />}
                                <AvatarFallback className="text-[9px]">{initials(s.name || '?')}</AvatarFallback>
                              </Avatar>
                              <span>{s.name || '—'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">{s.total}</td>
                          <td className="px-3 py-2 text-center text-emerald-600 font-semibold">{s.done}</td>
                          <td className="px-3 py-2 text-center">{s.inProgress}</td>
                          <td className="px-3 py-2 text-center">{s.pending}</td>
                          <td className="px-3 py-2 text-center">
                            {s.overdue > 0
                              ? <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">{s.overdue}</Badge>
                              : <span className="text-muted-foreground">0</span>}
                          </td>
                          <td className="px-3 py-2 text-center text-xs">{s.deliveriesDone}/{s.deliveriesTotal}</td>
                          <td className="px-3 py-2 text-center text-xs">{s.hoursLogged}h</td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${s.completionRate}%` }} />
                              </div>
                              <span className="text-xs font-semibold tabular-nums">{s.completionRate}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedMember(s.name)}>
                              Ver detalhes
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Individual view */}
          <TabsContent value="individual" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs">Membro do time</Label>
                    <Select value={selectedMember} onValueChange={setSelectedMember}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecione um membro" /></SelectTrigger>
                      <SelectContent>
                        {team.map(m => (
                          <SelectItem key={m.id} value={(m.full_name || '').trim()}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                {(m as any).avatar_url && <AvatarImage src={(m as any).avatar_url} alt={m.full_name ?? ''} />}
                                <AvatarFallback className="text-[8px]">{initials(m.full_name || '?')}</AvatarFallback>
                              </Avatar>
                              <span>{m.full_name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!memberDetail && (
              <Card><CardContent className="py-12"><EmptyState icon={TrendingUp} title="Selecione um membro" description="Escolha um membro do time para ver as entregas e indicadores individuais." /></CardContent></Card>
            )}

            {memberDetail && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <MetricCard icon={ListChecks} title="Tarefas" value={String(memberDetail.member.total)} />
                  <MetricCard icon={CheckCircle2} title="Concluídas" value={String(memberDetail.member.done)} />
                  <MetricCard icon={AlertTriangle} title="Atrasadas" value={String(memberDetail.member.overdue)} />
                  <MetricCard icon={Package} title="Entregáveis" value={`${memberDetail.member.deliveriesDone}/${memberDetail.member.deliveriesTotal}`} />
                  <MetricCard icon={Clock} title="Horas registradas" value={`${memberDetail.member.hoursLogged}h`} />
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Tarefas do membro</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/10">
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Tarefa</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Cliente</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Projeto</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Prazo</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {memberDetail.tasks.length === 0 && (
                            <tr><td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Sem tarefas no período.</td></tr>
                          )}
                          {memberDetail.tasks.map(t => (
                            <tr key={t.id} className="hover:bg-muted/30">
                              <td className="px-3 py-1.5 font-medium">{t.title}</td>
                              <td className="px-3 py-1.5 text-xs text-muted-foreground">{clients.find(c => c.id === t.clientId)?.name || '—'}</td>
                              <td className="px-3 py-1.5 text-xs text-muted-foreground">{projects.find(p => p.id === t.projectId)?.name || '—'}</td>
                              <td className="px-3 py-1.5 text-xs">{t.deadline ? new Date(t.deadline).toLocaleDateString() : '—'}</td>
                              <td className="px-3 py-1.5">
                                <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {memberDetail.deliveries.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Entregáveis</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/10">
                              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Nome</th>
                              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Cliente</th>
                              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Tipo</th>
                              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Status</th>
                              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground">Previsão</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {memberDetail.deliveries.map(d => (
                              <tr key={d.id} className="hover:bg-muted/30">
                                <td className="px-3 py-1.5 font-medium">{d.name}</td>
                                <td className="px-3 py-1.5 text-xs text-muted-foreground">{clients.find(c => c.id === d.clientId)?.name || '—'}</td>
                                <td className="px-3 py-1.5 text-xs">{d.type}</td>
                                <td className="px-3 py-1.5"><Badge variant="outline" className="text-[10px]">{d.status}</Badge></td>
                                <td className="px-3 py-1.5 text-xs">{d.forecastDate ? new Date(d.forecastDate).toLocaleDateString() : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
