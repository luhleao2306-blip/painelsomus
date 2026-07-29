import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { MeetingsPanel } from '@/routes/meetings';
import {
  useOpFolders, useLinkFolderToClient, useClientDemandsAdmin, useSetDemandVisibility,
  useUsefulLinks, useUpsertUsefulLink, useDeleteUsefulLink,
} from '@/lib/client-portal-delivery';

export const Route = createFileRoute('/portal-cliente')({ component: AdminPortalPage });

function useClientsList() {
  return useQuery({
    queryKey: ['clients-min'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

function AdminPortalPage() {
  const { data: clients = [] } = useClientsList();
  const [clientId, setClientId] = useState<string>('');
  useEffect(() => { if (!clientId && clients[0]) setClientId(clients[0].id); }, [clients, clientId]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-1 pb-2 border-b border-border/40">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Administração</span>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Portal do Cliente</h1>
          <p className="text-sm text-muted-foreground">Gerencie as demandas, atas e links úteis de cada cliente.</p>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-xs">Cliente:</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="w-[320px]"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
            <SelectContent>
              {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {clientId && (
          <Tabs defaultValue="demands">
            <TabsList>
              <TabsTrigger value="demands">Demandas</TabsTrigger>
              <TabsTrigger value="minutes">Atas</TabsTrigger>
              <TabsTrigger value="links">Links úteis</TabsTrigger>
            </TabsList>
            <TabsContent value="demands" className="pt-4"><DemandsTab clientId={clientId} /></TabsContent>
            <TabsContent value="minutes" className="pt-4">
              {clientId ? <MeetingsPanel clientId={clientId} embedded /> : (
                <p className="text-sm text-muted-foreground">Selecione um cliente para ver as atas.</p>
              )}
            </TabsContent>
            <TabsContent value="links" className="pt-4"><UsefulLinksTab clientId={clientId} /></TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}

// ---------- Demandas visíveis ao cliente ----------
function DemandsTab({ clientId }: { clientId: string }) {
  const { data: folders = [] } = useOpFolders();
  const link = useLinkFolderToClient();
  const { data: demands = [] } = useClientDemandsAdmin(clientId);
  const setVisible = useSetDemandVisibility();
  const [q, setQ] = useState('');

  const linked = folders.filter(f => f.client_id === clientId);
  const filtered = (demands as any[]).filter((d: any) => d.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <Card><CardContent className="p-4 space-y-3">
        <div>
          <p className="text-sm font-medium">Pastas de Operações vinculadas a este cliente</p>
          <p className="text-xs text-muted-foreground">Somente demandas dentro destas pastas podem ser liberadas ao cliente.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {linked.map(f => (
            <Badge key={f.id} variant="secondary" className="gap-1">
              {f.name}
              <button className="ml-1 text-muted-foreground hover:text-foreground"
                onClick={() => link.mutate({ folderId: f.id, clientId: null }, { onSuccess: () => toast.success('Desvinculada') })}>×</button>
            </Badge>
          ))}
          {linked.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma pasta vinculada.</span>}
        </div>
        <Select value="" onValueChange={(v) => link.mutate({ folderId: v, clientId }, { onSuccess: () => toast.success('Pasta vinculada') })}>
          <SelectTrigger className="w-[320px]"><SelectValue placeholder="Vincular pasta..." /></SelectTrigger>
          <SelectContent>
            {folders.filter(f => f.client_id !== clientId).map(f => (
              <SelectItem key={f.id} value={f.id}>{f.name}{f.client_id ? ' (outro cliente)' : ''}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent></Card>

      <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar demanda..." className="max-w-sm" />

      <div className="space-y-2">
        {filtered.map((d: any) => (
          <Card key={d.id}><CardContent className="p-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{d.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {d.project_name ?? '—'} · {d.status === 'concluido' ? 'Entregue' : 'Em processo'}
              </p>
            </div>
            <Label className="text-xs text-muted-foreground">Visível ao cliente</Label>
            <Switch checked={d.client_visible}
              onCheckedChange={(v) => setVisible.mutate({ id: d.id, visible: v })} />
          </CardContent></Card>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma demanda encontrada nas pastas vinculadas.</p>}
      </div>
    </div>
  );
}

// ---------- Links úteis ----------
function UsefulLinksTab({ clientId }: { clientId: string }) {
  const { data: items = [] } = useUsefulLinks(clientId);
  const upsert = useUpsertUsefulLink();
  const del = useDeleteUsefulLink();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  return (
    <div className="space-y-3">
      <Button onClick={() => { setEditing({ client_id: clientId, title: '', url: '' }); setOpen(true); }}>
        <Plus className="h-4 w-4 mr-1" /> Novo link
      </Button>
      <div className="space-y-2">
        {items.map(l => (
          <Card key={l.id}><CardContent className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <strong className="text-sm">{l.title}</strong>
              <p className="text-xs text-muted-foreground truncate">{l.url}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setEditing(l); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => del.mutate(l.id, { onSuccess: () => toast.success('Removido') })}><Trash2 className="h-4 w-4" /></Button>
          </CardContent></Card>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum link cadastrado.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar link' : 'Novo link'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={editing?.title ?? ''} onChange={e => setEditing((p: any) => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>URL</Label><Input value={editing?.url ?? ''} onChange={e => setEditing((p: any) => ({ ...p, url: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={editing?.description ?? ''} onChange={e => setEditing((p: any) => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              if (!editing?.title || !editing?.url) return;
              upsert.mutate(editing, { onSuccess: () => { setOpen(false); toast.success('Salvo'); } });
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
