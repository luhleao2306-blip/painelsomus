import { useMemo, useState } from 'react';
import { Search, Filter, X, Star, Building2, Maximize2, Trash2, Plus, ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useData, type Task, type TaskStatus, type Priority } from '@/contexts/DataContext';
import { useAssignableUsers, AssigneeSelect } from '@/components/shared/AssigneeSelect';
import { useProfile } from '@/hooks/use-profile';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';
import { InlineText } from '@/components/shared/InlineEdit';
import { QuickTaskDialog } from '@/components/shared/QuickTaskDialog';
import { toast } from 'sonner';

// Funnel statuses (for the status badge color)
const STATUS_OPTIONS: { label: string; status: TaskStatus }[] = [
  { label: 'Backlog',              status: 'Backlog' },
  { label: 'Fazendo',              status: 'Em andamento' },
  { label: 'Em alteração',         status: 'Em revisão' },
  { label: 'Em aprovação interna', status: 'Aguardando time' },
  { label: 'Em aprovação cliente', status: 'Aguardando cliente' },
  { label: 'Stand-by',             status: 'A fazer' },
  { label: 'Aprovados',            status: 'Aprovado' },
  { label: 'Finalizados',          status: 'Concluído' },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map(o => [o.status, o.label])
);

const STATUS_META: Record<string, string> = {
  'Backlog':              'bg-slate-100 text-slate-700 border-slate-300',
  'Em andamento':         'bg-blue-100 text-blue-700 border-blue-300',
  'Em revisão':           'bg-amber-100 text-amber-700 border-amber-300',
  'Aguardando time':      'bg-purple-100 text-purple-700 border-purple-300',
  'Aguardando cliente':   'bg-pink-100 text-pink-700 border-pink-300',
  'A fazer':              'bg-zinc-100 text-zinc-700 border-zinc-300',
  'Aprovado':             'bg-emerald-100 text-emerald-700 border-emerald-300',
  'Concluído':            'bg-green-100 text-green-700 border-green-300',
};

const normalizeAssigneeName = (value: string | null | undefined) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const splitAssigneeNames = (value: string | null | undefined) => {
  const raw = (value ?? '').trim();
  if (!raw) return [];
  const parts = raw
    .split(/\s*(?:,|;|\/|\+|&|\be\b)\s*/i)
    .map(part => part.trim())
    .filter(Boolean);
  return Array.from(new Set([raw, ...parts]));
};

const getTaskAssigneeNames = (task: Task) =>
  Array.from(new Set([
    ...(task.assignees ?? []).flatMap(splitAssigneeNames),
    ...splitAssigneeNames(task.assignee),
  ].map(name => name.trim()).filter(Boolean)));

const assigneeMatches = (candidate: string, selected: string) => {
  const candidateName = normalizeAssigneeName(candidate);
  const selectedName = normalizeAssigneeName(selected);
  if (!candidateName || !selectedName) return false;
  if (candidateName === selectedName) return true;

  const candidateTokens = candidateName.split(' ').filter(token => token.length >= 3);
  const selectedTokens = selectedName.split(' ').filter(token => token.length >= 3);
  if (!candidateTokens.length || !selectedTokens.length) return false;

  if (selectedTokens.length === 1) return candidateTokens.includes(selectedTokens[0]);
  if (candidateTokens.length === 1) return selectedTokens.includes(candidateTokens[0]);
  return selectedTokens.every(token => candidateTokens.includes(token))
    || candidateTokens.every(token => selectedTokens.includes(token));
};

const formatAssignees = (task: Task) => {
  const names = getTaskAssigneeNames(task);
  return names.length ? names.join(', ') : '—';
};

