import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProfile } from '@/hooks/use-profile';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MetricCard } from '@/components/design-system/DesignSystem';
import { DollarSign, TrendingUp, Receipt, Users, FileSignature, Loader2 } from 'lucide-react';
import { ContractExpirationAlerts } from '@/components/financial/ContractExpirationAlerts';
import { FinancialEntriesPanel } from '@/components/financial/FinancialEntriesPanel';
import { ContractsEditorPanel } from '@/components/financial/ContractsEditorPanel';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

export const Route = createFileRoute('/financial-dashboard')({
  component: FinancialDashboardPage,
});

interface ContractRow {
  id: string;
  client_id: string;
  project_id: string | null;
  status: string | null;
  segment: string | null;
  product: string | null;
  monthly_value: number | null;
  total_value: number | null;
}

const ACTIVE_STATUSES = new Set(['Ativo', 'Vigente', 'Em Renovação']);
const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function FinancialDashboardPage() {
  const { role, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const { clients, projects } = useData();
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);

  const canView = role === 'master' || role === 'project_manager';

  useEffect(() => {
    if (!profileLoading && !canView) navigate({ to: '/dashboard' });
  }, [profileLoading, canView, navigate]);

  useEffect(() => {
    if (!canView) return;
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, client_id, project_id, status, segment, product, monthly_value, total_value');
      if (!active) return;
      if (!error && data) setContracts(data as ContractRow[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel('contracts-financial')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, () => load())
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [canView]);

  const activeContracts = useMemo(
    () => contracts.filter(c => ACTIVE_STATUSES.has(c.status ?? '')),
    [contracts]
  );

  const oneTimeContracts = useMemo(
    () => activeContracts.filter(c => !Number(c.monthly_value ?? 0) && Number(c.total_value ?? 0) > 0),
    [activeContracts]
  );
  const monthlyContracts = useMemo(
    () => activeContracts.filter(c => Number(c.monthly_value ?? 0) > 0),
    [activeContracts]
  );

  const computeMetrics = (list: ContractRow[]) => {
    const totalRevenue = list.reduce((s, c) => s + Number(c.total_value ?? 0), 0);
    const mrr = list.reduce((s, c) => s + Number(c.monthly_value ?? 0), 0);
    const ticket = list.length ? totalRevenue / list.length : 0;
    return {
      totalRevenue, mrr, ticket,
      activeClients: new Set(list.map(c => c.client_id)).size,
      activeContracts: list.length,
    };
  };

  const allMetrics = useMemo(() => computeMetrics(activeContracts), [activeContracts]);
  const oneTimeMetrics = useMemo(() => computeMetrics(oneTimeContracts), [oneTimeContracts]);
  const monthlyMetrics = useMemo(() => computeMetrics(monthlyContracts), [monthlyContracts]);

  const clientName = (id: string) => clients.find(cl => cl.id === id)?.name ?? 'Cliente';
  const projectName = (id: string | null) => id ? (projects.find(p => p.id === id)?.name ?? 'Projeto') : 'Sem projeto';

  const groupBy = (list: ContractRow[], key: (c: ContractRow) => string, valueField: 'total_value' | 'monthly_value' = 'total_value') => {
    const map = new Map<string, number>();
    for (const c of list) {
      const k = key(c) || 'Não informado';
      map.set(k, (map.get(k) ?? 0) + Number(c[valueField] ?? 0));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  if (profileLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!canView) return null;

  const renderSection = (
    list: ContractRow[],
    m: ReturnType<typeof computeMetrics>,
    valueField: 'total_value' | 'monthly_value',
    revenueLabel: string,
  ) => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard title={revenueLabel} value={formatBRL(valueField === 'monthly_value' ? m.mrr : m.totalRevenue)} icon={DollarSign} />
        <MetricCard title="MRR" value={formatBRL(m.mrr)} icon={TrendingUp} />
        <MetricCard title="Ticket Médio" value={formatBRL(m.ticket)} icon={Receipt} />
        <MetricCard title="Clientes" value={m.activeClients} icon={Users} />
        <MetricCard title="Contratos" value={m.activeContracts} icon={FileSignature} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Receita por Cliente">
          <BarChartView data={groupBy(list, c => clientName(c.client_id), valueField)} />
        </ChartCard>
        <ChartCard title="Receita por Projeto">
          <BarChartView data={groupBy(list, c => projectName(c.project_id), valueField)} />
        </ChartCard>
        <ChartCard title="Receita por Segmento">
          <PieChartView data={groupBy(list, c => c.segment ?? '', valueField)} />
        </ChartCard>
        <ChartCard title="Receita por Produto">
          <PieChartView data={groupBy(list, c => c.product ?? '', valueField)} />
        </ChartCard>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Financeiro</h1>
          <p className="text-muted-foreground">Indicadores calculados a partir dos contratos cadastrados.</p>
        </div>

        <ContractExpirationAlerts />

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">Todos ({activeContracts.length})</TabsTrigger>
            <TabsTrigger value="one-time">Projetos Únicos ({oneTimeContracts.length})</TabsTrigger>
            <TabsTrigger value="monthly">Contratos Mensais ({monthlyContracts.length})</TabsTrigger>
            <TabsTrigger value="entries">Lançamentos</TabsTrigger>
            <TabsTrigger value="edit">Editar Contratos</TabsTrigger>
          </TabsList>
          <TabsContent value="all">{renderSection(activeContracts, allMetrics, 'total_value', 'Receita Total Contratada')}</TabsContent>
          <TabsContent value="one-time">{renderSection(oneTimeContracts, oneTimeMetrics, 'total_value', 'Receita Projetos Únicos')}</TabsContent>
          <TabsContent value="monthly">{renderSection(monthlyContracts, monthlyMetrics, 'monthly_value', 'Receita Mensal Recorrente')}</TabsContent>
          <TabsContent value="entries"><FinancialEntriesPanel /></TabsContent>
          <TabsContent value="edit"><ContractsEditorPanel /></TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="h-80">{children}</CardContent>
    </Card>
  );
}

function BarChartView({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis type="number" tickFormatter={(v) => formatBRL(Number(v))} fontSize={11} />
        <YAxis type="category" dataKey="name" width={120} fontSize={11} />
        <Tooltip formatter={(v) => formatBRL(Number(v))} />
        <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieChartView({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={100} label={(e) => e.name}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => formatBRL(Number(v))} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EmptyChart() {
  return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Sem dados de contratos.</div>;
}
