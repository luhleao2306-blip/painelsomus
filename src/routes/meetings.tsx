import { createFileRoute, Link } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  UsersRound, Calendar, Plus, File, Loader2, Eye, Trash2, Upload,
  Video, X, Pencil, Sparkles, Wand2,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useData, MeetingMinuteStatus, MeetingMinute } from '@/contexts/DataContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useProfile } from '@/hooks/use-profile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { EmptyState } from '@/components/design-system/DesignSystem';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useServerFn } from '@tanstack/react-start';
import { generateAtaFromNotes } from '@/lib/atas.functions';
import { useAssignableUsers } from '@/components/shared/AssigneeSelect';


export const Route = createFileRoute('/meetings')({
  component: MeetingsRoute,
});

function MeetingsRoute() {
  return (
    <MainLayout>
      <MeetingsPanel />
    </MainLayout>
  );
}

const STATUSES: MeetingMinuteStatus[] = ['Rascunho', 'Revisada', 'Enviada ao cliente', 'Aprovada', 'Arquivada'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const statusVariant: Record<MeetingMinuteStatus, 'secondary' | 'default' | 'outline' | 'destructive'> = {
  'Rascunho': 'secondary',
  'Revisada': 'outline',
  'Enviada ao cliente': 'default',
  'Aprovada': 'default',
  'Arquivada': 'secondary',
};

interface ProfileLite { id: string; full_name: string | null; }

export function MeetingsPanel({ clientId, embedded }: { clientId?: string; embedded?: boolean } = {}) {
  const { role } = useProfile();
  const { filteredMinutes, clients, projects, addMinute, updateMinute, deleteMinute, refreshMinutes } = useData();

  const canManage = role === 'master' || role === 'project_manager';

  // Add/Edit form state
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emptyMinute = {
    title: '',
    clientId: clientId ?? '',
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    attendees: '' as string,
    agenda: '',
    decisions: '',
    clientPending: '',
    teamPending: '',
    nextSteps: '',
    recordingLink: '',
    status: 'Rascunho' as MeetingMinuteStatus,
    internalResponsibleId: '' as string,
    visibleToClient: true,
    downloadEnabled: true,
  };
  const [newMinute, setNewMinute] = useState(emptyMinute);

  // AI generator
  const callGenerateAta = useServerFn(generateAtaFromNotes);
  const assignableUsers = useAssignableUsers();
  const collaboratorFullNames = useMemo(
    () => assignableUsers.map(u => (u.full_name ?? '').trim()).filter(Boolean),
    [assignableUsers],
  );
  const [aiOpen, setAiOpen] = useState(false);
  const [aiNotes, setAiNotes] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Expand first-name/nickname mentions to the official full name from the collaborators list.
  // Ambiguous matches (more than one collaborator sharing the same first name) are kept as-is.
  const expandNamesToFullNames = (text: string): string => {
    if (!text || collaboratorFullNames.length === 0) return text;
    const byFirst = new Map<string, string[]>();
    for (const full of collaboratorFullNames) {
      const first = full.split(/\s+/)[0]?.toLowerCase();
      if (!first) continue;
      const list = byFirst.get(first) ?? [];
      list.push(full);
      byFirst.set(first, list);
    }
    return text.replace(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’-]+/g, (token) => {
      const lower = token.toLowerCase();
      // already a multi-word full name match? leave it.
      const matches = byFirst.get(lower);
      if (!matches || matches.length !== 1) return token;
      return matches[0];
    });
  };

  const runAiGenerate = async () => {
    if (aiNotes.trim().length < 10) {
      toast.error('Cole as anotações da reunião antes de gerar.');
      return;
    }
    setAiLoading(true);
    try {
      const clientName = clients.find(c => c.id === newMinute.clientId)?.name;
      const projectName = projects.find(p => p.id === newMinute.projectId)?.name;
      const result = await callGenerateAta({
        data: { notes: aiNotes, clientName, projectName, collaborators: collaboratorFullNames },
      });
      setNewMinute(prev => ({
        ...prev,
        title: result.title || prev.title,
        agenda: expandNamesToFullNames(result.agenda) || prev.agenda,
        decisions: expandNamesToFullNames(result.decisions) || prev.decisions,
        clientPending: expandNamesToFullNames(result.clientPending) || prev.clientPending,
        teamPending: expandNamesToFullNames(result.teamPending) || prev.teamPending,
        nextSteps: expandNamesToFullNames(result.nextSteps) || prev.nextSteps,
        attendees: expandNamesToFullNames(result.attendees) || prev.attendees,
      }));
      toast.success('Ata organizada pela IA. Revise antes de salvar.');
      setAiOpen(false);
      setAiNotes('');
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || '';
      if (msg.includes('429')) toast.error('Limite de uso da IA atingido. Tente novamente em alguns minutos.');
      else if (msg.includes('402')) toast.error('Créditos da IA esgotados. Adicione créditos no workspace.');
      else toast.error('Não foi possível gerar a ata.');
    } finally {
      setAiLoading(false);
    }
  };


  const openEdit = (m: MeetingMinute) => {
    setEditingId(m.id);
    setNewMinute({
      title: m.title ?? '',
      clientId: m.clientId ?? '',
      projectId: m.projectId ?? '',
      date: (m.date ?? '').slice(0, 10) || new Date().toISOString().split('T')[0],
      attendees: (m.attendees ?? []).join(', '),
      agenda: m.agenda ?? '',
      decisions: m.decisions ?? '',
      clientPending: m.clientPending ?? '',
      teamPending: m.teamPending ?? '',
      nextSteps: m.nextSteps ?? '',
      recordingLink: m.recordingLink ?? '',
      status: m.status,
      internalResponsibleId: m.internalResponsibleId ?? '',
      visibleToClient: m.visibleToClient ?? true,
      downloadEnabled: m.downloadEnabled ?? true,
    });
    setSelectedFile(null);
    setIsAdding(true);
  };

  // Filters — only client + optional period
  const [clientFilter, setClientFilter] = useState<string>(clientId ?? 'all');
  useEffect(() => { setClientFilter(clientId ?? 'all'); }, [clientId]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Internal team for the responsible-name lookup in cards
  const [team, setTeam] = useState<ProfileLite[]>([]);
  useEffect(() => {
    let active = true;
    supabase.from('profiles').select('id, full_name')
      .in('role', ['master', 'project_manager', 'consultant'])
      .then(({ data }) => { if (active && data) setTeam(data as ProfileLite[]); });
    return () => { active = false; };
  }, []);
  const teamName = (id?: string | null) =>
    id ? (team.find(t => t.id === id)?.full_name ?? '—') : '—';

  // Auto-open edit dialog if URL hash is #edit-<id>
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const h = window.location.hash;
    const match = h.match(/^#edit-(.+)$/);
    if (!match) return;
    const target = filteredMinutes.find(m => m.id === match[1]);
    if (target) {
      openEdit(target);
      window.history.replaceState(null, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredMinutes]);

  const filtered = useMemo(() => {
    return filteredMinutes
      .filter(m => clientFilter === 'all' || m.clientId === clientFilter)
      .filter(m => {
        if (!startDate && !endDate) return true;
        const iso = new Date(m.date).toISOString().slice(0, 10);
        if (startDate && iso < startDate) return false;
        if (endDate && iso > endDate) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredMinutes, clientFilter, startDate, endDate]);

  const clearFilters = () => {
    setClientFilter('all'); setStartDate(''); setEndDate('');
  };



  const handleSave = async () => {
    if (!newMinute.title || !newMinute.clientId) {
      toast.error('Preencha cliente e título.');
      return;
    }

    setIsUploading(true);
    try {
      const attendees = newMinute.attendees
        .split(',').map(s => s.trim()).filter(Boolean);
      if (editingId) {
        await updateMinute(editingId, { ...newMinute, attendees });
      } else {
        await addMinute({ ...newMinute, attendees }, selectedFile || undefined);
      }
      await refreshMinutes();
      setIsAdding(false);
      setEditingId(null);
      setSelectedFile(null);
      setNewMinute(emptyMinute);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar ata.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMinute(id);
      await refreshMinutes();
      toast.success('Ata excluída.');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao excluir.');
    }
  };

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        {!embedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Atas de Reunião</h1>
            <p className="text-muted-foreground">Organize, filtre e abra as atas dentro do portal.</p>
          </div>
          {canManage && (
            <Button className="gap-2" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4" /> Nova Ata
            </Button>
          )}
        </div>
        )}

        {/* Filtros — apenas cliente + período opcional */}
        <div className="flex flex-wrap items-end gap-2 border-b pb-3">
          {role !== 'client' && !clientId && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Cliente</Label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="h-8 w-[200px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos clientes</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Período (opcional)</Label>
            <div className="flex items-center gap-1.5">
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 w-[140px] text-xs" />
              <span className="text-xs text-muted-foreground">→</span>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 w-[140px] text-xs" />
            </div>
          </div>
          {((role !== 'client' && !clientId && clientFilter !== 'all') || startDate || endDate) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs">
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
          {embedded && canManage && (
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setIsAdding(true)}>
              <Plus className="h-3.5 w-3.5" /> Nova Ata
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} ata(s)</span>
        </div>


        {/* Lista fina, estilo task-list */}
        <div className="divide-y rounded-lg border bg-card">
          {filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={UsersRound} title="Sem atas" description="Ajuste o filtro ou crie uma nova ata." />
            </div>
          ) : (
            filtered.map(m => (
              <MinuteRow
                key={m.id}
                minute={m}
                clientName={clients.find(c => c.id === m.clientId)?.name ?? 'Cliente'}
                responsibleName={teamName(m.internalResponsibleId)}
                canManage={canManage}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>



      {/* Add/Edit dialog */}
      <Dialog open={isAdding} onOpenChange={(o) => {
        if (isUploading) return;
        setIsAdding(o);
        if (!o) { setEditingId(null); setNewMinute(emptyMinute); setSelectedFile(null); }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-5 gap-4">
          <DialogHeader className="pb-0">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-base">{editingId ? 'Editar Ata' : 'Nova Ata'}</DialogTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5 h-7 text-xs border-primary/40 text-primary hover:bg-primary/5"
                onClick={() => setAiOpen(true)}
              >
                <Sparkles className="h-3.5 w-3.5" /> Gerar com IA
              </Button>
            </div>
            <DialogDescription className="text-xs">
              Cole as anotações da reunião (estilo Notion) e deixe a IA organizar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-0.5 md:col-span-2">
              <Label className="text-xs">Título da reunião *</Label>
              <Input size={20} className="h-8 text-sm"
                value={newMinute.title}
                onChange={e => setNewMinute({ ...newMinute, title: e.target.value })} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Cliente *</Label>
              <Select value={newMinute.clientId}
                onValueChange={v => setNewMinute({ ...newMinute, clientId: v, projectId: '' })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Projeto</Label>
              <Select value={newMinute.projectId}
                onValueChange={v => setNewMinute({ ...newMinute, projectId: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {projects.filter(p => p.clientId === newMinute.clientId).map(p =>
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Data *</Label>
              <Input type="date" className="h-8 text-xs"
                value={newMinute.date}
                onChange={e => setNewMinute({ ...newMinute, date: e.target.value })} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Status</Label>
              <Select value={newMinute.status}
                onValueChange={(v: MeetingMinuteStatus) => setNewMinute({ ...newMinute, status: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5 md:col-span-2">
              <Label className="text-xs">Responsável interno</Label>
              <Select value={newMinute.internalResponsibleId || 'none'}
                onValueChange={v => setNewMinute({ ...newMinute, internalResponsibleId: v === 'none' ? '' : v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem responsável —</SelectItem>
                  {team.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name ?? '—'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5 md:col-span-2">
              <Label className="text-xs">Participantes (separados por vírgula)</Label>
              <Input className="h-8 text-xs"
                value={newMinute.attendees}
                onChange={e => setNewMinute({ ...newMinute, attendees: e.target.value })}
                placeholder="Ex: João, Maria, Pedro" />
            </div>
            <div className="space-y-0.5 md:col-span-2">
              <Label className="text-xs">Pauta</Label>
              <Textarea rows={2} className="text-xs min-h-[60px]"
                value={newMinute.agenda}
                onChange={e => setNewMinute({ ...newMinute, agenda: e.target.value })} />
            </div>
            <div className="space-y-0.5 md:col-span-2">
              <Label className="text-xs">Decisões</Label>
              <Textarea rows={2} className="text-xs min-h-[60px]"
                value={newMinute.decisions}
                onChange={e => setNewMinute({ ...newMinute, decisions: e.target.value })} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Pendências do cliente</Label>
              <Textarea rows={2} className="text-xs min-h-[60px]"
                value={newMinute.clientPending}
                onChange={e => setNewMinute({ ...newMinute, clientPending: e.target.value })} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Pendências do time</Label>
              <Textarea rows={2} className="text-xs min-h-[60px]"
                value={newMinute.teamPending}
                onChange={e => setNewMinute({ ...newMinute, teamPending: e.target.value })} />
            </div>
            <div className="space-y-0.5 md:col-span-2">
              <Label className="text-xs">Link da gravação (opcional)</Label>
              <Input className="h-8 text-xs"
                value={newMinute.recordingLink}
                onChange={e => setNewMinute({ ...newMinute, recordingLink: e.target.value })}
                placeholder="https://..." />
            </div>
            <div className="space-y-0.5 md:col-span-2">
              <Label className="text-xs">Arquivo da ata (opcional)</Label>
              <div className="border border-dashed rounded-md p-2.5 text-center cursor-pointer hover:bg-muted/50"
                onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} className="hidden"
                  onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
                {selectedFile ? (
                  <span className="text-xs font-medium flex items-center gap-2 justify-center">
                    <File className="h-3.5 w-3.5" /> {selectedFile.name}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 justify-center">
                    <Upload className="h-3.5 w-3.5" /> Clique para anexar
                  </span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} disabled={isUploading}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={isUploading}>
              {isUploading ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Salvando...</> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI generator dialog */}
      <Dialog open={aiOpen} onOpenChange={(o) => { if (!aiLoading) setAiOpen(o); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Wand2 className="h-4 w-4 text-primary" />
              Gerar ata com IA
            </DialogTitle>
            <DialogDescription>
              Cole o conteúdo bruto da reunião (anotações do Notion, transcrição, bullets...).
              A IA vai organizar em título, pauta, decisões, pendências e próximos passos.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={12}
            value={aiNotes}
            onChange={e => setAiNotes(e.target.value)}
            placeholder="Cole aqui as anotações da reunião..."
            className="text-xs font-mono"
            disabled={aiLoading}
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAiOpen(false)} disabled={aiLoading}>
              Cancelar
            </Button>
            <Button size="sm" onClick={runAiGenerate} disabled={aiLoading} className="gap-1.5">
              {aiLoading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Organizando...</>
                : <><Sparkles className="h-3.5 w-3.5" />Organizar ata</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MinuteRow({
  minute, clientName, responsibleName, canManage, onEdit, onDelete,
}: {
  minute: MeetingMinute;
  clientName: string;
  responsibleName: string;
  canManage: boolean;
  onEdit: (m: MeetingMinute) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 transition-colors group">
      <Link
        to="/atas/$ataId"
        params={{ ataId: minute.id }}
        className="flex-1 min-w-0 flex items-center gap-3"
      >
        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-[11px] text-muted-foreground tabular-nums w-[72px] shrink-0">
          {new Date(minute.date).toLocaleDateString('pt-BR')}
        </span>
        <span className="font-medium text-sm truncate flex-1">{minute.title}</span>
        <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0 shrink-0 hidden sm:inline-flex">
          {clientName}
        </Badge>
        <Badge variant={statusVariant[minute.status]} className="text-[10px] font-normal px-1.5 py-0 shrink-0 hidden md:inline-flex">
          {minute.status}
        </Badge>
        <span className="text-[11px] text-muted-foreground hidden lg:inline truncate max-w-[140px]">
          {responsibleName}
        </span>
      </Link>
      <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
        <Button asChild size="icon" variant="ghost" className="h-7 w-7" title="Abrir">
          <Link to="/atas/$ataId" params={{ ataId: minute.id }}>
            <Eye className="h-3.5 w-3.5" />
          </Link>
        </Button>
        {minute.recordingLink && (
          <Button asChild size="icon" variant="ghost" className="h-7 w-7" title="Gravação">
            <a href={minute.recordingLink} target="_blank" rel="noopener noreferrer">
              <Video className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
        {canManage && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(minute)} title="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {canManage && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Excluir">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir ata?</AlertDialogTitle>
                <AlertDialogDescription>
                  A ata "{minute.title}" será removida permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(minute.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

