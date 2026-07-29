import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Building2, Plus, Trash2, Rocket, Megaphone, Wrench, Users2, LayoutList, Sparkles,
} from 'lucide-react';
import { opStore, type OpPriority, type OpProject } from '@/lib/operacoes-store';

type Blueprint = {
  id: string;
  label: string;
  hint: string;
  icon: React.ElementType;
  sections: string[];
  tasks: string[];
};

const BLUEPRINTS: Blueprint[] = [
  {
    id: 'blank',
    label: 'Do zero',
    hint: 'Só uma lista "Geral" para começar livre.',
    icon: LayoutList,
    sections: ['Geral'],
    tasks: [],
  },
  {
    id: 'launch',
    label: 'Lançamento',
    hint: 'Planejar, produzir, revisar e lançar.',
    icon: Rocket,
    sections: ['Planejamento', 'Produção', 'Revisão', 'Lançamento'],
    tasks: ['Definir escopo e objetivo', 'Cronograma e responsáveis', 'Checklist de lançamento'],
  },
  {
    id: 'marketing',
    label: 'Marketing interno',
    hint: 'Conteúdo, campanhas e materiais da marca.',
    icon: Megaphone,
    sections: ['Estratégia', 'Conteúdo', 'Distribuição', 'Resultados'],
    tasks: ['Definir posicionamento da campanha', 'Calendário de conteúdo', 'Relatório de performance'],
  },
  {
    id: 'ops',
    label: 'Processo / Operação',
    hint: 'Mapear, padronizar e implantar um processo.',
    icon: Wrench,
    sections: ['Diagnóstico', 'Desenho do processo', 'Implantação', 'Acompanhamento'],
    tasks: ['Mapear situação atual', 'Escrever o POP', 'Treinar a alcateia'],
  },
  {
    id: 'people',
    label: 'Cultura & Pessoas',
    hint: 'Onboarding, rituais e desenvolvimento do time.',
    icon: Users2,
    sections: ['Planejamento', 'Execução', 'Feedback'],
    tasks: ['Definir objetivo da iniciativa', 'Agendar encontros', 'Coletar feedback do time'],
  },
];

const PRIORITIES: { value: OpPriority; label: string; cls: string }[] = [
  { value: 'alta', label: 'Alta', cls: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300' },
  { value: 'media', label: 'Média', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  { value: 'baixa', label: 'Baixa', cls: 'border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-300' },
];

const STATUS_OPTIONS: { value: OpProject['status']; label: string }[] = [
  { value: 'nao_iniciado', label: 'Não iniciado' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'pausado', label: 'Pausado' },
];

type DraftTask = { id: string; name: string };

export function NewInternalProjectDialog({
  open,
  onOpenChange,
  folderId,
  users,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  folderId: () => string | undefined;
  users: { id: string; name: string }[];
  onCreated: (projectId: string) => void;
}) {
  const [name, setName] = useState('');
  const [ownerId, setOwnerId] = useState<string>('');
  const [status, setStatus] = useState<OpProject['status']>('em_andamento');
  const [priority, setPriority] = useState<OpPriority>('media');
  const [dueDate, setDueDate] = useState('');
  const [blueprintId, setBlueprintId] = useState('launch');
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  const [taskDraft, setTaskDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const blueprint = useMemo(
    () => BLUEPRINTS.find(b => b.id === blueprintId) ?? BLUEPRINTS[0],
    [blueprintId],
  );

  useEffect(() => {
    if (!open) return;
    setName('');
    setOwnerId('');
    setStatus('em_andamento');
    setPriority('media');
    setDueDate('');
    setBlueprintId('launch');
    setTaskDraft('');
    setTasks(
      (BLUEPRINTS.find(b => b.id === 'launch')?.tasks ?? []).map((t, i) => ({ id: `seed-${i}`, name: t })),
    );
  }, [open]);

  const pickBlueprint = (id: string) => {
    setBlueprintId(id);
    const bp = BLUEPRINTS.find(b => b.id === id);
    setTasks((bp?.tasks ?? []).map((t, i) => ({ id: `seed-${id}-${i}`, name: t })));
  };

  const addDraftTask = () => {
    const v = taskDraft.trim();
    if (!v) return;
    setTasks(prev => [...prev, { id: `t-${Date.now()}`, name: v }]);
    setTaskDraft('');
  };

  const handleCreate = () => {
    const projectName = name.trim();
    if (!projectName || saving) return;
    const fid = folderId();
    if (!fid) return;
    setSaving(true);
    try {
      const projectId = opStore.addProject(fid, projectName);
      if (ownerId) opStore.setProjectOwner(projectId, ownerId);
      if (status !== 'nao_iniciado') opStore.updateProjectStatus(projectId, status);

      const sectionNames = blueprint.sections.length ? blueprint.sections : ['Geral'];
      const sectionIds = sectionNames.map(s => opStore.addSection(projectId, s));
      const firstSection = sectionIds[0];

      if (firstSection) {
        tasks.forEach(t => {
          const taskId = opStore.addTask(firstSection, t.name);
          opStore.updateTask(taskId, {
            priority,
            assigneeId: ownerId || undefined,
            dueDate: dueDate || undefined,
          });
        });
      }

      onCreated(projectId);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Nova iniciativa interna
          </DialogTitle>
          <DialogDescription>
            Monte o projeto da própria Somus: escolha um formato, defina o dono e já deixe as primeiras demandas prontas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-1.5">
            <Label>Nome da iniciativa *</Label>
            <Input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="Ex: Reestruturação do onboarding da alcateia"
            />
          </div>

          <div>
            <Label className="mb-2 block">Formato do projeto</Label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {BLUEPRINTS.map(bp => {
                const Icon = bp.icon;
                const active = bp.id === blueprintId;
                return (
                  <button
                    key={bp.id}
                    type="button"
                    onClick={() => pickBlueprint(bp.id)}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-all',
                      active
                        ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                        : 'border-border/60 bg-card hover:border-border hover:bg-muted/40',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')} />
                      <span className="text-sm font-semibold">{bp.label}</span>
                    </div>
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">{bp.hint}</p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {bp.sections.length} etapa{bp.sections.length > 1 ? 's' : ''}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {blueprint.sections.map(s => (
                <span
                  key={s}
                  className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select value={ownerId || '__none__'} onValueChange={v => setOwnerId(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Definir depois" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Definir depois —</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status inicial</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo das primeiras demandas</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Prioridade das demandas iniciais</Label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                    priority === p.value
                      ? p.cls
                      : 'border-border/60 bg-transparent text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-border/60 bg-muted/25 p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <Label className="mb-0">Primeiras demandas</Label>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">{tasks.length}</span>
            </div>
            <div className="space-y-1.5">
              {tasks.map(t => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-2.5 py-1.5"
                >
                  <span className="flex-1 truncate text-sm">{t.name}</span>
                  <button
                    type="button"
                    onClick={() => setTasks(prev => prev.filter(x => x.id !== t.id))}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label={`Remover ${t.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="px-1 py-2 text-xs text-muted-foreground">
                  Nenhuma demanda inicial — você pode criar direto no kanban depois.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={taskDraft}
                onChange={e => setTaskDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDraftTask(); } }}
                placeholder="Adicionar demanda…"
                className="h-9"
              />
              <Button type="button" size="sm" variant="outline" onClick={addDraftTask} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? 'Criando…' : 'Criar iniciativa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
