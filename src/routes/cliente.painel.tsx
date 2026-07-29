import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useProfile } from '@/hooks/use-profile';
import {
  useMyClientDemands, useMyUsefulLinks, useMyDeliverables, useMyMinutes,
} from '@/lib/client-portal-delivery';
import { CheckCircle2, Clock, ExternalLink, FileText, Link2, Search, CalendarDays, PackageCheck } from 'lucide-react';

export const Route = createFileRoute('/cliente/painel')({
  head: () => ({
    meta: [
      { title: 'Meu Painel — Somus Group' },
      { name: 'description', content: 'Acompanhe suas demandas, entregas, atas e links úteis.' },
      { property: 'og:title', content: 'Meu Painel — Somus Group' },
      { property: 'og:description', content: 'Acompanhe suas demandas, entregas, atas e links úteis.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: ClientPanelPage,
});

const fmt = (d?: string | null) => {
  if (!d) return '—';
  const [y, m, day] = String(d).slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
};

function ClientPanelPage() {
  const { profile } = useProfile();
  const clientId = (profile as any)?.client_id as string | undefined;

  const { data: demands = [], isLoading } = useMyClientDemands();
  const { data: links = [] } = useMyUsefulLinks(clientId);
  const { data: deliverables = [] } = useMyDeliverables(clientId);
  const { data: minutes = [] } = useMyMinutes(clientId);
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () => demands.filter(d => d.name.toLowerCase().includes(q.toLowerCase())),
    [demands, q],
  );
  const emAndamento = filtered.filter(d => d.situation === 'em_andamento');
  const entregues = filtered.filter(d => d.situation === 'entregue');

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-1 pb-2 border-b border-border/40">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Portal do Cliente</span>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Meu Painel</h1>
          <p className="text-sm text-muted-foreground">Demandas liberadas pelo time, entregas realizadas, atas e links úteis.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard icon={Clock} label="Em andamento" value={demands.filter(d => d.situation === 'em_andamento').length} />
          <StatCard icon={CheckCircle2} label="Entregues" value={demands.filter(d => d.situation === 'entregue').length} />
          <StatCard icon={PackageCheck} label="Entregas registradas" value={deliverables.length} />
        </div>

        <Tabs defaultValue="demandas">
          <TabsList>
            <TabsTrigger value="demandas">Demandas</TabsTrigger>
            <TabsTrigger value="entregas">Entregas</TabsTrigger>
            <TabsTrigger value="atas">Atas</TabsTrigger>
            <TabsTrigger value="links">Links úteis</TabsTrigger>
          </TabsList>

          <TabsContent value="demandas" className="pt-4 space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar demanda..." className="pl-8" />
            </div>

            {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {!isLoading && demands.length === 0 && (
              <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
                Nenhuma demanda liberada para visualização no momento.
              </CardContent></Card>
            )}

            <DemandGroup title="Em processo" tone="amber" items={emAndamento} />
            <DemandGroup title="Entregues" tone="emerald" items={entregues} />
          </TabsContent>

          <TabsContent value="entregas" className="pt-4 space-y-2">
            {deliverables.length === 0 && (
              <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma entrega publicada ainda.</CardContent></Card>
            )}
            {deliverables.map((d: any) => (
              <Card key={d.id}><CardContent className="p-4 flex items-center gap-3">
                <PackageCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.type ? `${d.type} · ` : ''}Entrega: {fmt(d.actual_date ?? d.forecast_date)}
                  </p>
                </div>
                {d.link && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={d.link} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1" />Abrir</a>
                  </Button>
                )}
              </CardContent></Card>
            ))}
          </TabsContent>

          <TabsContent value="atas" className="pt-4 space-y-2">
            {minutes.length === 0 && (
              <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma ata compartilhada ainda.</CardContent></Card>
            )}
            {minutes.map((m: any) => (
              <Card key={m.id}><CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{m.title}</p>
                  <Badge variant="secondary" className="text-[10px] ml-auto">
                    <CalendarDays className="h-3 w-3 mr-1" />{fmt(m.meeting_date)}
                  </Badge>
                </div>
                {m.decisions && <p className="text-xs text-muted-foreground whitespace-pre-line">{m.decisions}</p>}
                {m.next_steps && <p className="text-xs text-muted-foreground whitespace-pre-line"><strong>Próximos passos:</strong> {m.next_steps}</p>}
                {m.external_link && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={m.external_link} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1" />Ver ata</a>
                  </Button>
                )}
              </CardContent></Card>
            ))}
          </TabsContent>

          <TabsContent value="links" className="pt-4 grid gap-2 sm:grid-cols-2">
            {links.length === 0 && (
              <Card className="sm:col-span-2"><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum link útil cadastrado.</CardContent></Card>
            )}
            {links.map(l => (
              <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="block">
                <Card className="transition hover:border-primary/40">
                  <CardContent className="p-4 flex items-start gap-3">
                    <Link2 className="h-4 w-4 mt-0.5 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{l.title}</p>
                      {l.description && <p className="text-xs text-muted-foreground">{l.description}</p>}
                      <p className="text-[11px] text-muted-foreground truncate">{l.url}</p>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <div className="rounded-lg bg-muted p-2"><Icon className="h-4 w-4 text-foreground" /></div>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </div>
    </CardContent></Card>
  );
}

function DemandGroup({ title, items, tone }: { title: string; items: any[]; tone: 'amber' | 'emerald' }) {
  if (!items.length) return null;
  const badge = tone === 'amber'
    ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300';
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title} · {items.length}</p>
      {items.map(d => (
        <Card key={d.id}><CardContent className="p-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {d.project_name ?? d.folder_name ?? '—'}
            </p>
          </div>
          {d.situation === 'entregue'
            ? <span className="text-xs text-muted-foreground">{fmt(d.delivered_at)}</span>
            : d.due_date && <span className="text-xs text-muted-foreground">Previsto {fmt(d.due_date)}</span>}
          <Badge className={`text-[10px] border-0 ${badge}`}>
            {d.situation === 'entregue' ? 'Entregue' : 'Em processo'}
          </Badge>
        </CardContent></Card>
      ))}
    </div>
  );
}
