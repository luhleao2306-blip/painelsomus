import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { formatLocalDate } from '@/lib/date-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, PriorityBadge } from '@/components/design-system/DesignSystem';
import { AttachmentsPanel } from '@/components/shared/AttachmentsPanel';
import { TagInput } from '@/components/shared/TagInput';

import {
  Calendar, User, Briefcase, Building2, Clock, Flag, Activity,
  MessageSquare, Paperclip, Trash2, Edit3, Save, CheckCircle2, FileText, Send, Timer,
} from 'lucide-react';
import { Task, TaskStatus, Priority, useData } from '@/contexts/DataContext';
import { useProfile } from '@/hooks/use-profile';
import { TaskTimerSection, formatHM } from '@/components/tasks/TaskTimerSection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AssigneeSelect } from '@/components/shared/AssigneeSelect';
import { TaskChecklistSection } from '@/components/tasks/TaskChecklistSection';
import { MentionTextarea } from '@/components/shared/MentionTextarea';
import { TaskTypeSelect } from '@/components/tasks/TaskTypeSelect';

const STATUSES: TaskStatus[] = ['Backlog', 'A fazer', 'Em andamento', 'Aguardando cliente', 'Aguardando time', 'Em revisão', 'Aprovado', 'Concluído', 'Cancelado'];
const PRIORITIES: Priority[] = ['Baixa', 'Média', 'Alta', 'Crítica'];

interface Comment {
  id: string;
  author: string;
  text: string;
  date: string;
}

interface HistoryEntry {
  id: string;
  author: string;
  action: string;
  date: string;
}

interface Props {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (task: Task) => void;
  canDelete?: boolean;
}

