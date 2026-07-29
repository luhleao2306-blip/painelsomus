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
import {
  useClientAgents, useUpsertClientAgent, useDeleteClientAgent,
  useLearningTracks, useUpsertTrack, useDeleteTrack,
  useLearningItems, useUpsertItem, useDeleteItem,
  useGlossary, useUpsertGlossary, useDeleteGlossary,
  useStrategicGoals, useUpsertGoal, useDeleteGoal,
  type ClientAgent, type LearningTrack, type LearningItem, type GlossaryTerm, type StrategicGoal,
} from '@/lib/client-portal-store';
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
          <p className="text-sm text-muted-foreground">Gerencie os agentes, trilhas, glossário e metas para cada cliente.</p>
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
              <TabsTrigger value="agents">Agentes</TabsTrigger>
              <TabsTrigger value="tracks">Trilhas</TabsTrigger>
              <TabsTrigger value="glossary">Glossário</TabsTrigger>
              <TabsTrigger value="goals">Metas</TabsTrigger>
            </TabsList>
            <TabsContent value="demands" className="pt-4"><DemandsTab clientId={clientId} /></TabsContent>
            <TabsContent value="minutes" className="pt-4">
              {clientId ? <MeetingsPanel clientId={clientId} embedded /> : (
                <p className="text-sm text-muted-foreground">Selecione um cliente para ver as atas.</p>
              )}
            </TabsContent>
            <TabsContent value="links" className="pt-4"><UsefulLinksTab clientId={clientId} /></TabsContent>
            <TabsContent value="agents" className="pt-4"><AgentsTab clientId={clientId} /></TabsContent>
            <TabsContent value="tracks" className="pt-4"><TracksTab clientId={clientId} /></TabsContent>
            <TabsContent value="glossary" className="pt-4"><GlossaryTab clientId={clientId} /></TabsContent>
            <TabsContent value="goals" className="pt-4"><GoalsTab clientId={clientId} /></TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}

