import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, ExternalLink, Copy, Trash2, Pencil, Eye, EyeOff, CalendarClock, MapPin, Clock,
  Sparkles, ListChecks, Link2, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Schedule = {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  project_id: string | null;
  public_token: string;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
};

type Item = {
  id: string;
  schedule_id: string;
  scheduled_date: string;
  title: string;
  theme: string | null;
  description: string | null;
  duration_minutes: number | null;
  location: string | null;
  order_index: number;
};

export function CronogramaPanel() {
  const { clients, projects } = useData();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [items, setItems] = useState<Record<string, Item[]>>({});
  const [loading, setLoading] = useState(true);

  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [sForm, setSForm] = useState({ title: '', description: '', client_id: '', project_id: '', is_active: true, is_public: true });

  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [iForm, setIForm] = useState({ scheduled_date: '', title: '', theme: '', description: '', duration_minutes: 60, location: '' });

  const load = async () => {
    setLoading(true);
    const { data: s } = await supabase.from('work_schedules' as any).select('*').order('created_at', { ascending: false });
    const list = (s as unknown as Schedule[]) ?? [];
    setSchedules(list);
    if (list.length > 0) {
      const { data: its } = await supabase
        .from('work_schedule_items' as any)
        .select('*')
        .in('schedule_id', list.map(x => x.id))
        .order('scheduled_date', { ascending: true });
      const map: Record<string, Item[]> = {};
      ((its as unknown as Item[]) ?? []).forEach(it => {
        (map[it.schedule_id] ??= []).push(it);
      });
      setItems(map);
    } else {
      setItems({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const projectsForClient = useMemo(
    () => (cid: string) => projects.filter(p => p.clientId === cid),
    [projects],
  );

  const openCreateSchedule = () => {
    setEditingSchedule(null);
    setSForm({ title: '', description: '', client_id: '', project_id: '', is_active: true, is_public: true });
    setOpenScheduleDialog(true);
  };
  const openEditSchedule = (s: Schedule) => {
    setEditingSchedule(s);
    setSForm({
      title: s.title,
      description: s.description ?? '',
      client_id: s.client_id ?? '',
      project_id: s.project_id ?? '',
      is_active: s.is_active,
      is_public: s.is_public,
    });
    setOpenScheduleDialog(true);
  };
  const saveSchedule = async () => {
    if (!sForm.title.trim()) { toast.error('Informe o título'); return; }
    const payload = {
      title: sForm.title.trim(),
      description: sForm.description.trim() || null,
      client_id: sForm.client_id || null,
      project_id: sForm.project_id || null,
      is_active: sForm.is_active,
      is_public: sForm.is_public,
    };
    if (editingSchedule) {
      const { error } = await supabase.from('work_schedules' as any).update(payload).eq('id', editingSchedule.id);
      if (error) { toast.error('Erro ao atualizar', { description: error.message }); return; }
      toast.success('Cronograma atualizado');
    } else {
      const { error } = await supabase.from('work_schedules' as any).insert(payload);
      if (error) { toast.error('Erro ao criar', { description: error.message }); return; }
      toast.success('Cronograma criado');
    }
    setOpenScheduleDialog(false);
    load();
  };
  const deleteSchedule = async (s: Schedule) => {
    if (!confirm(`Excluir o cronograma "${s.title}"?`)) return;
    const { error } = await supabase.from('work_schedules' as any).delete().eq('id', s.id);
    if (error) { toast.error('Erro ao excluir', { description: error.message }); return; }
    toast.success('Cronograma excluído');
    load();
  };
  const toggleVisibility = async (s: Schedule) => {
    const { error } = await supabase.from('work_schedules' as any).update({ is_public: !s.is_public }).eq('id', s.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const publicUrl = (token: string) => `${window.location.origin}/cronograma/${token}`;
  const copyLink = (token: string) => {
    navigator.clipboard.writeText(publicUrl(token));
    toast.success('Link copiado!');
  };

  const openCreateItem = (sid: string) => {
    setActiveScheduleId(sid);
    setEditingItem(null);
    setIForm({ scheduled_date: '', title: '', theme: '', description: '', duration_minutes: 60, location: '' });
    setOpenItemDialog(true);
  };
  const openEditItem = (it: Item) => {
    setActiveScheduleId(it.schedule_id);
    setEditingItem(it);
    setIForm({
      scheduled_date: it.scheduled_date.slice(0, 16),
      title: it.title,
      theme: it.theme ?? '',
      description: it.description ?? '',
      duration_minutes: it.duration_minutes ?? 60,
      location: it.location ?? '',
    });
    setOpenItemDialog(true);
  };
  const saveItem = async () => {
    if (!activeScheduleId) return;
    if (!iForm.title.trim() || !iForm.scheduled_date) { toast.error('Informe título e data'); return; }
    const payload = {
      schedule_id: activeScheduleId,
      scheduled_date: new Date(iForm.scheduled_date).toISOString(),
      title: iForm.title.trim(),
      theme: iForm.theme.trim() || null,
      description: iForm.description.trim() || null,
      duration_minutes: Number(iForm.duration_minutes) || null,
      location: iForm.location.trim() || null,
    };
    if (editingItem) {
      const { error } = await supabase.from('work_schedule_items' as any).update(payload).eq('id', editingItem.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Item atualizado');
    } else {
      const { error } = await supabase.from('work_schedule_items' as any).insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Item adicionado');
    }
    setOpenItemDialog(false);
    load();
  };
  const deleteItem = async (it: Item) => {
    if (!confirm('Excluir este item?')) return;
    const { error } = await supabase.from('work_schedule_items' as any).delete().eq('id', it.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <CalendarClock className="h-5 w-5 text-primary" /> Cronograma de trabalho
          </h2>
          <p className="text-sm text-muted-foreground">
            Crie cronogramas previstos com temas e compartilhe um link público com o cliente.
          </p>
        </div>
        <Button onClick={openCreateSchedule} className="gap-2">
          <Plus className="h-4 w-4" /> Novo cronograma
        </Button>
      </div>

      {loading && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Carregando…</CardContent></Card>
      )}

      {!loading && schedules.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="rounded-full border bg-muted/40 p-3">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">Nenhum cronograma ainda</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Crie seu primeiro cronograma para registrar as reuniões previstas e seus temas, e compartilhe um link visual com o cliente.
            </p>
            <Button onClick={openCreateSchedule} className="mt-2 gap-2">
              <Plus className="h-4 w-4" /> Criar cronograma
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && schedules.map(s => {
        const sItems = items[s.id] ?? [];
        const cliName = clients.find(c => c.id === s.client_id)?.name;
        const projName = projects.find(p => p.id === s.project_id)?.name;
        return (
          <Card key={s.id} className="overflow-hidden">
            <div className="border-b bg-gradient-to-r from-muted/40 to-transparent p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{s.title}</h3>
                    {!s.is_active && <Badge variant="outline">Inativo</Badge>}
                    {s.is_public
                      ? <Badge variant="secondary" className="gap-1"><Eye className="h-3 w-3" /> Público</Badge>
                      : <Badge variant="outline" className="gap-1"><EyeOff className="h-3 w-3" /> Privado</Badge>}
                  </div>
                  {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {cliName && <span>Cliente: <strong className="text-foreground">{cliName}</strong></span>}
                    {projName && <span>· Projeto: <strong className="text-foreground">{projName}</strong></span>}
                    <span>· {sItems.length} {sItems.length === 1 ? 'item' : 'itens'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copyLink(s.public_token)}>
                    <Link2 className="h-3.5 w-3.5" /> Copiar link
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" asChild>
                    <a href={publicUrl(s.public_token)} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> Visualizar
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleVisibility(s)} title="Alternar visibilidade">
                    {s.is_public ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEditSchedule(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteSchedule(s)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <ListChecks className="h-4 w-4" /> Encontros previstos
                </h4>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openCreateItem(s.id)}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </Button>
              </div>

              {sItems.length === 0 ? (
                <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                  Nenhum item adicionado ainda.
                </div>
              ) : (
                <div className="space-y-2">
                  {sItems.map(it => {
                    const d = parseISO(it.scheduled_date);
                    return (
                      <div key={it.id} className="flex items-start gap-3 rounded-lg border p-3 transition hover:bg-muted/30">
                        <div className="flex w-16 shrink-0 flex-col items-center rounded-md border bg-muted/40 px-2 py-1.5 text-center">
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                            {format(d, 'MMM', { locale: ptBR })}
                          </span>
                          <span className="text-xl font-bold leading-none">{format(d, 'dd')}</span>
                          <span className="mt-0.5 text-[10px] text-muted-foreground">{format(d, 'HH:mm')}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {it.theme && <Badge variant="secondary" className="text-[10px]">{it.theme}</Badge>}
                            <h5 className="font-medium">{it.title}</h5>
                          </div>
                          {it.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{it.description}</p>
                          )}
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                            {it.duration_minutes ? (
                              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{it.duration_minutes} min</span>
                            ) : null}
                            {it.location && (
                              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{it.location}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditItem(it)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteItem(it)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Schedule dialog */}
      <Dialog open={openScheduleDialog} onOpenChange={setOpenScheduleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? 'Editar cronograma' : 'Novo cronograma'}</DialogTitle>
            <DialogDescription>Defina o título, contexto e visibilidade do cronograma.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título *</Label>
              <Input value={sForm.title} onChange={e => setSForm({ ...sForm, title: e.target.value })} placeholder="Ex: Cronograma Q1 2026" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={sForm.description} onChange={e => setSForm({ ...sForm, description: e.target.value })} rows={3} placeholder="Contexto do cronograma…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cliente</Label>
                <Select value={sForm.client_id || 'none'} onValueChange={v => setSForm({ ...sForm, client_id: v === 'none' ? '' : v, project_id: '' })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhum —</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Projeto</Label>
                <Select value={sForm.project_id || 'none'} onValueChange={v => setSForm({ ...sForm, project_id: v === 'none' ? '' : v })} disabled={!sForm.client_id}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhum —</SelectItem>
                    {sForm.client_id && projectsForClient(sForm.client_id).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Link público</div>
                <div className="text-xs text-muted-foreground">Permite acesso sem login pelo link.</div>
              </div>
              <Switch checked={sForm.is_public} onCheckedChange={v => setSForm({ ...sForm, is_public: v })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Ativo</div>
                <div className="text-xs text-muted-foreground">Quando desativado, o link público fica indisponível.</div>
              </div>
              <Switch checked={sForm.is_active} onCheckedChange={v => setSForm({ ...sForm, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenScheduleDialog(false)}>Cancelar</Button>
            <Button onClick={saveSchedule}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={openItemDialog} onOpenChange={setOpenItemDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar item' : 'Novo item do cronograma'}</DialogTitle>
            <DialogDescription>Reunião ou encontro previsto com tema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Data e hora *</Label>
              <Input type="datetime-local" value={iForm.scheduled_date} onChange={e => setIForm({ ...iForm, scheduled_date: e.target.value })} />
            </div>
            <div>
              <Label>Título *</Label>
              <Input value={iForm.title} onChange={e => setIForm({ ...iForm, title: e.target.value })} placeholder="Ex: Kickoff do projeto" />
            </div>
            <div>
              <Label>Tema</Label>
              <Input value={iForm.theme} onChange={e => setIForm({ ...iForm, theme: e.target.value })} placeholder="Ex: Estratégia, Diagnóstico…" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={iForm.description} onChange={e => setIForm({ ...iForm, description: e.target.value })} rows={3} placeholder="Pauta, objetivos…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duração (min)</Label>
                <Input type="number" value={iForm.duration_minutes} onChange={e => setIForm({ ...iForm, duration_minutes: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Local / Link</Label>
                <Input value={iForm.location} onChange={e => setIForm({ ...iForm, location: e.target.value })} placeholder="Online, sala, link…" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenItemDialog(false)}>Cancelar</Button>
            <Button onClick={saveItem}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
