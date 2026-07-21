import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  Plus, Trash2, ChevronRight, ChevronDown, FolderKanban, LayoutList,
  KanbanSquare, GanttChart, LayoutGrid, Save, X, MessageSquare, Check, Tag,
  MoreHorizontal, Search, Sparkles, FolderPlus, FilePlus, GripVertical, ArrowUp, ArrowDown,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  useOpStore, opStore, STATUS_META, STATUS_ORDER, CARGO_COLOR_MAP, getTaskClientName,
  type OpStatus, type OpTask, type OpPriority,
} from '@/lib/operacoes-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { AttachmentsPanel } from '@/components/shared/AttachmentsPanel';

export const Route = createFileRoute('/operacoes/projetos')({
  component: OperacoesProjetos,
});

type View = 'lista' | 'kanban' | 'gantt' | 'cartao';

function OperacoesProjetos() {
  const store = useOpStore();
  const [selectedProject, setSelectedProject] = useState<string | null>(store.projects[0]?.id ?? null);
  const [view, setView] = useState<View>('lista');
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(store.folders.map(f => [f.id, true])),
  );
  const [taskDetail, setTaskDetail] = useState<string | null>(null);
  const [showSaveTpl, setShowSaveTpl] = useState(false);

  const project = store.projects.find(p => p.id === selectedProject) ?? null;
  const sections = useMemo(
    () => store.sections.filter(s => s.projectId === project?.id).sort((a, b) => a.order - b.order),
    [store.sections, project?.id],
  );
  const tasks = useMemo(
    () => store.tasks.filter(t => sections.some(s => s.id === t.sectionId)),
    [store.tasks, sections],
  );

  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-0 flex-1">
      {/* Sidebar */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-border/60 bg-muted/10">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div>
            <div className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</div>
            <div className="font-display text-[14px] font-semibold tracking-tight">Projetos</div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-7 gap-1 px-2 text-[11px]">
                <Plus className="h-3.5 w-3.5" /> Novo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={() => {
                  const name = prompt('Nome da pasta:');
                  if (name?.trim()) opStore.addFolder(name.trim());
                }}
              >
                <FolderPlus className="mr-2 h-3.5 w-3.5" /> Nova pasta
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const folder = store.folders[0];
                  if (!folder) { alert('Crie uma pasta primeiro.'); return; }
                  const name = prompt(`Nome do projeto em "${folder.name}":`);
                  if (name?.trim()) {
                    const id = opStore.addProject(folder.id, name.trim());
                    setSelectedProject(id);
                  }
                }}
              >
                <FilePlus className="mr-2 h-3.5 w-3.5" /> Projeto em branco
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/operacoes/modelos">
                  <Sparkles className="mr-2 h-3.5 w-3.5" /> A partir de modelo
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {store.folders.length === 0 && (
            <div className="mt-6 rounded-lg border border-dashed border-border/60 p-4 text-center">
              <FolderKanban className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-[12px] font-medium">Sem pastas ainda</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Crie uma pasta em "+ Novo" para começar a organizar seus projetos.</p>
            </div>
          )}
          {store.folders.map(folder => {
            const open = openFolders[folder.id] ?? true;
            const projs = store.projects.filter(p => p.folderId === folder.id);
            return (
              <div key={folder.id} className="mb-1">
                <div className="group flex items-center gap-1 rounded-md px-1.5 py-1.5 hover:bg-muted/50">
                  <button
                    onClick={() => setOpenFolders(o => ({ ...o, [folder.id]: !open }))}
                    className="rounded p-0.5 hover:bg-muted"
                  >
                    {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate text-[12.5px] font-medium">{folder.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{projs.length}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded p-0.5 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          const name = prompt(`Nome do projeto em "${folder.name}":`);
                          if (name?.trim()) {
                            const id = opStore.addProject(folder.id, name.trim());
                            setSelectedProject(id);
                          }
                        }}
                      >
                        <Plus className="mr-2 h-3.5 w-3.5" /> Novo projeto aqui
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const name = prompt('Renomear pasta:', folder.name);
                          if (name?.trim()) opStore.renameFolder(folder.id, name.trim());
                        }}
                      >
                        Renomear
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => { if (confirm(`Excluir pasta "${folder.name}" e todo o seu conteúdo?`)) opStore.removeFolder(folder.id); }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir pasta
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {open && (
                  <div className="ml-6 space-y-0.5 border-l border-border/50 pl-2">
                    {projs.map(p => {
                      const secs = store.sections.filter(s => s.projectId === p.id);
                      const secIds = new Set(secs.map(s => s.id));
                      const pts = store.tasks.filter(t => secIds.has(t.sectionId));
                      const done = pts.filter(t => t.status === 'concluido').length;
                      const pct = pts.length ? Math.round((done / pts.length) * 100) : 0;
                      const active = selectedProject === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelectedProject(p.id)}
                          className={`block w-full rounded-md px-2 py-1.5 text-left text-[12px] transition-colors ${
                            active ? 'bg-foreground text-background' : 'hover:bg-muted/60 text-foreground'
                          }`}
                        >
                          <div className="truncate font-medium">{p.name}</div>
                          {pts.length > 0 && (
                            <div className="mt-1 flex items-center gap-1.5">
                              <div className={`h-1 flex-1 overflow-hidden rounded-full ${active ? 'bg-background/25' : 'bg-muted'}`}>
                                <div className={`h-full ${active ? 'bg-background' : 'bg-foreground/80'}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className={`font-mono text-[9.5px] ${active ? 'text-background/80' : 'text-muted-foreground'}`}>
                                {done}/{pts.length}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                    {projs.length === 0 && <p className="px-2 py-1 text-[11px] italic text-muted-foreground">Sem projetos</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {!project ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="max-w-md rounded-2xl border border-dashed border-border/60 bg-muted/10 p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background">
                <FolderKanban className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold tracking-tight">Nenhum projeto aberto</h3>
              <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                Escolha um projeto na lateral, crie um novo em "+ Novo", ou parta de um modelo pronto.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button asChild size="sm" variant="outline"><Link to="/operacoes/modelos"><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Modelos</Link></Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-border/60 px-6 pt-4 pb-3">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-0.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    <FolderKanban className="h-3 w-3" />
                    {store.folders.find(f => f.id === project.folderId)?.name ?? '—'}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="truncate font-display text-xl font-semibold tracking-tight">{project.name}</h2>
                    <Select value={project.status} onValueChange={(v: any) => opStore.updateProjectStatus(project.id, v)}>
                      <SelectTrigger className="h-6 w-36 text-[10.5px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nao_iniciado">Não iniciado</SelectItem>
                        <SelectItem value="em_andamento">Em andamento</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="pausado">Pausado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    <span className="font-mono">{sections.length}</span> {sections.length === 1 ? 'seção' : 'seções'}
                    {' · '}
                    <span className="font-mono">{tasks.length}</span> {tasks.length === 1 ? 'tarefa' : 'tarefas'}
                    {tasks.length > 0 && (
                      <>
                        {' · '}
                        <span className="font-mono">{Math.round((tasks.filter(t => t.status === 'concluido').length / tasks.length) * 100)}%</span> concluído
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => {
                    const name = prompt('Nome da seção:');
                    if (name?.trim()) opStore.addSection(project.id, name.trim());
                  }}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Nova seção
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        const name = prompt('Renomear projeto:', project.name);
                        if (name?.trim()) opStore.renameProject(project.id, name.trim());
                      }}>
                        Renomear projeto
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowSaveTpl(true)}>
                        <Save className="mr-2 h-3.5 w-3.5" /> Salvar como modelo
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm(`Excluir projeto "${project.name}"?`)) {
                            opStore.removeProject(project.id);
                            setSelectedProject(null);
                          }
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir projeto
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* View switcher — clearer, labeled */}
              <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
                {([
                  { v: 'lista',  Icon: LayoutList,   label: 'Lista',  hint: 'Detalhes por linha' },
                  { v: 'kanban', Icon: KanbanSquare, label: 'Kanban', hint: 'Fluxo por status' },
                  { v: 'gantt',  Icon: GanttChart,   label: 'Gantt',  hint: 'Cronograma' },
                  { v: 'cartao', Icon: LayoutGrid,   label: 'Cartão', hint: 'Grade visual' },
                ] as const).map(x => (
                  <button
                    key={x.v}
                    onClick={() => setView(x.v)}
                    title={x.hint}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                      view === x.v
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <x.Icon className="h-3.5 w-3.5" /> {x.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4">
              {view === 'lista' && <ListView projectId={project.id} onOpenTask={setTaskDetail} />}
              {view === 'kanban' && <KanbanView projectId={project.id} onOpenTask={setTaskDetail} />}
              {view === 'gantt' && <GanttView projectId={project.id} />}
              {view === 'cartao' && <CardView projectId={project.id} onOpenTask={setTaskDetail} />}
            </div>
          </>
        )}
      </div>

      <TaskDetailDialog taskId={taskDetail} onClose={() => setTaskDetail(null)} />
      <SaveTemplateDialog open={showSaveTpl} onOpenChange={setShowSaveTpl} projectId={project?.id ?? null} />
    </div>
  );
}


// ============= List View =============

function ListView({ projectId, onOpenTask }: { projectId: string; onOpenTask: (id: string) => void }) {
  const store = useOpStore();
  const sections = store.sections.filter(s => s.projectId === projectId).sort((a, b) => a.order - b.order);
  return (
    <div className="space-y-4">
      {sections.map(section => {
        const tasks = store.tasks.filter(t => t.sectionId === section.id);
        return (
          <div key={section.id} className="rounded-lg border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-2">
              <h3 className="font-display text-[13px] font-semibold tracking-tight">{section.name}</h3>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-muted-foreground mr-1">{tasks.length}</span>
                <button
                  onClick={() => {
                    const name = prompt('Nome da tarefa:');
                    if (name?.trim()) opStore.addTask(section.id, name.trim());
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { if (confirm('Excluir seção?')) opStore.removeSection(section.id); }}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-border/60">
              {tasks.map((t, idx) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onOpen={() => onOpenTask(t.id)}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < tasks.length - 1}
                />
              ))}
              {tasks.length === 0 && (
                <div className="px-4 py-3 text-[11.5px] italic text-muted-foreground">Nenhuma tarefa.</div>
              )}
            </div>
          </div>
        );
      })}
      {sections.length === 0 && (
        <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          Sem seções — clique em "+ Seção".
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task, onOpen, canMoveUp = true, canMoveDown = true,
}: { task: OpTask; onOpen: () => void; canMoveUp?: boolean; canMoveDown?: boolean }) {
  const store = useOpStore();
  const meta = STATUS_META[task.status];
  void store.users.find(u => u.id === task.assigneeId);
  const done = task.checklist.filter(c => c.done).length;
  const [dragOver, setDragOver] = useState<'top' | 'bottom' | null>(null);
  return (
    <div
      className={`relative flex items-center gap-2 px-3 py-2 hover:bg-muted/20 ${
        dragOver === 'top' ? 'border-t-2 border-t-primary' : dragOver === 'bottom' ? 'border-b-2 border-b-primary' : ''
      }`}
      onDragOver={e => {
        e.preventDefault();
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        setDragOver(e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom');
      }}
      onDragLeave={() => setDragOver(null)}
      onDrop={e => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/task-id');
        const pos = dragOver === 'top' ? 'before' : 'after';
        setDragOver(null);
        if (draggedId && draggedId !== task.id) opStore.reorderTask(draggedId, task.id, pos);
      }}
    >
      <div
        draggable
        onDragStart={e => { e.dataTransfer.setData('text/task-id', task.id); e.dataTransfer.effectAllowed = 'move'; }}
        className="flex cursor-grab items-center text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
        title="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex flex-col">
        <button
          onClick={() => opStore.moveTask(task.id, 'up')}
          disabled={!canMoveUp}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
          title="Mover para cima"
        >
          <ArrowUp className="h-3 w-3" />
        </button>
        <button
          onClick={() => opStore.moveTask(task.id, 'down')}
          disabled={!canMoveDown}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
          title="Mover para baixo"
        >
          <ArrowDown className="h-3 w-3" />
        </button>
      </div>
      <input
        type="checkbox"
        checked={task.status === 'concluido'}
        onChange={e => opStore.updateTask(task.id, { status: e.target.checked ? 'concluido' : 'nao_iniciado' })}
        className="h-4 w-4 rounded border-border"
      />
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-[12.5px] hover:underline">
        <span className="shrink-0 rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground" title="Cliente">
          {getTaskClientName(store, task)}
        </span>
        <span className="truncate">{task.name}</span>
        {task.checklist.length > 0 && (
          <span className="ml-1 shrink-0 text-[10px] text-muted-foreground">({done}/{task.checklist.length})</span>
        )}
      </button>
      <Select value={task.assigneeId ?? '__none'} onValueChange={v => opStore.updateTask(task.id, { assigneeId: v === '__none' ? undefined : v })}>
        <SelectTrigger className="h-7 w-32 text-[11px]">
          <SelectValue placeholder="Ninguém" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">Ninguém</SelectItem>
          {store.users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input
        type="date"
        value={task.dueDate ?? ''}
        onChange={e => opStore.updateTask(task.id, { dueDate: e.target.value || undefined })}
        className="h-7 w-32 text-[11px]"
      />
      <Select value={task.status} onValueChange={(v: OpStatus) => opStore.updateTask(task.id, { status: v })}>
        <SelectTrigger className={`h-7 w-40 border text-[11px] ${meta.color}`}>
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          {STATUS_ORDER.map(s => (
            <SelectItem key={s} value={s}>
              <span className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
                {STATUS_META[s].label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={task.priority} onValueChange={(v: OpPriority) => opStore.updateTask(task.id, { priority: v })}>
        <SelectTrigger className="h-7 w-20 text-[11px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="baixa">Baixa</SelectItem>
          <SelectItem value="media">Média</SelectItem>
          <SelectItem value="alta">Alta</SelectItem>
        </SelectContent>
      </Select>
      <button onClick={() => opStore.removeTask(task.id)} className="rounded p-1 text-destructive/60 hover:bg-destructive/10 hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ============= Kanban =============

function KanbanView({ projectId, onOpenTask }: { projectId: string; onOpenTask: (id: string) => void }) {
  const store = useOpStore();
  const [query, setQuery] = useState('');
  const [assignee, setAssignee] = useState<string>('__all');
  const [priority, setPriority] = useState<string>('__all');
  const [dragOver, setDragOver] = useState<OpStatus | null>(null);
  const [addingIn, setAddingIn] = useState<OpStatus | null>(null);
  const [newName, setNewName] = useState('');

  const sections = store.sections.filter(s => s.projectId === projectId).sort((a, b) => a.order - b.order);
  const sectionIds = new Set(sections.map(s => s.id));
  const firstSectionId = sections[0]?.id;
  const q = query.trim().toLowerCase();
  const tasks = store.tasks.filter(t =>
    sectionIds.has(t.sectionId)
    && (!q || t.name.toLowerCase().includes(q))
    && (assignee === '__all' || t.assigneeId === assignee || (assignee === '__none' && !t.assigneeId))
    && (priority === '__all' || t.priority === priority),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar tarefa…"
          className="h-8 w-56 text-[12px]"
        />
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="h-8 w-40 text-[11.5px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos responsáveis</SelectItem>
            <SelectItem value="__none">Sem responsável</SelectItem>
            {store.users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-8 w-32 text-[11.5px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todas prioridades</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
        {(q || assignee !== '__all' || priority !== '__all') && (
          <button
            onClick={() => { setQuery(''); setAssignee('__all'); setPriority('__all'); }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
          >
            <X className="h-3 w-3" /> Limpar
          </button>
        )}
        <span className="ml-auto font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
          {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
        </span>
      </div>

      <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
        {STATUS_ORDER.map(status => {
          const meta = STATUS_META[status];
          const items = tasks.filter(t => t.status === status);
          const isOver = dragOver === status;
          return (
            <div
              key={status}
              className={`w-72 shrink-0 rounded-lg border bg-muted/10 transition-colors ${
                isOver ? 'border-foreground/60 bg-foreground/5 ring-2 ring-foreground/20' : 'border-border/60'
              }`}
              onDragOver={e => { e.preventDefault(); if (dragOver !== status) setDragOver(status); }}
              onDragLeave={() => setDragOver(prev => (prev === status ? null : prev))}
              onDrop={e => {
                setDragOver(null);
                const id = e.dataTransfer.getData('text/plain');
                if (id) opStore.updateTask(id, { status });
              }}
            >
              <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                <span className="text-[12px] font-semibold">{meta.label}</span>
                <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{items.length}</span>
                <button
                  onClick={() => { setAddingIn(status); setNewName(''); }}
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
                  title="Adicionar tarefa"
                  disabled={!firstSectionId}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-2 p-2 min-h-[120px]">
                {addingIn === status && firstSectionId && (
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      if (newName.trim()) {
                        opStore.addTask(firstSectionId, newName.trim());
                        const created = opStore.get().tasks.filter(t => t.sectionId === firstSectionId).slice(-1)[0];
                        if (created) opStore.updateTask(created.id, { status });
                        setNewName('');
                        setAddingIn(null);
                      }
                    }}
                    className="rounded-md border border-dashed border-border/60 bg-card p-1.5"
                  >
                    <Input
                      autoFocus
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onBlur={() => { if (!newName.trim()) setAddingIn(null); }}
                      onKeyDown={e => { if (e.key === 'Escape') setAddingIn(null); }}
                      placeholder="Nome da tarefa e Enter"
                      className="h-7 border-0 text-[12px] focus-visible:ring-0"
                    />
                  </form>
                )}
                {items.map(t => {
                  const assignee = store.users.find(u => u.id === t.assigneeId);
                  const overdue = !!t.dueDate && t.status !== 'concluido' && new Date(t.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={e => e.dataTransfer.setData('text/plain', t.id)}
                      onClick={() => onOpenTask(t.id)}
                      className="group cursor-grab rounded-md border border-border/60 bg-card p-2.5 transition-all hover:-translate-y-px hover:border-foreground/30 hover:shadow-md active:cursor-grabbing"
                    >
                      <div className="mb-1 flex items-center gap-1">
                        <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground" title="Cliente">
                          {getTaskClientName(store, t)}
                        </span>
                        {t.priority === 'alta' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                            <span className="h-1 w-1 rounded-full bg-red-500" /> Alta
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] leading-snug">{t.name}</p>
                      <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                        {assignee && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-foreground font-mono text-[8px] font-bold text-background">
                              {assignee.name[0]}
                            </span>
                            {assignee.name.split(' ')[0]}
                          </span>
                        )}
                        {t.checklist.length > 0 && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">
                            {t.checklist.filter(c => c.done).length}/{t.checklist.length}
                          </span>
                        )}
                        {t.dueDate && (
                          <span className={`ml-auto rounded-full px-1.5 py-0.5 ${overdue ? 'bg-red-500/15 text-red-600 dark:text-red-400 font-semibold' : 'bg-muted text-muted-foreground'}`}>
                            {new Date(t.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && addingIn !== status && (
                  <p className="px-1 py-3 text-center text-[11px] italic text-muted-foreground">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ============= Gantt (simples, barras horizontais) =============

function GanttView({ projectId }: { projectId: string }) {
  const store = useOpStore();
  const sections = store.sections.filter(s => s.projectId === projectId).sort((a, b) => a.order - b.order);
  const tasks = store.tasks.filter(t => sections.some(s => s.id === t.sectionId));
  const dated = tasks.filter(t => t.dueDate);
  if (dated.length === 0) {
    return <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">Adicione datas de conclusão nas tarefas para ver o Gantt.</div>;
  }
  const min = Math.min(...dated.map(t => new Date(t.startDate ?? t.dueDate!).getTime()));
  const max = Math.max(...dated.map(t => new Date(t.dueDate!).getTime()));
  const span = Math.max(1, max - min);
  return (
    <div className="space-y-6">
      {sections.map(section => {
        const items = tasks.filter(t => t.sectionId === section.id && t.dueDate);
        if (items.length === 0) return null;
        return (
          <div key={section.id} className="rounded-lg border border-border/60 bg-card">
            <div className="border-b border-border/60 bg-muted/20 px-4 py-2 font-display text-[13px] font-semibold">{section.name}</div>
            <div className="divide-y divide-border/60">
              {items.map(t => {
                const start = new Date(t.startDate ?? t.dueDate!).getTime();
                const end = new Date(t.dueDate!).getTime();
                const left = ((start - min) / span) * 100;
                const width = Math.max(3, ((end - start) / span) * 100);
                const meta = STATUS_META[t.status];
                return (
                  <div key={t.id} className="grid grid-cols-[220px_1fr] items-center gap-3 px-4 py-2">
                    <div className="truncate text-[12px]">{t.name}</div>
                    <div className="relative h-4">
                      <div className="absolute inset-y-0 rounded-md" style={{ left: `${left}%`, width: `${width}%`, background: 'hsl(var(--primary) / 0.5)' }} />
                      <div className="absolute inset-y-0 flex items-center pl-2 text-[10px] text-primary-foreground" style={{ left: `${left}%` }}>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dot} mr-1`} />
                        {new Date(t.dueDate!).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============= Cartão =============

function CardView({ projectId, onOpenTask }: { projectId: string; onOpenTask: (id: string) => void }) {
  const store = useOpStore();
  const sectionIds = new Set(store.sections.filter(s => s.projectId === projectId).map(s => s.id));
  const tasks = store.tasks.filter(t => sectionIds.has(t.sectionId));
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {tasks.map(t => {
        const meta = STATUS_META[t.status];
        const assignee = store.users.find(u => u.id === t.assigneeId);
        return (
          <button key={t.id} onClick={() => onOpenTask(t.id)} className="rounded-lg border border-border/60 bg-card p-3 text-left hover:shadow-md">
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${meta.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
              </span>
              <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground" title="Cliente">
                {getTaskClientName(store, t)}
              </span>
            </div>
            <p className="mt-2 text-[12.5px] font-medium leading-snug">{t.name}</p>
            <div className="mt-2 flex items-center justify-between text-[10.5px] text-muted-foreground">
              <span>{assignee?.name.split(' ')[0] ?? 'Sem responsável'}</span>
              <span>{t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-BR') : '—'}</span>
            </div>
          </button>
        );
      })}
      {tasks.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground py-8">Nenhuma tarefa.</p>}
    </div>
  );
}

// ============= Task detail =============

function TaskDetailDialog({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const store = useOpStore();
  const task = store.tasks.find(t => t.id === taskId) ?? null;
  const [newItem, setNewItem] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newTag, setNewTag] = useState('');
  if (!task) return null;
  const meta = STATUS_META[task.status];
  const currentUser = store.users[0]; // no-auth mock
  return (
    <Dialog open={!!task} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <FolderKanban className="h-3 w-3" />
            <span>Cliente: {getTaskClientName(store, task)}</span>
          </div>
          <DialogTitle>
            <Input
              defaultValue={task.name}
              onBlur={e => e.target.value.trim() && opStore.updateTask(task.id, { name: e.target.value.trim() })}
              className="border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
            />
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
            <Select value={task.status} onValueChange={(v: OpStatus) => opStore.updateTask(task.id, { status: v })}>
              <SelectTrigger className={`h-9 border ${meta.color}`}>
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map(s => (
                  <SelectItem key={s} value={s}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
                      {STATUS_META[s].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Responsável</label>
            <Select value={task.assigneeId ?? '__none'} onValueChange={v => opStore.updateTask(task.id, { assigneeId: v === '__none' ? undefined : v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Ninguém" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Ninguém</SelectItem>
                {store.users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Início</label>
            <Input type="date" value={task.startDate ?? ''} onChange={e => opStore.updateTask(task.id, { startDate: e.target.value || undefined })} className="h-9" />
          </div>
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Prazo</label>
            <Input type="date" value={task.dueDate ?? ''} onChange={e => opStore.updateTask(task.id, { dueDate: e.target.value || undefined })} className="h-9" />
          </div>
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Prioridade</label>
            <Select value={task.priority} onValueChange={(v: OpPriority) => opStore.updateTask(task.id, { priority: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Recorrência</label>
            <Select value={task.recurrence ?? 'nenhuma'} onValueChange={(v) => opStore.updateTask(task.id, { recurrence: v as any })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Sem recorrência</SelectItem>
                <SelectItem value="diaria">Diária</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Tags</label>
            <div className="flex flex-wrap items-center gap-1">
              {task.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10.5px]">
                  <Tag className="h-2.5 w-2.5" />{tag}
                  <button onClick={() => opStore.updateTask(task.id, { tags: task.tags.filter(x => x !== tag) })}><X className="h-2.5 w-2.5" /></button>
                </span>
              ))}
              <Input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newTag.trim()) {
                    opStore.updateTask(task.id, { tags: [...task.tags, newTag.trim()] });
                    setNewTag('');
                  }
                }}
                placeholder="+ tag"
                className="h-7 w-20 text-[11px]"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Subtarefas ({task.checklist.filter(c => c.done).length}/{task.checklist.length})
          </label>
          <div className="mt-1 space-y-1">
            {task.checklist.map(item => (
              <div key={item.id} className="flex items-center gap-2 text-[12.5px]">
                <button onClick={() => opStore.toggleChecklistItem(task.id, item.id)} className={`flex h-4 w-4 items-center justify-center rounded border ${item.done ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>
                  {item.done && <Check className="h-3 w-3" />}
                </button>
                <span className={`flex-1 ${item.done ? 'line-through text-muted-foreground' : ''}`}>{item.text}</span>
                <button onClick={() => opStore.removeChecklistItem(task.id, item.id)}><X className="h-3 w-3 text-muted-foreground" /></button>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Nova subtarefa..." className="h-8 text-[12px]" onKeyDown={e => {
                if (e.key === 'Enter' && newItem.trim()) { opStore.addChecklistItem(task.id, newItem.trim()); setNewItem(''); }
              }} />
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> Comentários
          </label>
          <div className="mt-1 space-y-2">
            {task.comments.map(c => {
              const author = store.users.find(u => u.id === c.authorId);
              return (
                <div key={c.id} className="rounded-md border border-border/60 bg-muted/20 p-2">
                  <div className="mb-0.5 flex items-center gap-2 text-[10.5px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{author?.name ?? 'Desconhecido'}</span>
                    <span>·</span>
                    <span>{new Date(c.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                  <p className="text-[12.5px]">{c.text}</p>
                </div>
              );
            })}
            {task.comments.length === 0 && <p className="text-[11px] italic text-muted-foreground">Sem comentários.</p>}
            <div className="flex gap-2">
              <Textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Escreva um comentário..." rows={2} className="text-[12px]" />
              <Button size="sm" onClick={() => {
                if (newComment.trim() && currentUser) {
                  opStore.addComment(task.id, currentUser.id, newComment.trim());
                  setNewComment('');
                }
              }}>Enviar</Button>
            </div>
          </div>
        </div>



        <div className="border-t pt-4">
          <label className="mb-2 block text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Anexos
          </label>
          <AttachmentsPanel entityType="task" entityId={task.id} />
        </div>



        <DialogFooter>
          <Button variant="ghost" className="text-destructive" onClick={() => { opStore.removeTask(task.id); onClose(); }}>Excluir tarefa</Button>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SaveTemplateDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (b: boolean) => void; projectId: string | null }) {
  const [name, setName] = useState('');
  if (!projectId) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Salvar projeto como modelo</DialogTitle></DialogHeader>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do modelo" />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (name.trim()) {
              opStore.saveProjectAsTemplate(projectId, name.trim());
              onOpenChange(false);
              setName('');
            }
          }}>Salvar modelo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
