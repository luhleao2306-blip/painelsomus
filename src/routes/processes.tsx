import { InDevelopmentNotice } from '@/components/common/InDevelopmentNotice';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Workflow, Plus, Pencil, Trash2, ChevronUp, ChevronDown, ExternalLink,
  LinkIcon, FileText, Search, User, ShieldCheck, ArrowDown, CheckCircle2, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/processes')({
  component: () => (
    <MainLayout>
      <div className="py-16">
        <InDevelopmentNotice module="Processos & POPs" />
      </div>
    </MainLayout>
  ),
});

interface Process {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
interface ProcessStep {
  id: string;
  process_id: string;
  title: string;
  description: string | null;
  responsible: string | null;
  approver: string | null;
  on_approval: string | null;
  position: number;
}
interface ProcessPop {
  id: string;
  process_id: string;
  title: string;
  url: string;
  created_at: string;
}

const db = supabase as any;

function isValidUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function ProcessesPage() {
  const { profile, role } = useProfile();
  const isManager = role === 'master' || role === 'project_manager';

  const [loading, setLoading] = useState(true);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [creators, setCreators] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Process | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProcesses = async () => {
    setLoading(true);
    const { data, error } = await db
      .from('processes')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      toast.error('Não foi possível concluir a ação.');
      setLoading(false);
      return;
    }
    const list = (data ?? []) as Process[];
    setProcesses(list);

    const ids = Array.from(new Set(list.map(p => p.created_by).filter(Boolean) as string[]));
    if (ids.length) {
      const { data: profs } = await db.from('profiles').select('id, full_name, email').in('id', ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p.full_name || p.email || 'Usuário'; });
      setCreators(map);
    }

