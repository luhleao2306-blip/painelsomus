import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssigneeSelect } from '@/components/shared/AssigneeSelect';
import { useData } from '@/contexts/DataContext';
import { Eye, EyeOff, Zap, Building2, Paperclip, X, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ATTACH_BUCKET = 'entity-attachments';
const ATTACH_MAX_BYTES = 25 * 1024 * 1024;

interface QuickTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string | null;
  projectId?: string | null;
  /** Hide client picker (when called from inside a client/project page). */
  lockClient?: boolean;
  /** Hide project picker (when called from inside a project page). */
  lockProject?: boolean;
  /** Called after the task is created, with its new id. Receives `openAttachments=true` when the user clicked the "anexar arquivos" button. */
  onCreated?: (taskId: string, openAttachments: boolean) => void;
}

export function QuickTaskDialog({
  open,
  onOpenChange,
  clientId,
  projectId,
  lockClient,
  lockProject,
  onCreated,
}: QuickTaskDialogProps) {
  const { clients, projects, addTask } = useData();

  const [saving, setSaving] = useState(false);
  const [isInternal, setIsInternal] = useState(!clientId && !lockClient ? false : !clientId);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    clientId: clientId || '',
    projectId: projectId || '',
    assignee: '',
    priority: 'Média' as 'Baixa' | 'Média' | 'Alta',
    deadline: '',
    visibleToClient: false,
    recurrence: 'none' as 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'ongoing',
  });

  // Reset form whenever the dialog opens
  useEffect(() => {
    if (open) {
      setIsInternal(!clientId && !lockClient ? false : !clientId);
      setPendingFiles([]);
      setForm({
        title: '',
        description: '',
        clientId: clientId || '',
        projectId: projectId || '',
        assignee: '',
        priority: 'Média',
        deadline: '',
        visibleToClient: false,
        recurrence: 'none',
      });
    }
  }, [open, clientId, projectId, lockClient]);

  const addPendingFiles = (files: FileList | null) => {
    if (!files) return;
    const accepted: File[] = [];
    for (const f of Array.from(files)) {
      if (f.size > ATTACH_MAX_BYTES) {
        toast.error(`${f.name}: excede 25 MB.`);
        continue;
      }
      accepted.push(f);
    }
    setPendingFiles(prev => [...prev, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadAttachmentsFor = async (taskId: string) => {
    if (pendingFiles.length === 0) return;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    for (const file of pendingFiles) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `task/${taskId}/${Date.now()}_${safeName}`;
      const up = await supabase.storage.from(ATTACH_BUCKET).upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (up.error) {
        toast.error(`Falha no upload: ${file.name}`);
        continue;
      }
      const ins = await supabase.from('entity_attachments').insert({
        entity_type: 'task',
        entity_id: taskId,
        file_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: uid,
      });
      if (ins.error) {
        await supabase.storage.from(ATTACH_BUCKET).remove([path]);
        toast.error(`Falha ao registrar: ${file.name}`);
      }
    }
  };

  const availableProjects = form.clientId
    ? projects.filter(p => p.clientId === form.clientId)
    : projects;

  const handleSave = async (openAttachments = false) => {
    if (!form.title.trim()) return;
    // Allow creating with only a title — if no client picked and not locked, treat as internal.
    const effectiveInternal = isInternal || (!form.clientId && !lockClient);
    setSaving(true);
    try {
      const newId = await addTask({
        title: form.title.trim(),
        description: form.description,
        clientId: effectiveInternal ? null : (form.clientId || null),
        projectId: form.projectId || null,
        assignee: form.assignee || null,
        priority: form.priority,
        status: 'A fazer',
        type: effectiveInternal ? 'Administrativo' : 'Cliente',
        deadline: form.recurrence === 'ongoing' ? null : (form.deadline || null),
        visibleToClient: effectiveInternal ? false : form.visibleToClient,
        recurrence: form.recurrence,
      } as any);
      if (newId) {
        await uploadAttachmentsFor(newId as string);
      }
      onOpenChange(false);
      if (newId && onCreated) onCreated(newId as string, openAttachments);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Nova tarefa
          </DialogTitle>
          <DialogDescription>
            Crie uma tarefa rapidamente — sem sair desta tela.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!lockClient && (
            <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 text-amber-700" />
                <div>
                  <p className="text-sm font-semibold">Interno Somus</p>
                  <p className="text-xs text-muted-foreground">
                    {isInternal ? 'Tarefa interna — não vinculada a cliente.' : 'Vinculada a um cliente abaixo.'}
                  </p>
                </div>
              </div>
              <Switch checked={isInternal} onCheckedChange={setIsInternal} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input
              autoFocus
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="O que precisa ser feito?"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Detalhes (opcional)"
            />
          </div>

          {!lockClient && !isInternal && (
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select
                value={form.clientId || '__none__'}
                onValueChange={v =>
                  setForm({ ...form, clientId: v === '__none__' ? '' : v, projectId: '' })
                }
              >
                <SelectTrigger><SelectValue placeholder="Selecionar cliente (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Sem cliente (interno) —</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!lockProject && (
            <div className="space-y-1.5">
              <Label>Projeto</Label>
              <Select
                value={form.projectId || '__none__'}
                onValueChange={v => setForm({ ...form, projectId: v === '__none__' ? '' : v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar projeto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Sem projeto —</SelectItem>
                  {availableProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })}
              />
          </div>

          <div className="space-y-1.5">
            <Label>Recorrência</Label>
            <Select value={form.recurrence} onValueChange={(v: any) => setForm({ ...form, recurrence: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem recorrência</SelectItem>
                <SelectItem value="daily">Diariamente</SelectItem>
                <SelectItem value="weekly">Semanalmente</SelectItem>
                <SelectItem value="biweekly">Quinzenalmente</SelectItem>
                <SelectItem value="monthly">Mensalmente</SelectItem>
                <SelectItem value="ongoing">Tarefa contínua (sem prazo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>

          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <AssigneeSelect value={form.assignee} onChange={v => setForm({ ...form, assignee: v })} />
          </div>

          {!isInternal && (
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center gap-2.5">
                {form.visibleToClient
                  ? <Eye className="h-4 w-4 text-emerald-600" />
                  : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-semibold">Visível para o cliente</p>
                  <p className="text-xs text-muted-foreground">
                    {form.visibleToClient
                      ? 'O cliente verá esta tarefa no portal.'
                      : 'Tarefa interna — oculta do cliente.'}
                  </p>
                </div>
              </div>
              <Switch
                checked={form.visibleToClient}
                onCheckedChange={v => setForm({ ...form, visibleToClient: v })}
              />
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <Label className="m-0">Anexos</Label>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
              >
                <Upload className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => addPendingFiles(e.target.files)}
              />
            </div>
            {pendingFiles.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Arquivos, imagens ou documentos. Até 25 MB cada — enviados ao criar a tarefa.
              </p>
            ) : (
              <ul className="space-y-1">
                {pendingFiles.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-2 text-xs bg-background rounded px-2 py-1 border border-border/50"
                  >
                    <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{f.name}</span>
                    <span className="text-muted-foreground shrink-0">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      aria-label="Remover"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          {onCreated && (
            <Button
              variant="outline"
              onClick={() => handleSave(true)}
              disabled={saving || !form.title.trim()}
            >
              Criar e anexar arquivos
            </Button>
          )}
          <Button onClick={() => handleSave(false)} disabled={saving || !form.title.trim()}>
            {saving ? 'Criando...' : 'Criar tarefa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
