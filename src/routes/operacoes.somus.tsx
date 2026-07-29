import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  Building2, Plus, Trash2, CalendarDays, Flag, User2, Sparkles, Search, EyeOff,
  CheckCircle2, Clock, AlertTriangle, ListChecks, X,
} from 'lucide-react';
import { OpPageHeader } from '@/components/operacoes/OpPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  useOpStore, opStore, STATUS_META, STATUS_ORDER,
  type OpStatus, type OpPriority, type OpTask,
} from '@/lib/operacoes-store';
import { formatLocalDate, isBeforeToday, isToday } from '@/lib/date-utils';
import { NewInternalProjectDialog } from '@/components/operacoes/NewInternalProjectDialog';

export const Route = createFileRoute('/operacoes/somus')({
  component: ProjetoSomusPage,
  head: () => ({
    meta: [
      { title: 'Projeto Somus — Operações internas' },
      { name: 'description', content: 'Projetos e demandas internas da Somus: iniciativas da própria empresa, com kanban por status e responsáveis.' },
      { property: 'og:title', content: 'Projeto Somus — Operações internas' },
      { property: 'og:description', content: 'Projetos e demandas internas da Somus, organizados em kanban por status.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
});

const INTERNAL_FOLDER = 'Projeto Somus';

const PRIORITY_META: Record<OpPriority, { label: string; cls: string }> = {
  alta:  { label: 'Alta',  cls: 'bg-red-500/10 text-red-700 border-red-500/25 dark:text-red-300' },
  media: { label: 'Média', cls: 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300' },
  baixa: { label: 'Baixa', cls: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-300' },
};

const BOARD_STATUSES = STATUS_ORDER;

function ProjetoSomusPage() {
  const store = useOpStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const folder = store.folders.find(f => f.name.toLowerCase() === INTERNAL_FOLDER.toLowerCase());
  const projects = useMemo(
    () => store.projects.filter(p => folder && p.folderId === folder.id),
    [store.projects, folder],
  );

  const sectionsByProject = (projectId: string) => store.sections.filter(s => s.projectId === projectId);
  const tasksOfProject = (projectId: string) => {
    const ids = new Set(sectionsByProject(projectId).map(s => s.id));
    return store.tasks.filter(t => ids.has(t.sectionId));
  };

  const allTasks = useMemo(() => projects.flatMap(p => tasksOfProject(p.id)), [projects, store.tasks, store.sections]);
  const openTasks = allTasks.filter(t => t.status !== 'concluido');
  const doneTasks = allTasks.filter(t => t.status === 'concluido');
  const lateTasks = openTasks.filter(t => t.status !== 'aprovacao_cliente' && isBeforeToday(t.dueDate));
  const todayTasks = openTasks.filter(t => isToday(t.dueDate));

  const active = projects.find(p => p.id === selectedId) ?? projects[0] ?? null;

  const ensureFolderId = () => {
    let folderId = folder?.id;
    if (!folderId) {
      opStore.addFolder(INTERNAL_FOLDER);
      folderId = opStore.get().folders.find(f => f.name === INTERNAL_FOLDER)?.id;
    }
    return folderId;
  };

  return (
    <div className="w-full pb-16 pt-6">
      <NewInternalProjectDialog
        open={creating}
        onOpenChange={setCreating}
        folderId={ensureFolderId}
        users={store.users}
        onCreated={setSelectedId}
      />
      <OpPageHeader
        eyebrow="Interno · Alcateia"
        title="Projeto Somus"
        icon={<Building2 className="h-4 w-4" />}
        description="Aqui ficam os projetos e demandas da própria Somus — o que construímos para dentro de casa. Os demais módulos seguem sendo dos clientes."
        actions={
          <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Novo projeto interno
          </Button>
        }
      />


      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Sparkles} label="Projetos internos" value={projects.length} tone="neutral" />
        <Kpi icon={ListChecks} label="Demandas abertas" value={openTasks.length} tone="blue" />
        <Kpi icon={Clock} label="Para hoje" value={todayTasks.length} tone="amber" />
        <Kpi icon={AlertTriangle} label="Em atraso" value={lateTasks.length} tone="red" />
      </div>

      {projects.length === 0 ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Lista de projetos */}
          <aside className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Iniciativas
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{projects.length}</span>
            </div>
            {projects.map(p => (
              <ProjectItem
                key={p.id}
                name={p.name}
                ownerId={p.ownerId}
                tasks={tasksOfProject(p.id)}
                users={store.users}
                active={active?.id === p.id}
                onSelect={() => setSelectedId(p.id)}
                onRename={(n) => opStore.renameProject(p.id, n)}
                onSetOwner={(uid) => opStore.setProjectOwner(p.id, uid)}
              />
            ))}
          </aside>

          {/* Board */}
          {active && <ProjectBoard key={active.id} projectId={active.id} projectName={active.name} />}
        </div>
      )}
    </div>
  );
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

function ProjectItem({
  name, ownerId, tasks, users, active, onSelect, onRename, onSetOwner,
}: {
  name: string;
  ownerId?: string;
  tasks: OpTask[];
  users: { id: string; name: string }[];
  active: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onSetOwner: (ownerId?: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const owner = users.find(u => u.id === ownerId);


  const done = tasks.filter(t => t.status === 'concluido').length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const late = tasks.filter(t => t.status !== 'concluido' && t.status !== 'aprovacao_cliente' && isBeforeToday(t.dueDate)).length;
  const crew = Array.from(new Set(tasks.map(t => t.assigneeId).filter(Boolean) as string[]))
    .map(id => users.find(u => u.id === id)).filter(Boolean).slice(0, 4) as { id: string; name: string }[];

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group w-full cursor-pointer rounded-xl border p-3 text-left transition-all',
        active
          ? 'border-foreground/40 bg-muted/50 shadow-sm'
          : 'border-border/60 bg-card hover:border-foreground/25 hover:bg-muted/30',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <Input
            autoFocus
            value={draft}
            onClick={e => e.stopPropagation()}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => { if (draft.trim()) onRename(draft.trim()); setEditing(false); }}
            onKeyDown={e => {
              if (e.key === 'Enter') { if (draft.trim()) onRename(draft.trim()); setEditing(false); }
              if (e.key === 'Escape') { setDraft(name); setEditing(false); }
            }}
            className="h-7 px-1 text-[13.5px]"
          />
        ) : (
          <span
            className="text-[13.5px] font-medium leading-snug"
            onDoubleClick={e => { e.stopPropagation(); setDraft(name); setEditing(true); }}
            title="Duplo clique para renomear"
          >
            {name}
          </span>
        )}
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{pct}%</span>
      </div>

      <Progress value={pct} className="mt-2 h-1" />

      <div className="mt-2" onClick={e => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium transition-colors',
                owner
                  ? 'border-foreground/20 bg-muted/60 text-foreground'
                  : 'border-dashed border-border text-muted-foreground hover:text-foreground',
              )}
              title="Responsável pelo projeto"
            >
              <User2 className="h-3 w-3" />
              {owner?.name ?? 'Definir responsável'}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
            <DropdownMenuLabel className="text-[11px]">Responsável pelo projeto</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSetOwner(undefined)}>Sem responsável</DropdownMenuItem>
            {users.map(u => (
              <DropdownMenuItem key={u.id} onClick={() => onSetOwner(u.id)}>{u.name}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>


      <div className="mt-2 flex items-center gap-2">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{tasks.length} demandas</span>
          {late > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-300">
              <AlertTriangle className="h-2.5 w-2.5" />{late}
            </span>
          )}
        </div>
        <div className="ml-auto flex -space-x-1.5">
          {crew.map(u => (
            <span
              key={u.id}
              title={u.name}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-background bg-muted text-[9px] font-semibold text-muted-foreground"
            >
              {initials(u.name)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectBoard({ projectId, projectName }: { projectId: string; projectName: string }) {
  const store = useOpStore();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<OpStatus | null>(null);
  const [adding, setAdding] = useState<OpStatus | null>(null);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<string | 'all'>('all');
  const [hideDone, setHideDone] = useState(false);

  const sections = store.sections.filter(s => s.projectId === projectId);
  const sectionId = sections[0]?.id;
  const allTasks = store.tasks.filter(t => sections.some(s => s.id === t.sectionId));

  const q = query.trim().toLowerCase();
  const tasks = allTasks.filter(t => {
    if (q && !t.name.toLowerCase().includes(q)) return false;
    if (assigneeFilter !== 'all' && t.assigneeId !== assigneeFilter) return false;
    return true;
  });

  const crew = Array.from(new Set(allTasks.map(t => t.assigneeId).filter(Boolean) as string[]))
    .map(id => store.users.find(u => u.id === id)).filter(Boolean) as { id: string; name: string }[];

  const ensureSection = () => sectionId ?? opStore.addSection(projectId, 'Geral');

  const addTask = (status: OpStatus) => {
    const name = draft.trim();
    if (!name) return;
    const sid = ensureSection();
    const id = opStore.addTask(sid, name);
    if (status !== 'nao_iniciado') opStore.updateTask(id, { status });
    setDraft('');
  };

  const drop = (status: OpStatus) => {
    if (dragId) opStore.updateTask(dragId, { status });
    setDragId(null);
    setOverStatus(null);
  };

  const visibleStatuses = hideDone ? BOARD_STATUSES.filter(s => s !== 'concluido') : BOARD_STATUSES;
  const doneCount = allTasks.filter(t => t.status === 'concluido').length;
  const pct = allTasks.length ? Math.round((doneCount / allTasks.length) * 100) : 0;

  return (
    <section className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[19px] font-semibold tracking-tight">{projectName}</h2>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1 w-28 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {doneCount}/{allTasks.length} concluídas
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar demanda"
              className="h-8 w-48 pl-8 text-[12.5px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[12px]">
                <User2 className="h-3.5 w-3.5" />
                {assigneeFilter === 'all' ? 'Todos' : (store.users.find(u => u.id === assigneeFilter)?.name ?? 'Todos')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
              <DropdownMenuLabel className="text-[11px]">Filtrar por responsável</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAssigneeFilter('all')}>Todos</DropdownMenuItem>
              {crew.map(u => (
                <DropdownMenuItem key={u.id} onClick={() => setAssigneeFilter(u.id)}>{u.name}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant={hideDone ? 'default' : 'outline'}
            className="h-8 gap-1.5 text-[12px]"
            onClick={() => setHideDone(v => !v)}
          >
            <EyeOff className="h-3.5 w-3.5" /> Ocultar concluídas
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm(`Excluir o projeto interno "${projectName}" e todas as suas demandas?`)) {
                opStore.removeProject(projectId);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3">
        {visibleStatuses.map(status => {
          const meta = STATUS_META[status];
          const items = tasks
            .filter(t => t.status === status)
            .sort((a, b) => {
              const rank = { alta: 0, media: 1, baixa: 2 } as const;
              const r = rank[a.priority] - rank[b.priority];
              if (r !== 0) return r;
              return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
            });
          const lateHere = items.filter(t => status !== 'concluido' && status !== 'aprovacao_cliente' && isBeforeToday(t.dueDate)).length;
          return (
            <div
              key={status}
              onDragOver={e => { e.preventDefault(); setOverStatus(status); }}
              onDragLeave={() => setOverStatus(s => (s === status ? null : s))}
              onDrop={() => drop(status)}
              className={cn(
                'flex w-[280px] shrink-0 flex-col rounded-2xl border bg-muted/20 p-2.5 transition-colors',
                overStatus === status ? 'border-foreground/40 bg-muted/50 ring-2 ring-foreground/10' : 'border-border/60',
              )}
            >
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em]">{meta.label}</span>
                {lateHere > 0 && (
                  <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-red-700 dark:text-red-300">
                    {lateHere} atrasada{lateHere > 1 ? 's' : ''}
                  </span>
                )}
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{items.length}</span>
              </div>


              <div className="flex flex-col gap-2">
                {items.length === 0 && adding !== status && (
                  <div className="rounded-xl border border-dashed border-border/50 px-2.5 py-4 text-center text-[11px] text-muted-foreground">
                    {overStatus === status ? 'Solte aqui' : 'Nada por aqui'}
                  </div>
                )}
                {items.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    dragging={dragId === task.id}
                    onDragStart={() => setDragId(task.id)}
                    onDragEnd={() => setDragId(null)}
                  />
                ))}


                {adding === status ? (
                  <div className="rounded-xl border border-dashed border-foreground/30 bg-card p-2">
                    <Input
                      autoFocus
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') addTask(status);
                        if (e.key === 'Escape') { setAdding(null); setDraft(''); }
                      }}
                      onBlur={() => { addTask(status); setAdding(null); }}
                      placeholder="Nome da demanda"
                      className="h-8 border-0 px-1 text-[13px] shadow-none focus-visible:ring-0"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => { setAdding(status); setDraft(''); }}
                    className="flex items-center gap-1.5 rounded-xl border border-dashed border-border/70 px-2.5 py-2 text-[12px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar demanda
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TaskCard({
  task, dragging, onDragStart, onDragEnd,
}: { task: OpTask; dragging: boolean; onDragStart: () => void; onDragEnd: () => void }) {
  const store = useOpStore();
  const assignee = store.users.find(u => u.id === task.assigneeId);
  const late = task.status !== 'concluido' && task.status !== 'aprovacao_cliente' && isBeforeToday(task.dueDate);
  const today = isToday(task.dueDate);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'group cursor-grab rounded-xl border border-border/60 bg-card p-2.5 shadow-sm transition-all active:cursor-grabbing',
        'hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-md',
        dragging && 'opacity-40',
      )}
    >
      <div className="flex items-start gap-2">
        <p className={cn('flex-1 text-[13px] font-medium leading-snug', task.status === 'concluido' && 'text-muted-foreground line-through')}>
          {task.name}
        </p>
        <button
          onClick={() => opStore.removeTask(task.id)}
          className="opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Excluir demanda"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {/* Prioridade */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium', PRIORITY_META[task.priority].cls)}>
              <Flag className="h-2.5 w-2.5" />{PRIORITY_META[task.priority].label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="text-[11px]">Prioridade</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(['alta', 'media', 'baixa'] as OpPriority[]).map(p => (
              <DropdownMenuItem key={p} onClick={() => opStore.updateTask(task.id, { priority: p })}>
                {PRIORITY_META[p].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Responsável */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground">
              <User2 className="h-2.5 w-2.5" />{assignee?.name ?? 'Responsável'}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
            <DropdownMenuLabel className="text-[11px]">Responsável</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => opStore.updateTask(task.id, { assigneeId: undefined })}>Sem responsável</DropdownMenuItem>
            {store.users.map(u => (
              <DropdownMenuItem key={u.id} onClick={() => opStore.updateTask(task.id, { assigneeId: u.id })}>{u.name}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Prazo */}
        <label
          className={cn(
            'relative inline-flex cursor-pointer items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px]',
            late ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
              : today ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              : 'border-border/70 bg-muted/40 text-muted-foreground',
          )}
        >
          <CalendarDays className="h-2.5 w-2.5" />
          {task.dueDate ? formatLocalDate(task.dueDate) : 'Prazo'}
          <input
            type="date"
            value={task.dueDate ?? ''}
            onChange={e => opStore.updateTask(task.id, { dueDate: e.target.value || undefined })}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>

        {task.status !== 'concluido' && (
          <button
            onClick={() => opStore.updateTask(task.id, { status: 'concluido' })}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-600/25 bg-emerald-600/10 px-1.5 py-0.5 text-[10px] text-emerald-700 opacity-0 transition-opacity group-hover:opacity-100 dark:text-emerald-300"
          >
            <CheckCircle2 className="h-2.5 w-2.5" /> Concluir
          </button>
        )}
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon, label, value, tone,
}: { icon: any; label: string; value: number; tone: 'neutral' | 'blue' | 'amber' | 'red' }) {
  const tones = {
    neutral: 'text-foreground',
    blue: 'text-blue-600 dark:text-blue-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
  } as const;
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className={cn('h-3.5 w-3.5', tones[tone])} />
        {label}
      </div>
      <div className={cn('mt-2 font-display text-[30px] font-semibold leading-none tracking-tight', tones[tone])}>
        {value}
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-border/70 bg-muted/20 px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-foreground text-background">
        <Building2 className="h-5 w-5" />
      </div>
      <h2 className="mt-4 font-display text-[22px] font-semibold tracking-tight">Nenhum projeto interno ainda</h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] text-muted-foreground">
        Este espaço é só da Somus: rebranding, site institucional, cultura, produto próprio, processos internos.
        Crie a primeira iniciativa e organize as demandas em kanban.
      </p>
      <Button className="mt-5 gap-1.5" onClick={onCreate}>
        <Plus className="h-4 w-4" /> Criar primeiro projeto
      </Button>
    </div>
  );
}