    if (!selectedId && list.length) setSelectedId(list[0].id);
    setLoading(false);
  };

  useEffect(() => { loadProcesses(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return processes;
    return processes.filter(p =>
      p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q));
  }, [processes, search]);

  const selected = useMemo(
    () => processes.find(p => p.id === selectedId) ?? null,
    [processes, selectedId],
  );

  const canEditProcess = (p: Process | null) =>
    !!p && (isManager || p.created_by === profile?.id);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setFormOpen(true);
  };
  const openEdit = (p: Process) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description ?? '' });
    setFormOpen(true);
  };

  const submitForm = async () => {
    const name = form.name.trim();
    if (!name) { toast.error('Informe o nome do processo.'); return; }
    if (editing) {
      const { error } = await db.from('processes')
        .update({ name, description: form.description.trim() || null })
        .eq('id', editing.id);
      if (error) { toast.error('Não foi possível concluir a ação.'); return; }
      toast.success('Processo atualizado com sucesso.');
    } else {
      if (!profile?.id) { toast.error('Não foi possível identificar o usuário criador. Recarregue a página e tente novamente.'); return; }
      const { data, error } = await db.from('processes')
        .insert({ name, description: form.description.trim() || null, created_by: profile.id })
        .select('id').single();
      if (error) { toast.error('Não foi possível concluir a ação.'); return; }
      toast.success('Processo criado com sucesso.');
      setSelectedId(data.id);
    }
    setFormOpen(false);
    loadProcesses();
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    const { error } = await db.from('processes').delete().eq('id', deletingId);
    if (error) { toast.error('Não foi possível concluir a ação.'); return; }
    toast.success('Processo removido.');
    if (selectedId === deletingId) setSelectedId(null);
    setDeletingId(null);
    loadProcesses();
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] p-6 gap-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Workflow className="h-6 w-6 text-primary" />
              Processos & POPs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Documente processos, etapas e procedimentos operacionais do time.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> Novo processo
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 flex-1 min-h-0">
          {/* List */}
          <Card className="flex flex-col min-h-0 rounded-2xl border-border/60">
            <div className="p-3 border-b border-border/40">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar processo..."
                  className="h-8 pl-7 text-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                <>
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                </>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Workflow className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">
                    {search ? 'Nenhum processo encontrado' : 'Nenhum processo ainda'}
                  </p>
                  {!search && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em "Novo processo" para começar.
                    </p>
                  )}
                </div>
              ) : filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                    selectedId === p.id
                      ? 'bg-primary/10 border-primary/40'
                      : 'bg-card/40 border-transparent hover:border-border/60 hover:bg-muted/40'
                  }`}
                >
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Detail */}
          <Card className="flex flex-col min-h-0 rounded-2xl border-border/60">
            {selected ? (
              <ProcessDetail
                process={selected}
                creatorName={creators[selected.created_by ?? ''] ?? '—'}
                canEdit={canEditProcess(selected)}
                canDelete={isManager}
                onEdit={() => openEdit(selected)}
                onDelete={() => setDeletingId(selected.id)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <Workflow className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="font-semibold">Selecione um processo</p>
                <p className="text-sm text-muted-foreground">
                  Escolha um item à esquerda ou crie um novo processo.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Process form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar processo' : 'Novo processo'}</DialogTitle>
            <DialogDescription>
              Preencha o nome e a descrição do processo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome do processo</Label>
              <Input
                value={form.name}
                maxLength={120}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Onboarding de novo cliente"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                maxLength={1000}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Para que serve e quando usar este processo."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={submitForm}>{editing ? 'Salvar' : 'Criar processo'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={v => !v && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir processo?</AlertDialogTitle>
            <AlertDialogDescription>
              As etapas e POPs vinculados também serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

/* -------------------- Detail (steps + pops) -------------------- */

function ProcessDetail({
  process, creatorName, canEdit, canDelete, onEdit, onDelete,
}: {
  process: Process; creatorName: string; canEdit: boolean; canDelete: boolean;
  onEdit: () => void; onDelete: () => void;
}) {
  return (
    <>
      <CardContent className="p-5 pb-3 border-b border-border/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{process.name}</h2>
            {process.description && (
              <p className="text-sm text-muted-foreground mt-1">{process.description}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
              <span>Criado por: <strong className="text-foreground/80">{creatorName}</strong></span>
              <span>Criado em: {new Date(process.created_at).toLocaleDateString('pt-BR')}</span>
              <span>Atualizado em: {new Date(process.updated_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
              </Button>
            )}
            {canDelete && (
              <Button variant="outline" size="sm" onClick={onDelete}
                className="text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <StepsSection processId={process.id} canEdit={canEdit} />
        <PopsSection processId={process.id} canEdit={canEdit} />
      </div>
    </>
  );
}

/* -------------------- Steps -------------------- */

function StepsSection({ processId, canEdit }: { processId: string; canEdit: boolean }) {
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProcessStep | null>(null);
  const [form, setForm] = useState({ title: '', description: '', responsible: '', approver: '', on_approval: '' });

  const load = async () => {
    setLoading(true);
    const { data } = await db.from('process_steps').select('*')
      .eq('process_id', processId).order('position', { ascending: true });
    setSteps((data ?? []) as ProcessStep[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [processId]);

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', description: '', responsible: '', approver: '', on_approval: '' });
    setOpen(true);
  };
  const openEdit = (s: ProcessStep) => {
    setEditing(s);
    setForm({
      title: s.title,
      description: s.description ?? '',
      responsible: s.responsible ?? '',
      approver: s.approver ?? '',
      on_approval: s.on_approval ?? '',
    });
    setOpen(true);
  };

  const save = async () => {
    const title = form.title.trim();
    if (!title) { toast.error('Informe o título da etapa.'); return; }
    const payload = {
      title,
      description: form.description.trim() || null,
      responsible: form.responsible.trim() || null,
      approver: form.approver.trim() || null,
      on_approval: form.on_approval.trim() || null,
    };
    if (editing) {
      const { error } = await db.from('process_steps').update(payload).eq('id', editing.id);
      if (error) { toast.error('Não foi possível concluir a ação.'); return; }
    } else {
      const { error } = await db.from('process_steps').insert({
        process_id: processId, ...payload, position: steps.length,
      });
      if (error) { toast.error('Não foi possível concluir a ação.'); return; }
    }
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await db.from('process_steps').delete().eq('id', id);
    if (error) { toast.error('Não foi possível concluir a ação.'); return; }
    load();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    const a = steps[idx], b = steps[target];
    const updates = await Promise.all([
      db.from('process_steps').update({ position: b.position }).eq('id', a.id),
      db.from('process_steps').update({ position: a.position }).eq('id', b.id),
    ]);
    if (updates.some((r: any) => r.error)) { toast.error('Não foi possível concluir a ação.'); return; }
    load();
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" /> Fluxo do processo
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Etapa a etapa, com responsável, aprovador e o que acontece após a aprovação.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={openNew}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Etapa
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-28 w-full rounded-2xl" /><Skeleton className="h-28 w-full rounded-2xl" /></div>
      ) : steps.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/60 rounded-2xl bg-muted/20">
          <Workflow className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm font-semibold">Nenhuma etapa cadastrada</p>
          <p className="text-xs text-muted-foreground mt-1">
            Adicione a primeira etapa para visualizar o fluxo.
          </p>
        </div>
      ) : (
        <ol className="relative">
          {steps.map((s, i) => {
            const isLast = i === steps.length - 1;
            return (
              <li key={s.id} className="relative pb-6 last:pb-0">
                <div className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/40 hover:shadow-lg transition-all">
                  {/* Number ribbon */}
                  <div className="flex">
                    <div className="w-14 shrink-0 bg-foreground text-background flex flex-col items-center justify-center py-4 gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Etapa</span>
                      <span className="text-2xl font-black leading-none">{String(i + 1).padStart(2, '0')}</span>
                    </div>

                    <div className="flex-1 min-w-0 p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="text-base font-bold leading-tight">{s.title}</h4>
                        {canEdit && (
                          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)}>
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isLast} onClick={() => move(i, 1)}>
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(s.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {s.description && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">{s.description}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                        <StepMeta
                          icon={User}
                          label="Responsável"
                          value={s.responsible}
                        />
                        <StepMeta
                          icon={ShieldCheck}
                          label="Aprovação"
                          value={s.approver}
                        />
                        <StepMeta
                          icon={CheckCircle2}
                          label="Após aprovar"
                          value={s.on_approval}
                          tone="success"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {!isLast && (
                  <div className="flex justify-center py-1.5" aria-hidden>
                    <div className="h-8 w-px bg-gradient-to-b from-border via-foreground/30 to-border relative">
                      <ArrowDown className="h-3.5 w-3.5 text-foreground/60 absolute left-1/2 -translate-x-1/2 -bottom-1 bg-background" />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar etapa' : 'Nova etapa'}</DialogTitle>
            <DialogDescription>
              Defina quem executa, quem aprova e o que ocorre depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={form.title} maxLength={120}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex.: Briefing inicial" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.description} maxLength={1000} rows={3}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="O que precisa ser feito nesta etapa." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Responsável</Label>
                <Input value={form.responsible} maxLength={120}
                  onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))}
                  placeholder="Quem executa" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Aprovador</Label>
                <Input value={form.approver} maxLength={120}
                  onChange={e => setForm(f => ({ ...f, approver: e.target.value }))}
                  placeholder="Quem aprova" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> O que ocorre após a aprovação</Label>
              <Textarea value={form.on_approval} maxLength={500} rows={2}
                onChange={e => setForm(f => ({ ...f, on_approval: e.target.value }))}
                placeholder="Ex.: Segue para a etapa de produção e cliente é notificado." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function StepMeta({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | null; tone?: 'success' }) {
  const empty = !value || !value.trim();
  return (
    <div className={`rounded-xl border p-2.5 ${
      empty
        ? 'border-dashed border-border/50 bg-muted/20'
        : tone === 'success'
          ? 'border-foreground/20 bg-foreground/[0.04]'
          : 'border-border/60 bg-muted/30'
    }`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={`text-xs ${empty ? 'text-muted-foreground/60 italic' : 'text-foreground font-medium'}`}>
        {empty ? 'Não definido' : value}
      </p>
    </div>
  );
}

/* -------------------- POPs -------------------- */

function PopsSection({ processId, canEdit }: { processId: string; canEdit: boolean }) {
  const [pops, setPops] = useState<ProcessPop[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', url: '' });
  const { profile } = useProfile();

  const load = async () => {
    setLoading(true);
    const { data } = await db.from('process_pops').select('*')
      .eq('process_id', processId).order('created_at', { ascending: false });
    setPops((data ?? []) as ProcessPop[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [processId]);

  const add = async () => {
    const title = form.title.trim();
    const url = form.url.trim();
    if (!title) { toast.error('Informe o título do POP.'); return; }
    if (!isValidUrl(url)) { toast.error('URL inválida.'); return; }
    const { error } = await db.from('process_pops').insert({
      process_id: processId, title, url, created_by: profile?.id ?? null,
    });
    if (error) { toast.error('Não foi possível concluir a ação.'); return; }
    toast.success('POP adicionado.');
    setOpen(false);
    setForm({ title: '', url: '' });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await db.from('process_pops').delete().eq('id', id);
    if (error) { toast.error('Não foi possível concluir a ação.'); return; }
    load();
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> POPs vinculados
        </h3>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> POP
          </Button>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-12 w-full" />
      ) : pops.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nenhum POP vinculado.</p>
      ) : (
        <ul className="space-y-2">
          {pops.map(p => (
            <li key={p.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/40 bg-muted/30">
              <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground truncate">{p.url}</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir
                </a>
              </Button>
              {canEdit && (
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => remove(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar POP</DialogTitle>
            <DialogDescription>Vincule um link para o documento ou procedimento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={form.title} maxLength={120}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>URL</Label>
              <Input value={form.url} placeholder="https://..."
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={add}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
