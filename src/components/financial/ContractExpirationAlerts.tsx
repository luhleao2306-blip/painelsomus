import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useData } from '@/contexts/DataContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AlertTriangle, DollarSign, Users } from 'lucide-react';

interface ExpiringContract {
  id: string;
  client_id: string;
  name: string;
  end_date: string | null;
  monthly_value: number | null;
  total_value: number | null;
  status: string | null;
  segment: string | null;
  seller_id: string | null;
}

interface SellerLite { id: string; full_name: string | null; }

const BUCKETS = [7, 15, 30, 60, 90];
const ACTIVE_STATUSES = new Set(['Ativo', 'Vigente', 'Em Renovação']);

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const daysUntil = (date: string) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(date + 'T00:00:00');
  return Math.ceil((end.getTime() - today.getTime()) / 86400000);
};

const bucketFor = (days: number) => BUCKETS.find(b => days <= b) ?? null;

const bucketColor = (b: number) =>
  b <= 7 ? 'destructive' : b <= 15 ? 'destructive' : b <= 30 ? 'default' : 'secondary';

export function ContractExpirationAlerts() {
  const { clients } = useData();
  const [contracts, setContracts] = useState<ExpiringContract[]>([]);
  const [sellers, setSellers] = useState<SellerLite[]>([]);
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [{ data: cData }, { data: pData }] = await Promise.all([
        supabase
          .from('contracts')
          .select('id, client_id, name, end_date, monthly_value, total_value, status, segment, seller_id')
          .not('end_date', 'is', null),
        supabase
          .from('profiles')
          .select('id, full_name')
          .in('role', ['master', 'project_manager', 'consultant']),
      ]);
      if (!active) return;
      if (cData) setContracts(cData as ExpiringContract[]);
      if (pData) setSellers(pData as SellerLite[]);
    };
    load();
    const channel = supabase
      .channel('contracts-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, () => load())
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name ?? 'Cliente';
  const sellerName = (id: string | null) =>
    id ? (sellers.find(s => s.id === id)?.full_name ?? 'Vendedor') : 'Sem vendedor';

  const segments = useMemo(
    () => Array.from(new Set(contracts.map(c => c.segment).filter(Boolean) as string[])).sort(),
    [contracts]
  );

  const expiring = useMemo(() => {
    return contracts
      .filter(c => ACTIVE_STATUSES.has(c.status ?? ''))
      .filter(c => c.end_date && daysUntil(c.end_date) >= 0 && daysUntil(c.end_date) <= 90)
      .filter(c => clientFilter === 'all' || c.client_id === clientFilter)
      .filter(c => sellerFilter === 'all' || c.seller_id === sellerFilter)
      .filter(c => segmentFilter === 'all' || c.segment === segmentFilter)
      .map(c => ({ ...c, days: daysUntil(c.end_date!) }))
      .sort((a, b) => a.days - b.days);
  }, [contracts, clientFilter, sellerFilter, segmentFilter]);

  const counts = useMemo(() => {
    const out = Object.fromEntries(BUCKETS.map(b => [b, 0])) as Record<number, number>;
    for (const c of expiring) {
      const b = bucketFor(c.days);
      if (b !== null) out[b]++;
    }
    return out;
  }, [expiring]);

  const revenueAtRisk = useMemo(
    () => expiring.reduce((s, c) => s + Number(c.monthly_value ?? 0), 0),
    [expiring]
  );
  const clientsNeedingRenewal = useMemo(
    () => new Set(expiring.map(c => c.client_id)).size,
    [expiring]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Alertas de Vencimento de Contratos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Cliente</Label>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vendedor</Label>
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
            <Label className="text-xs">Segmento</Label>
            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {segments.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bucket summary */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {BUCKETS.map(b => (
            <div key={b} className="rounded-lg border bg-card p-3 text-center">
              <div className="text-xs text-muted-foreground">Em até {b} dias</div>
              <div className="text-2xl font-bold tabular-nums">{counts[b]}</div>
            </div>
          ))}
        </div>

        {/* KPI strip */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-xs text-muted-foreground">Contratos próximos do vencimento</div>
              <div className="text-lg font-semibold">{expiring.length}</div>
            </div>
          </div>
          <div className="rounded-lg border p-3 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            <div>
              <div className="text-xs text-muted-foreground">Receita mensal em risco</div>
              <div className="text-lg font-semibold">{formatBRL(revenueAtRisk)}</div>
            </div>
          </div>
          <div className="rounded-lg border p-3 flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-600" />
            <div>
              <div className="text-xs text-muted-foreground">Clientes que precisam renovar</div>
              <div className="text-lg font-semibold">{clientsNeedingRenewal}</div>
            </div>
          </div>
        </div>

        {/* Table */}
        {expiring.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum contrato vencendo nos próximos 90 dias.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Faixa</TableHead>
                <TableHead className="text-right">MRR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expiring.map(c => {
                const b = bucketFor(c.days)!;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{clientName(c.client_id)}</TableCell>
                    <TableCell>{sellerName(c.seller_id)}</TableCell>
                    <TableCell>
                      {new Date(c.end_date! + 'T00:00:00').toLocaleDateString('pt-BR')}
                      <span className="text-muted-foreground"> ({c.days}d)</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={bucketColor(b) as 'default' | 'secondary' | 'destructive'}>
                        ≤ {b} dias
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatBRL(Number(c.monthly_value ?? 0))}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
