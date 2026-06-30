import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MetricCard } from '@/components/design-system/DesignSystem';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { DollarSign, TrendingUp, FileSignature, Receipt, Users, Loader2, Trophy } from 'lucide-react';

export const Route = createFileRoute('/sales-performance')({
  component: SalesPerformancePage,
});

interface ContractRow {
  id: string;
  client_id: string;
  seller_id: string | null;
  status: string | null;
  segment: string | null;
  product: string | null;
  monthly_value: number | null;
  total_value: number | null;
  start_date: string | null;
}

interface ProfileLite { id: string; full_name: string | null; }

const ACTIVE_STATUSES = new Set(['Ativo', 'Vigente', 'Em Renovação']);

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function SalesPerformancePage() {
  const { role, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const canView = role === 'master' || role === 'project_manager';

  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [sellers, setSellers] = useState<ProfileLite[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    if (!profileLoading && !canView) navigate({ to: '/dashboard' });
  }, [profileLoading, canView, navigate]);

  useEffect(() => {
    if (!canView) return;
    let active = true;

    const load = async () => {
      const [{ data: cData }, { data: pData }] = await Promise.all([
        supabase.from('contracts')
          .select('id, client_id, seller_id, status, segment, product, monthly_value, total_value, start_date'),
        supabase.from('profiles')
          .select('id, full_name')
          .in('role', ['master', 'project_manager', 'consultant']),
      ]);
      if (!active) return;
      if (cData) setContracts(cData as ContractRow[]);
      if (pData) setSellers(pData as ProfileLite[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel('contracts-sales-perf')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, () => load())
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [canView]);

  const sellerName = (id: string | null) =>
    id ? (sellers.find(s => s.id === id)?.full_name ?? 'Vendedor') : 'Sem vendedor';

  // Unique options
  const segments = useMemo(
    () => Array.from(new Set(contracts.map(c => c.segment).filter(Boolean) as string[])).sort(),
    [contracts]
  );
  const products = useMemo(
    () => Array.from(new Set(contracts.map(c => c.product).filter(Boolean) as string[])).sort(),
    [contracts]
  );

  const filtered = useMemo(() => contracts.filter(c => {
    if (sellerFilter !== 'all' && c.seller_id !== sellerFilter) return false;
    if (segmentFilter !== 'all' && c.segment !== segmentFilter) return false;
    if (productFilter !== 'all' && c.product !== productFilter) return false;
    if (startDate && (!c.start_date || c.start_date < startDate)) return false;
    if (endDate && (!c.start_date || c.start_date > endDate)) return false;
    return true;
  }), [contracts, sellerFilter, segmentFilter, productFilter, startDate, endDate]);

  const activeFiltered = useMemo(
    () => filtered.filter(c => ACTIVE_STATUSES.has(c.status ?? '')),
    [filtered]
  );

  const metrics = useMemo(() => {
    const totalRevenue = activeFiltered.reduce((s, c) => s + Number(c.total_value ?? 0), 0);
    const mrr = activeFiltered.reduce((s, c) => s + Number(c.monthly_value ?? 0), 0);
    const count = activeFiltered.length;
    const ticket = count ? totalRevenue / count : 0;
    const wonClients = new Set(activeFiltered.map(c => c.client_id)).size;
    return { totalRevenue, mrr, count, ticket, wonClients };
  }, [activeFiltered]);

  // Per-seller aggregation
  const perSeller = useMemo(() => {
    const map = new Map<string, {
      sellerId: string | null;
      revenue: number;
      mrr: number;
      contracts: number;
      clients: Set<string>;
    }>();
    for (const c of activeFiltered) {
      const key = c.seller_id ?? 'none';
      const cur = map.get(key) ?? { sellerId: c.seller_id, revenue: 0, mrr: 0, contracts: 0, clients: new Set<string>() };
      cur.revenue += Number(c.total_value ?? 0);
      cur.mrr += Number(c.monthly_value ?? 0);
      cur.contracts += 1;
      cur.clients.add(c.client_id);
      map.set(key, cur);
    }
    return Array.from(map.values()).map(r => ({
      sellerId: r.sellerId,
      name: sellerName(r.sellerId),
      revenue: r.revenue,
      mrr: r.mrr,
      contracts: r.contracts,
      clients: r.clients.size,
      ticket: r.contracts ? r.revenue / r.contracts : 0,
    }));
  }, [activeFiltered, sellers]);

  const top = (key: 'revenue' | 'mrr' | 'contracts' | 'ticket') =>
    [...perSeller].sort((a, b) => b[key] - a[key]).slice(0, 5);

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

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Comercial</h1>
          <p className="text-muted-foreground">
            Indicadores e ranking calculados a partir dos contratos e do vendedor responsável.
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-1">
                <Label>Vendedor</Label>
                <Select value={sellerFilter} onValueChange={setSellerFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {sellers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name ?? 'Sem nome'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Segmento</Label>
                <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {segments.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Produto</Label>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Início (a partir de)</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Início (até)</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard title="Receita Total Vendida" value={formatBRL(metrics.totalRevenue)} icon={DollarSign} />
          <MetricCard title="MRR Vendido" value={formatBRL(metrics.mrr)} icon={TrendingUp} />
          <MetricCard title="Contratos Vendidos" value={metrics.count} icon={FileSignature} />
          <MetricCard title="Ticket Médio" value={formatBRL(metrics.ticket)} icon={Receipt} />
          <MetricCard title="Clientes Conquistados" value={metrics.wonClients} icon={Users} />
        </div>

        {/* Rankings */}
        <div className="grid gap-4 md:grid-cols-2">
          <RankingCard title="Ranking — Maior Receita" rows={top('revenue')} valueKey="revenue" format={formatBRL} />
          <RankingCard title="Ranking — Maior MRR" rows={top('mrr')} valueKey="mrr" format={formatBRL} />
          <RankingCard title="Ranking — Mais Contratos" rows={top('contracts')} valueKey="contracts" format={(v) => String(v)} />
          <RankingCard title="Ranking — Maior Ticket Médio" rows={top('ticket')} valueKey="ticket" format={formatBRL} />
        </div>

        {/* Full table */}
        <Card>
          <CardHeader><CardTitle className="text-base">Detalhamento por Vendedor</CardTitle></CardHeader>
          <CardContent>
            {perSeller.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem contratos para os filtros selecionados.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">MRR</TableHead>
                    <TableHead className="text-right">Contratos</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perSeller
                    .sort((a, b) => b.revenue - a.revenue)
                    .map(r => (
                      <TableRow key={r.sellerId ?? 'none'}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-right">{formatBRL(r.revenue)}</TableCell>
                        <TableCell className="text-right">{formatBRL(r.mrr)}</TableCell>
                        <TableCell className="text-right">{r.contracts}</TableCell>
                        <TableCell className="text-right">{formatBRL(r.ticket)}</TableCell>
                        <TableCell className="text-right">{r.clients}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function RankingCard({
  title, rows, valueKey, format,
}: {
  title: string;
  rows: { sellerId: string | null; name: string; revenue: number; mrr: number; contracts: number; ticket: number }[];
  valueKey: 'revenue' | 'mrr' | 'contracts' | 'ticket';
  format: (v: number) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados.</p>
        ) : (
          <ol className="space-y-2">
            {rows.map((r, i) => (
              <li key={r.sellerId ?? `none-${i}`} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {i + 1}
                  </span>
                  <span className="font-medium">{r.name}</span>
                </span>
                <span className="tabular-nums">{format(r[valueKey])}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
