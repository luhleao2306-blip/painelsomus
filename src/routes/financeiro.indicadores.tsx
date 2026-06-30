import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/design-system/DesignSystem';
import {
  DollarSign, TrendingUp, TrendingDown, Users, Repeat, Target,
  PiggyBank, Activity, BarChart3, Percent, Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

export const Route = createFileRoute('/financeiro/indicadores')({
  component: IndicadoresPage,
});

type Contract = {
  id: string;
  client_id: string;
  status: string | null;
  monthly_value: number | null;
  total_value: number | null;
  start_date: string | null;
  end_date: string | null;
};

type Entry = {
  entry_type: 'receita' | 'despesa';
  amount: number;
  entry_date: string;
  status: string;
  category: string | null;
};

const ACTIVE_STATUSES = new Set(['Ativo', 'Vigente', 'Em Renovação', 'ativo', 'vigente']);

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function IndicadoresPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const year = new Date().getFullYear();
      const [{ data: c }, { data: e }, { count }] = await Promise.all([
        supabase.from('contracts').select('id, client_id, status, monthly_value, total_value, start_date, end_date'),
        supabase
          .from('financial_entries')
          .select('entry_type, amount, entry_date, status, category')
          .gte('entry_date', `${year - 1}-01-01`),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
      ]);
      if (!active) return;
      setContracts((c as Contract[]) ?? []);
      setEntries((e as Entry[]) ?? []);
      setClientsCount(count ?? 0);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const kpis = useMemo(() => {
    const active = contracts.filter((c) => ACTIVE_STATUSES.has(c.status ?? ''));
    const activeClients = new Set(active.map((c) => c.client_id)).size;
    const mrr = active.reduce((s, c) => s + Number(c.monthly_value ?? 0), 0);
    const arr = mrr * 12;
    const arpu = activeClients > 0 ? mrr / activeClients : 0;

    // Churn aproximado: contratos encerrados nos últimos 12 meses
    const now = new Date();
    const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const churned = contracts.filter((c) => {
      if (!c.end_date) return false;
      const d = new Date(c.end_date);
      return d >= yearAgo && d <= now && !ACTIVE_STATUSES.has(c.status ?? '');
    }).length;
    const baseClients = activeClients + churned;
    const churnRate = baseClients > 0 ? (churned / baseClients) * 100 : 0;
    const retention = 100 - churnRate;
    const ltv = churnRate > 0 ? arpu / (churnRate / 100) : arpu * 24;

    // Receita / Despesa últimos 12 meses
    const considered = entries.filter((e) => e.status !== 'cancelado');
    const last12 = considered.filter((e) => new Date(e.entry_date) >= yearAgo);
    const receita12 = last12.filter((e) => e.entry_type === 'receita').reduce((s, e) => s + Number(e.amount), 0);
    const despesa12 = last12.filter((e) => e.entry_type === 'despesa').reduce((s, e) => s + Number(e.amount), 0);
    const margem = receita12 > 0 ? ((receita12 - despesa12) / receita12) * 100 : 0;
    const burn = despesa12 / 12;
    const runwayMonths = burn > 0 ? Math.max(0, (receita12 - despesa12) / burn) : 0;

    // CAC aproximado: despesas categoria comercial/marketing / novos contratos no período
    const novos = contracts.filter((c) => {
      if (!c.start_date) return false;
      const d = new Date(c.start_date);
      return d >= yearAgo && d <= now;
    }).length;
    const marketingCats = ['marketing', 'comercial', 'vendas', 'aquisição', 'aquisicao'];
    const cacSpend = last12
      .filter((e) => e.entry_type === 'despesa' && marketingCats.includes((e.category ?? '').toLowerCase()))
      .reduce((s, e) => s + Number(e.amount), 0);
    const cac = novos > 0 ? cacSpend / novos : 0;
    const paybackMonths = arpu > 0 && cac > 0 ? cac / arpu : 0;
    const ltvCac = cac > 0 ? ltv / cac : 0;

    return {
      mrr, arr, arpu, activeClients, churnRate, retention, ltv,
      receita12, despesa12, margem, burn, runwayMonths,
      cac, paybackMonths, ltvCac, novos,
    };
  }, [contracts, entries]);

  const mrrTrend = useMemo(() => {
    // Aproxima MRR mensal pelas receitas do mês
    const considered = entries.filter((e) => e.entry_type === 'receita' && e.status !== 'cancelado');
    const map = new Map<string, number>();
    considered.forEach((e) => {
      const d = new Date(e.entry_date + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + Number(e.amount));
    });
    const out: { label: string; mrr: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      out.push({
        label: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][d.getMonth()],
        mrr: map.get(key) ?? 0,
      });
    }
    return out;
  }, [entries]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold">Indicadores Chave</h2>
        <p className="text-sm text-muted-foreground">
          KPIs essenciais para uma consultoria — receita recorrente, retenção e eficiência
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receita recorrente</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="MRR" value={brl(kpis.mrr)} icon={Repeat} />
          <MetricCard title="ARR" value={brl(kpis.arr)} icon={TrendingUp} />
          <MetricCard title="ARPU" value={brl(kpis.arpu)} icon={DollarSign} />
          <MetricCard title="Clientes ativos" value={String(kpis.activeClients)} icon={Users} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Retenção</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Churn (12m)" value={`${kpis.churnRate.toFixed(1)}%`} icon={TrendingDown} />
          <MetricCard title="Retenção" value={`${kpis.retention.toFixed(1)}%`} icon={Percent} variant="success" />
          <MetricCard title="LTV" value={brl(kpis.ltv)} icon={PiggyBank} />
          <MetricCard title="Base total" value={String(clientsCount)} icon={Users} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Eficiência comercial</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="CAC" value={brl(kpis.cac)} icon={Target} />
          <MetricCard title="LTV / CAC" value={kpis.ltvCac.toFixed(2)} icon={BarChart3} />
          <MetricCard title="Payback (meses)" value={kpis.paybackMonths.toFixed(1)} icon={Activity} />
          <MetricCard title="Novos contratos (12m)" value={String(kpis.novos)} icon={TrendingUp} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saúde financeira</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Receita 12m" value={brl(kpis.receita12)} icon={TrendingUp} />
          <MetricCard title="Despesa 12m" value={brl(kpis.despesa12)} icon={TrendingDown} />
          <MetricCard title="Margem líquida" value={`${kpis.margem.toFixed(1)}%`} icon={Percent} />
          <MetricCard title="Burn mensal" value={brl(kpis.burn)} icon={Activity} />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução de receita (12 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={mrrTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Line type="monotone" dataKey="mrr" name="Receita" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