export function TaskDetailDialog({ task, open, onOpenChange, onDelete, canDelete }: Props) {
  const { projects, clients, documents, updateTask } = useData();
  const projectStages = useMemo(() => projects.find(p => p.id === task?.projectId)?.stages || [], [projects, task?.projectId]);
  const { profile, role } = useProfile();
  const [form, setForm] = useState<Partial<Task>>({});
  const [newComment, setNewComment] = useState('');
  const [commentMentionIds, setCommentMentionIds] = useState<string[]>([]);
  const [descriptionMentionIds, setDescriptionMentionIds] = useState<string[]>([]);
  const [previousDescriptionMentionIds, setPreviousDescriptionMentionIds] = useState<string[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [attachmentsCount, setAttachmentsCount] = useState(0);

  useEffect(() => {
    if (!task?.id || !open) { setAttachmentsCount(0); return; }
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from('entity_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('entity_type', 'task')
        .eq('entity_id', task.id);
      if (!cancelled) setAttachmentsCount(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [task?.id, open]);

  const project = useMemo(() => projects.find(p => p.id === task?.projectId), [projects, task]);
  const client = useMemo(() => clients.find(c => c.id === task?.clientId), [clients, task]);
  const relatedDocs = useMemo(
    () => documents.filter(d => task && d.projectId === task.projectId),
    [documents, task]
  );

  const canEdit = role === 'master' || role === 'project_manager' ||
    (role === 'consultant' && (task?.assignee === profile?.id || task?.assignee === profile?.full_name));
  // Inline-editing is always on for users with permission.
  const isEditing = canEdit;
  const setIsEditing = (_: boolean) => { /* no-op: inline editing is always active */ };

  const persist = async (patch: Partial<Task>) => {
    if (!task) return;
    setForm(f => ({ ...f, ...patch }));
    try {
      if (patch.status === 'Concluído' && patch.status !== task.status) {
        await autoPauseMyOpenSession();
      }
      await updateTask(task.id, patch);
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      if (msg.includes('tempo investido')) {
        toast.error('Informe o tempo investido antes de concluir esta tarefa.');
      } else {
        toast.error('Erro ao salvar.');
      }
    }
  };

  const progress = useMemo(() => {
    if (!task || task.subtasks.length === 0) {
      return task?.status === 'Concluído' ? 100 : task?.status === 'Em andamento' ? 50 : 0;
    }
    const done = task.subtasks.filter(s => s.completed).length;
    return Math.round((done / task.subtasks.length) * 100);
  }, [task]);

  useEffect(() => {
    if (!task) return;
    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      type: task.type,
      assignee: task.assignee,
      stageId: task.stageId,
      startDate: task.startDate,
      deadline: task.deadline,
      delayReason: task.delayReason,
      visibleToClient: task.visibleToClient,
      requiresApproval: task.requiresApproval,
      requestedBy: task.requestedBy,
      tags: task.tags ?? [],
    });
    setPreviousDescriptionMentionIds([]);

    setIsEditing(false);
    // Load local comments/history
    try {
      const c = localStorage.getItem(`task_comments_${task.id}`);
      setComments(c ? JSON.parse(c) : []);
      const h = localStorage.getItem(`task_history_${task.id}`);
      setHistory(h ? JSON.parse(h) : []);
    } catch {
      setComments([]); setHistory([]);
    }
  }, [task]);

  const addHistory = (action: string) => {
    if (!task) return;
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      author: profile?.full_name || 'Usuário',
      action,
      date: new Date().toISOString(),
    };
    const updated = [entry, ...history].slice(0, 50);
    setHistory(updated);
    localStorage.setItem(`task_history_${task.id}`, JSON.stringify(updated));
  };

  // Auto-pause any open session for the current user on this task
  const autoPauseMyOpenSession = async () => {
    if (!task || !profile?.id) return;
    const { data } = await supabase
      .from('task_time_sessions')
      .select('id, started_at')
      .eq('task_id', task.id)
      .eq('user_id', profile.id)
      .is('ended_at', null)
      .maybeSingle();
    if (data?.id) {
      const end = new Date();
      const dur = Math.max(0, Math.floor((end.getTime() - new Date(data.started_at).getTime()) / 1000));
      await supabase.from('task_time_sessions')
        .update({ ended_at: end.toISOString(), duration_seconds: dur })
        .eq('id', data.id);
    }
  };

  const isRequester = !!task && !!profile && (
    task.requestedBy === profile.id || task.requestedBy === profile.full_name
  );
  const awaitingApproval = !!task && task.requiresApproval && task.status === 'Em revisão';

  const tryUpdateStatus = async (status: TaskStatus) => {
    if (!task) return false;
    // Approval gate: when completing a task that requires approval, route to "Em revisão"
    let nextStatus: TaskStatus = status;
    if (status === 'Concluído' && task.requiresApproval && !isRequester) {
      nextStatus = 'Em revisão';
    }
    if (nextStatus === 'Concluído') await autoPauseMyOpenSession();
    try {
      await updateTask(task.id, { status: nextStatus });
      if (nextStatus === 'Em revisão' && status === 'Concluído') {
        toast.success('Tarefa enviada para aprovação do solicitante.');
      }
      return true;
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      if (msg.includes('tempo investido')) {
        toast.error('Informe ou registre o tempo investido antes de concluir esta tarefa.');
      } else {
        toast.error('Não foi possível atualizar o status.');
      }
      return false;
    }
  };

  const handleSave = async () => {
    if (!task) return;
    const nextStatus = (form.status ?? task.status) as TaskStatus;
    if (nextStatus === 'Concluído' && nextStatus !== task.status) {
      await autoPauseMyOpenSession();
    }
    try {
      await updateTask(task.id, form);
      addHistory('Editou a tarefa');
      setIsEditing(false);
      toast.success('Tarefa atualizada');
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      if (msg.includes('tempo investido')) {
        toast.error('Informe ou registre o tempo investido antes de concluir esta tarefa.');
      } else {
        toast.error('Erro ao salvar tarefa.');
      }
    }
  };

  const handleQuickStatus = async (status: TaskStatus) => {
    if (!task) return;
    const ok = await tryUpdateStatus(status);
    if (!ok) return;
    setForm(f => ({ ...f, status }));
    addHistory(`Alterou status para "${status}"`);
    toast.success(`Status: ${status}`);
  };

  const handleQuickAssignee = async (assignee: string) => {
    if (!task) return;
    await updateTask(task.id, { assignee });
    setForm(f => ({ ...f, assignee }));
    addHistory(`Alterou responsável para "${assignee}"`);
  };

  const notifyMentions = async (userIds: string[], excerpt: string, context: 'description' | 'comment') => {
    if (!task || userIds.length === 0) return;
    try {
      const { error } = await supabase.rpc('create_task_mention', {
        _task_id: task.id,
        _mentioned_user_ids: userIds,
        _excerpt: excerpt,
        _context: context,
      });
      if (error) throw error;
    } catch (err) {
      console.error('mention error', err);
      toast.error('Não foi possível notificar os mencionados');
    }
  };

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;
    const text = newComment.trim();
    const c: Comment = {
      id: Date.now().toString(),
      author: profile?.full_name || 'Usuário',
      text,
      date: new Date().toISOString(),
    };
    const updated = [c, ...comments];
    setComments(updated);
    localStorage.setItem(`task_comments_${task.id}`, JSON.stringify(updated));
    addHistory('Adicionou um comentário');
    if (commentMentionIds.length > 0) {
      await notifyMentions(commentMentionIds, text, 'comment');
      toast.success(`${commentMentionIds.length} usuário(s) notificado(s)`);
    }
    setNewComment('');
    setCommentMentionIds([]);
  };

  const handleDeleteComment = (id: string) => {
    if (!task) return;
    if (!confirm('Excluir este comentário?')) return;
    const updated = comments.filter(c => c.id !== id);
    setComments(updated);
    localStorage.setItem(`task_comments_${task.id}`, JSON.stringify(updated));
    addHistory('Excluiu um comentário');
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="flex-1 min-w-0">
              {canEdit ? (
                <Input
                  value={form.title ?? task.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  onBlur={() => {
                    const next = (form.title ?? '').trim();
                    if (next && next !== task.title) persist({ title: next });
                  }}
                  className="text-lg font-semibold border-transparent hover:border-input focus-visible:border-input -mx-2 px-2"
                />
              ) : (
                <DialogTitle className="text-xl">{task.title}</DialogTitle>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                <Badge variant="secondary" className="text-[10px] uppercase">{task.type}</Badge>
                {task.delayType && (
                  <Badge variant="destructive" className="text-[10px]">Atraso: {task.delayType}</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canDelete && onDelete && (
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(task)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>


        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="details"><FileText className="h-4 w-4 mr-1" />Detalhes</TabsTrigger>
            <TabsTrigger value="time"><Timer className="h-4 w-4 mr-1" />Tempo ({formatHM(task.timeInvestedSeconds ?? 0)})</TabsTrigger>
            <TabsTrigger value="comments"><MessageSquare className="h-4 w-4 mr-1" />Comentários ({comments.length})</TabsTrigger>
            <TabsTrigger value="attachments"><Paperclip className="h-4 w-4 mr-1" />Anexos ({attachmentsCount})</TabsTrigger>
            <TabsTrigger value="history"><Activity className="h-4 w-4 mr-1" />Histórico ({history.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="time" className="mt-4">
            <TaskTimerSection task={task} />
          </TabsContent>

          <TabsContent value="details" className="space-y-6 mt-4">
            {/* Approval banner */}
            {task.requiresApproval && (
              <div className={`rounded-lg border p-3 flex items-start gap-3 ${awaitingApproval ? 'border-amber-500/40 bg-amber-500/10' : 'border-border/60 bg-muted/30'}`}>
                <CheckCircle2 className={`h-5 w-5 mt-0.5 ${awaitingApproval ? 'text-amber-500' : 'text-muted-foreground'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {awaitingApproval
                      ? `Aguardando aprovação${task.requestedBy ? ` de ${task.requestedBy}` : ''}`
                      : `Esta tarefa exige aprovação${task.requestedBy ? ` de ${task.requestedBy}` : ' do solicitante'} ao concluir`}
                  </p>
                  {awaitingApproval && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isRequester ? 'Você é o solicitante — revise e aprove ou reabra.' : 'O solicitante foi notificado para revisar.'}
                    </p>
                  )}
                </div>
                {awaitingApproval && isRequester && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleQuickStatus('Em andamento')}>
                      Reabrir
                    </Button>
                    <Button size="sm" onClick={async () => {
                      await updateTask(task.id, { status: 'Concluído' });
                      addHistory('Aprovou a tarefa');
                      toast.success('Tarefa aprovada e concluída.');
                    }}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
                    </Button>
                  </div>
                )}
              </div>
            )}


            {/* Quick actions */}
            {canEdit && !isEditing && (
              <div className="flex flex-wrap gap-3 p-3 bg-muted/40 rounded-lg border border-border/50">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Alterar Status</Label>
                  <Select value={task.status} onValueChange={v => handleQuickStatus(v as TaskStatus)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground mb-1 block">Alterar Responsável</Label>
                  <AssigneeSelect
                    value={task.assignee}
                    onChange={v => v !== (task.assignee || '') && handleQuickAssignee(v)}
                  />
                </div>
                {task.status !== 'Concluído' && (
                  <div className="w-full">
                    <Button
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleQuickStatus('Concluído')}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" /> Marcar como concluída
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Progresso</Label>
                <span className="text-sm font-bold">{progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              {task.subtasks.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {task.subtasks.filter(s => s.completed).length} de {task.subtasks.length} subtarefas concluídas
                </p>
              )}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem icon={Briefcase} label="Projeto" value={project?.name || '—'} />
              <InfoItem icon={Building2} label="Cliente" value={client?.name || '—'} />
              <InfoItem icon={User} label="Responsável"
                value={isEditing
                  ? <AssigneeSelect value={form.assignee ?? task.assignee} onChange={v => persist({ assignee: v })} size="sm" />
                  : (task.assignee || '—')} />
              <InfoItem icon={Flag} label="Prioridade"
                value={isEditing
                  ? <Select value={form.priority ?? task.priority} onValueChange={(v: any) => persist({ priority: v })}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                  : task.priority} />
              <InfoItem icon={Calendar} label="Data de início"
                value={isEditing
                  ? <Input type="date" value={form.startDate ?? task.startDate ?? ''} onChange={e => persist({ startDate: e.target.value || null as any })} className="h-8" />
                  : (task.startDate ? new Date(task.startDate).toLocaleDateString() : '—')} />
              <InfoItem icon={Clock} label="Data de vencimento"
                value={isEditing
                  ? <Input type="date" value={form.deadline ?? task.deadline ?? ''} onChange={e => persist({ deadline: e.target.value || null as any })} className="h-8" />
                  : (task.deadline ? formatLocalDate(task.deadline) : '—')} />
              <InfoItem icon={Activity} label="Status"
                value={isEditing
                  ? <Select value={form.status ?? task.status} onValueChange={(v: any) => persist({ status: v })}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                  : task.status} />
              <InfoItem icon={FileText} label="Tipo"
                value={isEditing
                  ? <TaskTypeSelect value={form.type ?? task.type} onChange={(v) => persist({ type: v as any })} />
                  : task.type} />
              <InfoItem icon={Briefcase} label="Fase do projeto"
                value={isEditing
                  ? (projectStages.length === 0
                      ? <span className="text-xs italic text-muted-foreground">Projeto sem fases</span>
                      : <Select
                          value={(form.stageId ?? task.stageId) ?? '__none__'}
                          onValueChange={(v: any) => persist({ stageId: v === '__none__' ? null : v })}
                        >
                          <SelectTrigger className="h-8"><SelectValue placeholder="Sem fase" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Sem fase</SelectItem>
                            {projectStages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                    )
                  : (projectStages.find(s => s.id === task.stageId)?.name || 'Sem fase')} />
            </div>

            <Separator />

            {/* Description */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Descrição</Label>
              {isEditing ? (
                <MentionTextarea
                  value={form.description ?? task.description ?? ''}
                  onChange={(v) => setForm({ ...form, description: v })}
                  onMentionsChange={setDescriptionMentionIds}
                  onBlur={async () => {
                    const next = form.description ?? '';
                    if (next !== (task.description ?? '')) {
                      await persist({ description: next });
                      const newMentions = descriptionMentionIds.filter(
                        (id) => !previousDescriptionMentionIds.includes(id),
                      );
                      if (newMentions.length > 0) {
                        await notifyMentions(newMentions, next, 'description');
                        toast.success(`${newMentions.length} usuário(s) notificado(s)`);
                      }
                      setPreviousDescriptionMentionIds(descriptionMentionIds);
                    }
                  }}
                  rows={4}
                  placeholder="Descreva a tarefa... Use @ para mencionar"
                />
              ) : (
                <p className="text-sm text-foreground whitespace-pre-wrap">{task.description || 'Sem descrição.'}</p>
              )}
            </div>

            {/* Tags */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Tags</Label>
              {isEditing ? (
                <TagInput
                  value={form.tags ?? task.tags ?? []}
                  onChange={(next) => persist({ tags: next })}
                  placeholder="Adicionar #tag e Enter…"
                />
              ) : (task.tags?.length ?? 0) > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {task.tags!.map(tag => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/30 font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem tags.</p>
              )}
            </div>



            {/* Observations */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Observações / Motivo de atraso</Label>
              {isEditing ? (
                <Textarea
                  value={form.delayReason ?? task.delayReason ?? ''}
                  onChange={e => setForm({ ...form, delayReason: e.target.value })}
                  onBlur={() => {
                    const next = form.delayReason ?? '';
                    if (next !== (task.delayReason ?? '')) persist({ delayReason: next });
                  }}
                  rows={2}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{task.delayReason || '—'}</p>
              )}
            </div>

            {isEditing && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!(form.visibleToClient ?? task.visibleToClient)}
                    onCheckedChange={v => persist({ visibleToClient: v })}
                  />
                  <Label>Visível para o cliente</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!(form.requiresApproval ?? task.requiresApproval)}
                    onCheckedChange={v => persist({ requiresApproval: v })}
                  />
                  <Label>Exigir aprovação ao concluir</Label>
                </div>
                {(form.requiresApproval ?? task.requiresApproval) && (
                  <div className="grid gap-1.5 max-w-sm">
                    <Label className="text-xs">Solicitante (quem aprova)</Label>
                    <AssigneeSelect
                      value={form.requestedBy ?? task.requestedBy}
                      onChange={v => persist({ requestedBy: v })}
                      size="sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Checklist */}
            <Separator />
            <TaskChecklistSection taskId={task.id} canEdit={!!canEdit} />

            {/* Subtasks */}
            <SubtasksSection task={task} canEdit={!!canEdit} canDelete={!!canDelete} />

          </TabsContent>

          <TabsContent value="comments" className="space-y-4 mt-4">
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <MentionTextarea
                  placeholder="Escreva um comentário... Use @ para mencionar"
                  value={newComment}
                  onChange={setNewComment}
                  onMentionsChange={setCommentMentionIds}
                  rows={2}
                />
                {commentMentionIds.length > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {commentMentionIds.length} pessoa(s) serão notificadas
                  </p>
                )}
              </div>
              <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum comentário ainda.</p>
              ) : comments.map(c => {
                const canDelete = c.author === (profile?.full_name || 'Usuário');
                return (
                <div key={c.id} className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 group">
                  <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{c.author.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{c.author}</span>
                      <span className="text-xs text-muted-foreground">{new Date(c.date).toLocaleString()}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{c.text}</p>
                  </div>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteComment(c.id)}
                      aria-label="Excluir comentário"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="attachments" className="space-y-4 mt-4">
            <AttachmentsPanel entityType="task" entityId={task.id} />
            {relatedDocs.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground">Documentos do projeto desta tarefa</p>
                {relatedDocs.map(d => (
                  <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.category} • v{d.version}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{d.type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3 mt-4">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma alteração registrada ainda.</p>
            ) : history.map(h => (
              <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm"><span className="font-semibold">{h.author}</span> {h.action}</p>
                  <p className="text-xs text-muted-foreground">{new Date(h.date).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <div className="text-sm font-medium text-foreground mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function SubtasksSection({ task, canEdit, canDelete }: { task: Task; canEdit: boolean; canDelete: boolean }) {
  const { addSubtask, updateSubtask, deleteSubtask } = useData();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>({ title: '', assignee: '', deadline: '', type: 'Time', priority: 'Média' });
  const [saving, setSaving] = useState(false);

  const resetDraft = () => setDraft({ title: '', assignee: '', deadline: '', type: 'Time', priority: 'Média' });

  const handleCreate = async () => {
    if (!draft.title.trim()) { toast.error('Informe um título'); return; }
    setSaving(true);
    try {
      const nextOrder = (task.subtasks[task.subtasks.length - 1]?.order ?? 0) + 1;
      await addSubtask(task.id, {
        title: draft.title.trim(),
        assignee: draft.assignee || null,
        deadline: draft.deadline || null,
        type: draft.type || null,
        priority: draft.priority || 'Média',
        order: nextOrder,
        completed: false,
      });
      resetDraft();
      setAdding(false);
    } finally { setSaving(false); }
  };

  const handleToggle = async (sub: any) => {
    await updateSubtask(sub.id, { completed: !sub.completed });
  };

  const handleSaveEdit = async (subId: string) => {
    if (!draft.title.trim()) { toast.error('Informe um título'); return; }
    setSaving(true);
    try {
      await updateSubtask(subId, {
        title: draft.title.trim(),
        assignee: draft.assignee || null,
        deadline: draft.deadline || null,
        type: draft.type || null,
        priority: draft.priority || 'Média',
      });
      setEditingId(null);
      resetDraft();
    } finally { setSaving(false); }
  };

  const handleDelete = async (subId: string) => {
    if (!confirm('Excluir esta subtarefa?')) return;
    await deleteSubtask(subId);
  };

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setAdding(false);
    setDraft({
      title: s.title,
      assignee: s.assignee || '',
      deadline: s.deadline || '',
      type: s.type || 'Time',
      priority: s.priority || 'Média',
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Subtarefas ({task.subtasks.length})
        </Label>
        {canEdit && !adding && !editingId && (
          <Button size="sm" variant="outline" onClick={() => { resetDraft(); setAdding(true); }}>
            + Nova subtarefa
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {task.subtasks.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">Nenhuma subtarefa.</p>
        )}

        {task.subtasks.map(s => (
          <div key={s.id} className="p-2 rounded-md bg-muted/30 border border-border/40">
            {editingId === s.id ? (
              <SubtaskForm
                draft={draft}
                setDraft={setDraft}
                saving={saving}
                onSave={() => handleSaveEdit(s.id)}
                onCancel={() => { setEditingId(null); resetDraft(); }}
              />
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => canEdit && handleToggle(s)}
                  disabled={!canEdit}
                  className="shrink-0"
                  aria-label={s.completed ? 'Marcar como pendente' : 'Marcar como concluída'}
                >
                  <CheckCircle2 className={`h-4 w-4 ${s.completed ? 'text-primary' : 'text-muted-foreground/40'}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${s.completed ? 'line-through text-muted-foreground' : ''}`}>{s.title}</p>
                  <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-muted-foreground">
                    {s.assignee && <span>👤 {s.assignee}</span>}
                    {s.deadline && <span>📅 {formatLocalDate(s.deadline)}</span>}
                    {s.type && <Badge variant="secondary" className="text-[10px] h-4">{s.type}</Badge>}
                    {s.priority && <Badge variant="outline" className="text-[10px] h-4">⚑ {s.priority}</Badge>}
                  </div>
                </div>
                {canEdit && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(s)} aria-label="Editar subtarefa">
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(s.id)} aria-label="Excluir subtarefa">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}

        {adding && (
          <div className="p-2 rounded-md bg-muted/30 border border-border/40">
            <SubtaskForm
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              onSave={handleCreate}
              onCancel={() => { setAdding(false); resetDraft(); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SubtaskForm({ draft, setDraft, saving, onSave, onCancel }: {
  draft: any; setDraft: (d: any) => void; saving: boolean; onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="space-y-2">
      <Input
        placeholder="Título da subtarefa"
        value={draft.title}
        onChange={e => setDraft({ ...draft, title: e.target.value })}
        className="h-8"
        autoFocus
      />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <AssigneeSelect
          value={draft.assignee}
          onChange={v => setDraft({ ...draft, assignee: v })}
          size="sm"
        />
        <Input
          type="date"
          value={draft.deadline}
          onChange={e => setDraft({ ...draft, deadline: e.target.value })}
          className="h-8"
        />
        <Select value={draft.type} onValueChange={v => setDraft({ ...draft, type: v })}>
          <SelectTrigger className="h-8"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Cliente">Cliente</SelectItem>
            <SelectItem value="Time">Time</SelectItem>
          </SelectContent>
        </Select>
        <Select value={draft.priority || 'Média'} onValueChange={v => setDraft({ ...draft, priority: v })}>
          <SelectTrigger className="h-8"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Baixa">Baixa</SelectItem>
            <SelectItem value="Média">Média</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Crítica">Crítica</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1" /> Salvar
        </Button>
      </div>
    </div>
  );
}

