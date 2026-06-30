import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, Users, Target, DollarSign, CalendarCheck, Handshake,
  Trophy, XCircle, Sparkles, ArrowUpRight, CalendarClock,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLeads, stages, type Stage } from '@/lib/comercial-store';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/comercial/')({
  component: DashboardComercial,
});

const motivationalPhrases = [
  'Toda grande oportunidade começa com uma conversa bem conduzida.',
  'Pipeline forte nasce de consistência diária.',
  'Quem acompanha melhor, vende melhor.',
  'A venda começa antes da reunião.',
  'Prospectar é construir futuro comercial.',
  'Todo relacionamento bem nutrido vira oportunidade.',
];

const stageBadgeStyles: Record<Stage, string> = {
  'Lead': 'bg-blue-50 text-blue-700 border-blue-200',
  'Em contato': 'bg-sky-50 text-sky-700 border-sky-200',
  'Follow up': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Reunião agendada': 'bg-violet-50 text-violet-700 border-violet-200',
  'Em negociação': 'bg-amber-50 text-amber-700 border-amber-200',
  'Ganho': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Perdido': 'bg-rose-50 text-rose-700 border-rose-200',
  'Dados incompletos': 'bg-zinc-50 text-zinc-700 border-zinc-200',
};

const tierTones = {
  A: 'border-primary/40 bg-primary/5 text-primary',
  B: 'border-sky-400/40 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  C: 'border-slate-300/60 bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300',
} as const;

type MetricCardProps = {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  accent?: 'default' | 'success' | 'danger';
};

function MetricCard({ label, value, icon: Icon, hint, accent = 'default' }: MetricCardProps) {
  const accentMap = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600',
    danger: 'bg-rose-500/10 text-rose-600',
  } as const;

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentMap[accent]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function TierCard({ tier, total, description }: { tier: 'A' | 'B' | 'C'; total: number; description: string }) {
  return (
    <Card className={`border ${tierTones[tier]}`}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background text-lg font-bold shadow-sm ring-1 ring-border">
          {tier}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-semibold leading-none">{total}</div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardComercial() {
  const leads = useLeads();
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % motivationalPhrases.length);
    }, 7000);
    return () => clearInterval(id);
  }, []);

  const metrics = useMemo(() => {
    const now = new Date();
    const ym = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
    const currentYm = ym(now);

    const stageCounts = Object.fromEntries(stages.map((s) => [s, 0])) as Record<Stage, number>;
    const tierCounts = { A: 0, B: 0, C: 0 };
    let inMonth = 0;

    for (const l of leads) {
      stageCounts[l.stage]++;
      tierCounts[l.tier]++;
      const created = new Date(l.createdAt);
      if (ym(created) === currentYm) inMonth++;
    }

    // Evolução últimos 6 meses
    const monthly: { mes: string; key: string; date: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthly.push({ mes: format(d, 'MMM/yy', { locale: ptBR }), key: ym(d), date: d });
    }
    const monthlyAdded = monthly.map((m) => ({ mes: m.mes, Cadastros: 0 }));
    const monthlyByStage = monthly.map((m) => ({
      mes: m.mes, Lead: 0, 'Em contato': 0, 'Reunião agendada': 0, 'Em negociação': 0, Ganho: 0,
    }));
    for (const l of leads) {
      const k = ym(new Date(l.createdAt));
      const idx = monthly.findIndex((m) => m.key === k);
      if (idx >= 0) {
        monthlyAdded[idx].Cadastros++;
        const row = monthlyByStage[idx] as Record<string, number | string>;
        if (l.stage in row) row[l.stage] = (row[l.stage] as number) + 1;
      }
    }

    const funnelData = stages.map((s) => ({ stage: s, value: stageCounts[s] }));

    // Próximos follow ups (futuros, mais próximos primeiro)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingFollowUps = leads
      .filter((l) => l.nextFollowUp && new Date(l.nextFollowUp) >= today)
      .sort((a, b) => new Date(a.nextFollowUp!).getTime() - new Date(b.nextFollowUp!).getTime())
      .slice(0, 8);

    const total = leads.length;
    const won = stageCounts['Ganho'];
    const conversion = inMonth > 0 ? Math.round((won / Math.max(1, total)) * 100) : 0;

    return {
      inMonth, total, stageCounts, tierCounts,
      meetings: stageCounts['Reunião agendada'],
      negotiating: stageCounts['Em negociação'],
      won, lost: stageCounts['Perdido'],
      funnelData, monthlyAdded, monthlyByStage,
      upcomingFollowUps, conversion,
    };
  }, [leads]);

  return (
    <div className="space-y-6">
      {/* Banner motivacional agora vem do MainLayout */}

      {/* Cards principais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Leads no mês" value={metrics.inMonth} icon={Users} hint={format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })} />
        <MetricCard label="Reuniões agendadas" value={metrics.meetings} icon={CalendarCheck} hint="No funil" />
        <MetricCard label="Em negociação" value={metrics.negotiating} icon={Handshake} hint="Oportunidades abertas" />
        <MetricCard label="Leads ganhos" value={metrics.won} icon={Trophy} hint="Total acumulado" accent="success" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Leads perdidos" value={metrics.lost} icon={XCircle} hint="Total acumulado" accent="danger" />
        <MetricCard label="Taxa de conversão" value={`${metrics.conversion}%`} icon={TrendingUp} hint="Ganhos / total" />
        <MetricCard label="Total no funil" value={metrics.total} icon={Target} hint="Todos os estágios" />
        <MetricCard label="Ticket médio previsto" value="R$ 18,2k" icon={DollarSign} hint="Estimativa" />
      </div>

      {/* Níveis A/B/C */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Leads por nível</h3>
          <Badge variant="secondary" className="text-[10px]">Classificação atual</Badge>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TierCard tier="A" total={metrics.tierCounts.A} description="Alto potencial — prioridade comercial" />
          <TierCard tier="B" total={metrics.tierCounts.B} description="Potencial médio — nutrir e qualificar" />
          <TierCard tier="C" total={metrics.tierCounts.C} description="Baixo potencial — acompanhamento leve" />
        </div>
      </div>

      {/* Funil + evolução mensal */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Funil por etapa</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Volume de leads em cada estágio</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.funnelData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/60" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <YAxis type="category" dataKey="stage" width={120} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', fontSize: 12 }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="hsl(214, 85%, 55%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Cadastros mês a mês</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Leads adicionados nos últimos 6 meses</p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.monthlyAdded} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', fontSize: 12 }} />
                  <Line type="monotone" dataKey="Cadastros" stroke="hsl(214, 85%, 55%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolução por etapa + próximos follow ups */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-border/70 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Evolução por etapa</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Cadastros por etapa nos últimos 6 meses</p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.monthlyByStage} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Lead" stroke="hsl(214, 90%, 60%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Em contato" stroke="hsl(214, 70%, 45%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Reunião agendada" stroke="hsl(265, 60%, 55%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Em negociação" stroke="hsl(40, 90%, 55%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Ganho" stroke="hsl(152, 60%, 42%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Próximos follow ups</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">{metrics.upcomingFollowUps.length} agendados</p>
            </div>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.upcomingFollowUps.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum follow up agendado.</p>
            ) : (
              metrics.upcomingFollowUps.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 p-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{l.office}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant="outline" className={cn('text-[10px] font-medium', stageBadgeStyles[l.stage])}>{l.stage}</Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(l.nextFollowUp!), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))
            )}
            <Button asChild variant="outline" size="sm" className="mt-2 w-full">
              <Link to="/comercial/prospeccoes">Ver todos os leads</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