// ---------- Agents ----------
function AgentsTab({ clientId }: { clientId: string }) {
  const { data: items = [] } = useClientAgents(clientId);
  const upsert = useUpsertClientAgent();
  const del = useDeleteClientAgent();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ClientAgent> | null>(null);

  return (
    <div className="space-y-3">
      <Button onClick={() => { setEditing({ client_id: clientId, name: '', external_url: '', is_active: true }); setOpen(true); }}>
        <Plus className="h-4 w-4 mr-1" /> Novo agente
      </Button>
      <div className="space-y-2">
        {items.map(a => (
          <Card key={a.id}><CardContent className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2"><strong>{a.name}</strong>{a.category && <Badge variant="secondary" className="text-[10px]">{a.category}</Badge>}{!a.is_active && <Badge variant="outline" className="text-[10px]">inativo</Badge>}</div>
              <p className="text-xs text-muted-foreground truncate">{a.external_url}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => del.mutate(a.id, { onSuccess: () => toast.success('Removido') })}><Trash2 className="h-4 w-4" /></Button>
          </CardContent></Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar agente' : 'Novo agente'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={editing?.name ?? ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Categoria</Label><Input value={editing?.category ?? ''} onChange={e => setEditing(p => ({ ...p, category: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={editing?.description ?? ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>URL externa</Label><Input value={editing?.external_url ?? ''} onChange={e => setEditing(p => ({ ...p, external_url: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              if (!editing?.name || !editing.external_url) return;
              upsert.mutate(editing as any, { onSuccess: () => { setOpen(false); toast.success('Salvo'); } });
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Tracks ----------
function TracksTab({ clientId }: { clientId: string }) {
  const { data: tracks = [] } = useLearningTracks(clientId);
  const upsert = useUpsertTrack();
  const del = useDeleteTrack();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<LearningTrack> | null>(null);
  const [openTrackId, setOpenTrackId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Button onClick={() => { setEditing({ client_id: clientId, title: '', is_published: true }); setOpen(true); }}>
        <Plus className="h-4 w-4 mr-1" /> Nova trilha
      </Button>
      <div className="space-y-2">
        {tracks.map(t => (
          <Card key={t.id}><CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><strong>{t.title}</strong>{t.category && <Badge variant="secondary" className="text-[10px]">{t.category}</Badge>}{!t.is_published && <Badge variant="outline" className="text-[10px]">rascunho</Badge>}</div>
                {t.description && <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>}
              </div>
              <Button variant="outline" size="sm" onClick={() => setOpenTrackId(openTrackId === t.id ? null : t.id)}>Conteúdos</Button>
              <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(t.id, { onSuccess: () => toast.success('Removido') })}><Trash2 className="h-4 w-4" /></Button>
            </div>
            {openTrackId === t.id && <div className="pt-3 mt-3 border-t"><TrackItems trackId={t.id} /></div>}
          </CardContent></Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar trilha' : 'Nova trilha'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={editing?.title ?? ''} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Categoria</Label><Input value={editing?.category ?? ''} onChange={e => setEditing(p => ({ ...p, category: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={editing?.description ?? ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>URL da capa</Label><Input value={editing?.cover_url ?? ''} onChange={e => setEditing(p => ({ ...p, cover_url: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><input id="pub" type="checkbox" checked={editing?.is_published ?? true} onChange={e => setEditing(p => ({ ...p, is_published: e.target.checked }))} /><Label htmlFor="pub">Publicada</Label></div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              if (!editing?.title) return;
              upsert.mutate(editing as any, { onSuccess: () => { setOpen(false); toast.success('Salvo'); } });
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TrackItems({ trackId }: { trackId: string }) {
  const { data: items = [] } = useLearningItems(trackId);
  const upsert = useUpsertItem();
  const del = useDeleteItem();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<LearningItem> | null>(null);

  return (
    <div className="space-y-2 pl-2">
      <Button size="sm" variant="outline" onClick={() => { setEditing({ track_id: trackId, title: '', url: '', content_type: 'link' }); setOpen(true); }}>
        <Plus className="h-3 w-3 mr-1" /> Adicionar conteúdo
      </Button>
      {items.map(i => (
        <div key={i.id} className="flex items-center gap-2 text-sm py-1.5 border-b last:border-0">
          <Badge variant="outline" className="text-[10px]">{i.content_type}</Badge>
          <span className="flex-1 truncate">{i.title}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(i); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate({ id: i.id, track_id: trackId })}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar conteúdo' : 'Novo conteúdo'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={editing?.title ?? ''} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Tipo</Label>
              <Select value={editing?.content_type ?? 'link'} onValueChange={v => setEditing(p => ({ ...p, content_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="article">Artigo</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>URL</Label><Input value={editing?.url ?? ''} onChange={e => setEditing(p => ({ ...p, url: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={editing?.description ?? ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>Duração (min)</Label><Input type="number" value={editing?.duration_minutes ?? ''} onChange={e => setEditing(p => ({ ...p, duration_minutes: e.target.value ? Number(e.target.value) : null }))} /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              if (!editing?.title || !editing.url) return;
              upsert.mutate(editing as any, { onSuccess: () => { setOpen(false); toast.success('Salvo'); } });
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Glossary ----------
function GlossaryTab({ clientId }: { clientId: string }) {
  const { data: items = [] } = useGlossary(clientId);
  const upsert = useUpsertGlossary();
  const del = useDeleteGlossary();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<GlossaryTerm> | null>(null);

  return (
    <div className="space-y-3">
      <Button onClick={() => { setEditing({ client_id: clientId, term: '', definition: '' }); setOpen(true); }}>
        <Plus className="h-4 w-4 mr-1" /> Novo termo
      </Button>
      <div className="space-y-2">
        {items.map(t => (
          <Card key={t.id}><CardContent className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2"><strong>{t.term}</strong>{t.category && <Badge variant="secondary" className="text-[10px]">{t.category}</Badge>}</div>
              <p className="text-xs text-muted-foreground line-clamp-1">{t.definition}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => del.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
          </CardContent></Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar termo' : 'Novo termo'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Termo</Label><Input value={editing?.term ?? ''} onChange={e => setEditing(p => ({ ...p, term: e.target.value }))} /></div>
            <div><Label>Categoria</Label><Input value={editing?.category ?? ''} onChange={e => setEditing(p => ({ ...p, category: e.target.value }))} /></div>
            <div><Label>Definição</Label><Textarea rows={4} value={editing?.definition ?? ''} onChange={e => setEditing(p => ({ ...p, definition: e.target.value }))} /></div>
            <div><Label>Exemplo</Label><Textarea value={editing?.examples ?? ''} onChange={e => setEditing(p => ({ ...p, examples: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              if (!editing?.term || !editing.definition) return;
              upsert.mutate(editing as any, { onSuccess: () => { setOpen(false); toast.success('Salvo'); } });
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Goals ----------
function GoalsTab({ clientId }: { clientId: string }) {
  const { data: items = [] } = useStrategicGoals(clientId);
  const upsert = useUpsertGoal();
  const del = useDeleteGoal();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<StrategicGoal> | null>(null);

  return (
    <div className="space-y-3">
      <Button onClick={() => { setEditing({ client_id: clientId, title: '', status: 'on_track', current_value: 0, category: 'estrategica' }); setOpen(true); }}>
        <Plus className="h-4 w-4 mr-1" /> Nova meta
      </Button>
      <div className="space-y-2">
        {items.map(g => (
          <Card key={g.id}><CardContent className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <strong>{g.title}</strong>
                <Badge variant="outline" className="text-[10px] capitalize">{g.category ?? 'estrategica'}</Badge>
                <Badge variant="secondary" className="text-[10px]">{g.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{g.current_value} / {g.target_value ?? '—'} {g.unit ?? ''}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setEditing(g); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => del.mutate(g.id)}><Trash2 className="h-4 w-4" /></Button>
          </CardContent></Card>
        ))}
      </div>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar meta' : 'Nova meta'}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div><Label>Título</Label><Input value={editing?.title ?? ''} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={editing?.description ?? ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>Métrica</Label><Input value={editing?.metric ?? ''} onChange={e => setEditing(p => ({ ...p, metric: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Atual</Label><Input type="number" value={editing?.current_value ?? 0} onChange={e => setEditing(p => ({ ...p, current_value: Number(e.target.value) }))} /></div>
              <div><Label>Alvo</Label><Input type="number" value={editing?.target_value ?? ''} onChange={e => setEditing(p => ({ ...p, target_value: e.target.value ? Number(e.target.value) : null }))} /></div>
              <div><Label>Unidade</Label><Input value={editing?.unit ?? ''} onChange={e => setEditing(p => ({ ...p, unit: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Início</Label><Input type="date" value={editing?.period_start ?? ''} onChange={e => setEditing(p => ({ ...p, period_start: e.target.value || null }))} /></div>
              <div><Label>Fim</Label><Input type="date" value={editing?.period_end ?? ''} onChange={e => setEditing(p => ({ ...p, period_end: e.target.value || null }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Categoria</Label>
                <Select value={(editing?.category as string) ?? 'estrategica'} onValueChange={v => setEditing(p => ({ ...p, category: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estrategica">Estratégica</SelectItem>
                    <SelectItem value="operacional">Operacional</SelectItem>
                    <SelectItem value="economica">Econômica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={editing?.status ?? 'on_track'} onValueChange={v => setEditing(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_track">No ritmo</SelectItem>
                    <SelectItem value="at_risk">Em risco</SelectItem>
                    <SelectItem value="achieved">Atingida</SelectItem>
                    <SelectItem value="missed">Não atingida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          </div>
          <DialogFooter>
            <Button onClick={() => {
              if (!editing?.title) return;
              upsert.mutate(editing as any, { onSuccess: () => { setOpen(false); toast.success('Salvo'); } });
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