const PRIORITY_META: Record<string, { label: string; classes: string }> = {
  'Crítica': { label: 'P1', classes: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-300' },
  'Alta':    { label: 'P2', classes: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300' },
  'Média':   { label: 'P3', classes: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-300' },
  'Baixa':   { label: 'P4', classes: 'bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300' },
};

const TAG_PALETTE = [
  'bg-rose-100 text-rose-700 border-rose-300',
  'bg-amber-100 text-amber-700 border-amber-300',
  'bg-lime-100 text-lime-700 border-lime-300',
  'bg-emerald-100 text-emerald-700 border-emerald-300',
  'bg-cyan-100 text-cyan-700 border-cyan-300',
  'bg-sky-100 text-sky-700 border-sky-300',
  'bg-indigo-100 text-indigo-700 border-indigo-300',
  'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300',
];
const tagColor = (tag: string) => {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0;
  return TAG_PALETTE[Math.abs(h) % TAG_PALETTE.length];
};

const INTERNAL_KEY = '__internal__';
const INTERNAL_LABEL = 'Somus (Interno)';

export function TaskFunnelView() {
  const { filteredTasks: tasks, clients, updateTask, deleteTask } = useData();
  const users = useAssignableUsers();
  const { profile, role } = useProfile();

  const myName = profile?.full_name?.trim() ?? '';
  const isClient = role === 'client';

  const [search, setSearch] = useState('');
  const [onlyMine, setOnlyMine] = useState<boolean>(false);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [clientFilters, setClientFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>(['Backlog', 'A fazer', 'Em andamento']);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

  const assigneeOptions = useMemo(() => {
    return users
      .map(u => (u.full_name ?? '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [users]);

  const filteredTasks = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;

    return tasks.filter(t => {
      if (t.status === 'Cancelado') return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;

      if (onlyMine && myName) {
        const match = getTaskAssigneeNames(t).some(name => assigneeMatches(name, myName));
        if (!match) return false;
      }

      if (assignees.length > 0) {
        const match = getTaskAssigneeNames(t).some(name => assignees.some(a => assigneeMatches(name, a)));
        if (!match) return false;
      }
      if (clientFilters.length > 0) {
        const key = t.clientId || INTERNAL_KEY;
        if (!clientFilters.includes(key)) return false;
      }
      if (statusFilters.length > 0 && !statusFilters.includes(t.status)) return false;

      if (from || to) {
        if (!t.deadline) return false;
        const d = new Date(t.deadline);
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    });
  }, [tasks, search, onlyMine, myName, assignees, clientFilters, statusFilters, dateFrom, dateTo]);

  // Group tasks by client
  const grouped = useMemo(() => {
    const m = new Map<string, { id: string; name: string; tasks: Task[] }>();
    filteredTasks.forEach(t => {
      const key = t.clientId || INTERNAL_KEY;
      const name = t.clientId ? (clientMap.get(t.clientId) || '—') : INTERNAL_LABEL;
      const row = m.get(key) || { id: key, name, tasks: [] };
      row.tasks.push(t);
      m.set(key, row);
    });
    // Sort each group by deadline then title
    m.forEach(g => g.tasks.sort((a, b) => {
      const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      if (da !== db) return da - db;
      return a.title.localeCompare(b.title, 'pt-BR');
    }));
    return Array.from(m.values()).sort((a, b) => {
      if (a.id === INTERNAL_KEY) return 1;
      if (b.id === INTERNAL_KEY) return -1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [filteredTasks, clientMap]);

  const totalShown = filteredTasks.length;
  const hasFilters = onlyMine || !!search || assignees.length > 0 || clientFilters.length > 0 || statusFilters.length !== 3 || !!dateFrom || !!dateTo;
  const today = new Date(); today.setHours(0,0,0,0);

  return (
    <div className="space-y-4">
      {!isClient && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setQuickOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nova tarefa
          </Button>
        </div>
      )}
      {myName && !isClient && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={onlyMine ? 'default' : 'outline'}
            onClick={() => setOnlyMine(true)}
            className="gap-2"
          >
            <Star className={`h-4 w-4 ${onlyMine ? 'fill-current' : ''}`} />
            Minhas tarefas
          </Button>
          <Button
            size="sm"
            variant={!onlyMine ? 'default' : 'outline'}
            onClick={() => setOnlyMine(false)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Todas as tarefas
          </Button>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar tarefa..."
            className="pl-9"
          />
        </div>

        {!isClient && (
          <MultiFilter
            label="Responsáveis"
            allLabel="Todos responsáveis"
            options={assigneeOptions.map(n => ({ value: n, label: n }))}
            selected={assignees}
            onChange={setAssignees}
          />
        )}

        {!isClient && (
          <MultiFilter
            label="Clientes"
            allLabel="Todos os clientes"
            options={[
              { value: INTERNAL_KEY, label: INTERNAL_LABEL },
              ...clients.map(c => ({ value: c.id, label: c.name })),
            ]}
            selected={clientFilters}
            onChange={setClientFilters}
          />
        )}

        <MultiFilter
          label="Status"
          allLabel="Todos os status"
          options={STATUS_OPTIONS.map(f => ({ value: f.status, label: f.label }))}
          selected={statusFilters}
          onChange={setStatusFilters}
        />

        <div className="flex items-center gap-1">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-10 w-[150px]" title="De" />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-10 w-[150px]" title="Até" />
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setOnlyMine(false); setSearch(''); setAssignees([]); setClientFilters([]); setStatusFilters(['Backlog', 'A fazer', 'Em andamento']); setDateFrom(''); setDateTo(''); }}
          >
            <X className="h-4 w-4 mr-1" /> Limpar
          </Button>
        )}

        <Badge variant="outline" className="ml-auto">
          <Filter className="h-3 w-3 mr-1" /> {totalShown} tarefa{totalShown !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* List grouped by client */}
      <div className="space-y-6">
        {grouped.map(group => (
          <div key={group.id}>
            <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-md border bg-card">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">{group.name}</h3>
              <Badge variant="secondary" className="text-xs ml-1">{group.tasks.length}</Badge>
            </div>
            <div className="rounded-lg border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Tarefa</TableHead>
                    <TableHead>Status</TableHead>
                    {!isClient && <TableHead>Responsável</TableHead>}
                    <TableHead>Prazo</TableHead>
                    {!isClient && <TableHead>Prioridade</TableHead>}
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.tasks.map(t => {
                    const overdue = t.deadline && new Date(t.deadline) < today && t.status !== 'Concluído' && t.status !== 'Aprovado';
                    const meta = PRIORITY_META[t.priority] ?? { label: t.priority, classes: 'bg-zinc-100 text-zinc-700 border-zinc-300' };
                    const deadlineInput = t.deadline ? new Date(t.deadline).toISOString().slice(0, 10) : '';
                    return (
                      <TableRow key={t.id} className={isClient ? '[&_td]:py-1.5 [&_td]:text-xs' : ''}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedTask(t)}
                              className="text-left text-sm font-medium hover:text-primary hover:underline transition-colors"
                              title="Abrir tarefa"
                            >
                              {t.title}
                            </button>
                            {(t.tags?.length ?? 0) > 0 && (
                              <div className="flex flex-wrap gap-1 px-1.5">
                                {t.tags!.map(tag => (
                                  <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${tagColor(tag)}`}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <select
                            value={t.status}
                            onChange={(e) => updateTask(t.id, { status: e.target.value as TaskStatus })}
                            onClick={(e) => e.stopPropagation()}
                            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold cursor-pointer outline-none ${STATUS_META[t.status] ?? 'bg-muted text-foreground border-border'}`}
                          >
                            {STATUS_OPTIONS.map(o => (
                              <option key={o.status} value={o.status}>{o.label}</option>
                            ))}
                          </select>
                        </TableCell>
                        {!isClient && (
                          <TableCell className="text-xs" onClick={(e) => e.stopPropagation()}>
                            <AssigneeSelect
                              value={t.assignee}
                              onChange={(v) => updateTask(t.id, { assignee: v })}
                              size="sm"
                              className="min-w-[140px] border-transparent hover:border-input"
                            />
                          </TableCell>
                        )}
                        <TableCell className={`text-xs ${overdue ? 'text-destructive font-medium' : ''}`}>
                          <input
                            type="date"
                            value={deadlineInput}
                            onChange={(e) => updateTask(t.id, { deadline: e.target.value || null as any })}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent border border-transparent hover:border-input rounded px-1.5 py-1 text-xs outline-none cursor-pointer"
                          />
                        </TableCell>
                        {!isClient && (
                          <TableCell>
                            <select
                              value={t.priority}
                              onChange={(e) => updateTask(t.id, { priority: e.target.value as Priority })}
                              onClick={(e) => e.stopPropagation()}
                              className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold cursor-pointer outline-none ${meta.classes}`}
                            >
                              {Object.keys(PRIORITY_META).map(p => (
                                <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                              ))}
                            </select>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setSelectedTask(t)}
                              title="Abrir tarefa"
                            >
                              <Maximize2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Excluir a tarefa "${t.title}"?`)) {
                                  deleteTask(t.id);
                                }
                              }}
                              title="Excluir tarefa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!isClient && (
                    <InlineNewTaskRow
                      clientId={group.id === INTERNAL_KEY ? null : group.id}
                    />
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
        {totalShown === 0 && (
          <div className="text-sm text-muted-foreground italic text-center py-12">
            Nenhuma tarefa encontrada com os filtros atuais.
          </div>
        )}
      </div>

      <TaskDetailDialog
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(o) => !o && setSelectedTask(null)}
      />

      <QuickTaskDialog
        open={quickOpen}
        onOpenChange={setQuickOpen}
      />
    </div>
  );
}

function InlineNewTaskRow({ clientId }: { clientId: string | null }) {
  const { addTask } = useData();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const t = title.trim();
    if (!t || saving) return;
    setSaving(true);
    try {
      await addTask({
        title: t,
        description: '',
        clientId,
        projectId: null,
        assignee: null,
        priority: 'Média',
        status: 'A fazer',
        type: clientId ? 'Cliente' : 'Administrativo',
        deadline: null,
        visibleToClient: false,
        recurrence: 'none',
      } as any);
      setTitle('');
    } catch {
      toast.error('Não foi possível criar a tarefa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TableRow className="hover:bg-muted/20">
      <TableCell colSpan={6}>
        <div className="flex items-center gap-2">
          <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
            }}
            placeholder="+ Adicionar tarefa (Enter para criar)"
            className="h-8 border-transparent bg-transparent focus-visible:bg-background focus-visible:border-input text-sm"
            disabled={saving}
          />
          {title.trim() && (
            <Button size="sm" variant="ghost" onClick={handleCreate} disabled={saving} className="h-7">
              Criar
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function MultiFilter({
  label, allLabel, options, selected, onChange,
}: {
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const all = selected.length === 0;
  const display = all
    ? allLabel
    : selected.length === 1
      ? (options.find(o => o.value === selected[0])?.label ?? selected[0])
      : `${label} (${selected.length})`;
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 min-w-[160px] justify-between gap-2">
          <span className="truncate text-sm">{display}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="flex items-center justify-between px-1 pb-1">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => onChange([])}
          >
            Limpar
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {options.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground">Sem opções</div>
          )}
          {options.map(o => {
            const checked = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent text-left"
              >
                <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? 'bg-primary border-primary text-primary-foreground' : 'border-input'}`}>
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <span className="truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
