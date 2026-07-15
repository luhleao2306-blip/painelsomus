import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  ArrowLeft, Workflow, Plus, Trash2, ChevronRight, ChevronDown, FolderKanban,
  LayoutList, KanbanSquare,
} from 'lucide-react';
import somusLogoUrl from '@/assets/somus-logo.png';
import {
  useOpStore, opStore, STATUS_META, STATUS_ORDER, type OpStatus, type OpTask,
} from '@/lib/operacoes-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export const Route = createFileRoute('/operacoes/projetos')({
  component: OperacoesProjetos,
  head: () => ({ meta: [{ title: 'Projetos — Operações Somus' }] }),
});

function OperacoesProjetos() {
  const navigate = useNavigate();
  const store = useOpStore();
  const [selectedProject, setSelectedProject] = useState<string | null>(store.projects[0]?.id ?? null);
  const [view, setView] = useState<'lista' | 'kanban'>('lista');
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(store.folders.map(f => [f.id, true])),
  );

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
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 lg:px-6">
        <button
          type="button"
          onClick={() => navigate({ to: '/operacoes' as any })}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Operações
        </button>
        <div className="mx-1 hidden h-4 w-px bg-border sm:block" />
        <img src={somusLogoUrl} alt="Somus" className="h-6 w-auto object-contain dark:invert" />
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-primary" />
          <span className="font-display text-sm font-semibold tracking-tight">Projetos</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar: Pastas → Projetos */}
        <aside className="w-72 shrink-0 border-r border-border/60 bg-muted/20 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Pastas</span>
            <button
              onClick={() => {
                const name = prompt('Nome da pasta:');
                if (name?.trim()) opStore.addFolder(name.trim());
              }}
              className="rounded p-1 hover:bg-muted"
              title="Nova pasta"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="px-2 pb-4">
            {store.folders.map(folder => {
              const open = openFolders[folder.id] ?? true;
              const projs = store.projects.filter(p => p.folderId === folder.id);
              return (
                <div key={folder.id} className="mb-1">
                  <div className="group flex items-center gap-1 rounded px-1 py-1 hover:bg-muted/50">
                    <button
                      onClick={() => setOpenFolders(o => ({ ...o, [folder.id]: !open }))}
                      className="p-0.5"
                    >
                      {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                    <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate text-[13px] font-medium">{folder.name}</span>
                    <button
                      onClick={() => {
                        const name = prompt('Nome do projeto:');
                        if (name?.trim()) {
                          const id = opStore.addProject(folder.id, name.trim());
                          setSelectedProject(id);
                        }
                      }}
                      className="p-0.5 opacity-0 group-hover:opacity-100"
                      title="Novo projeto"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir pasta "${folder.name}" e todo o seu conteúdo?`)) opStore.removeFolder(folder.id);
                      }}
                      className="p-0.5 opacity-0 group-hover:opacity-100 text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {open && (
                    <div className="ml-6 space-y-0.5">
                      {projs.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedProject(p.id)}
                          className={`block w-full truncate rounded px-2 py-1 text-left text-[12.5px] transition-colors ${
                            selectedProject === p.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/60 text-foreground'
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                      {projs.length === 0 && <p className="px-2 py-1 text-[11px] italic text-muted-foreground">Sem projetos</p>}
                    </div>
                  )}
                </div>
              );
            })}
            {store.folders.length === 0 && (
              <p className="px-2 py-4 text-center text-[12px] text-muted-foreground">Nenhuma pasta ainda. Clique em + acima.</p>
            )}
          </div>
        </aside>

        {/* Main area */}
        <main className="flex min-w-0 flex-1 flex-col">
          {!project ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Selecione um projeto na lateral.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-xl font-semibold tracking-tight">{project.name}</h2>
                  <p className="text-[12px] text-muted-foreground">
                    {sections.length} seções · {tasks.length} tarefas
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5">
                    <button
                      onClick={() => setView('lista')}
                      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] ${view === 'lista' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                    >
                      <LayoutList className="h-3.5 w-3.5" /> Lista
                    </button>
                    <button
                      onClick={() => setView('kanban')}
                      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] ${view === 'kanban' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                    >
                      <KanbanSquare className="h-3.5 w-3.5" /> Kanban
                    </button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const name = prompt('Nome da seção:');
                      if (name?.trim()) opStore.addSection(project.id, name.trim());
                    }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Seção
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(`Excluir projeto "${project.name}"?`)) {
                        opStore.removeProject(project.id);
                        setSelectedProject(null);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto px-6 py-4">
                {view === 'lista' ? (
                  <ListView projectId={project.id} />
                ) : (
                  <KanbanView projectId={project.id} />
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function ListView({ projectId }: { projectId: string }) {
  const store = useOpStore();
  const sections = store.sections.filter(s => s.projectId === projectId).sort((a, b) => a.order - b.order);
  return (
    <div className="space-y-6">
      {sections.map(section => {
        const tasks = store.tasks.filter(t => t.sectionId === section.id);
        return (
          <div key={section.id} className="rounded-lg border border-border/60 bg-card">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
              <h3 className="font-display text-[14px] font-semibold tracking-tight">{section.name}</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const name = prompt('Nome da tarefa:');
                    if (name?.trim()) opStore.addTask(section.id, name.trim());
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                  title="Nova tarefa"
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
              {tasks.map(t => <TaskRow key={t.id} task={t} />)}
              {tasks.length === 0 && (
                <div className="px-4 py-4 text-[12px] italic text-muted-foreground">Nenhuma tarefa nesta seção.</div>
              )}
            </div>
          </div>
        );
      })}
      {sections.length === 0 && (
        <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          Sem seções. Clique em "+ Seção" para começar.
        </div>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: OpTask }) {
  const meta = STATUS_META[task.status];
  return (
    <div className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30">
      <input
        type="checkbox"
        checked={task.status === 'concluido'}
        onChange={e => opStore.updateTask(task.id, { status: e.target.checked ? 'concluido' : 'nao_iniciado' })}
        className="h-4 w-4 rounded border-border"
      />
      <input
        defaultValue={task.name}
        onBlur={e => e.target.value.trim() && e.target.value !== task.name && opStore.updateTask(task.id, { name: e.target.value.trim() })}
        className="flex-1 bg-transparent text-[13px] outline-none focus:ring-0"
      />
      <Input
        type="date"
        value={task.dueDate ?? ''}
        onChange={e => opStore.updateTask(task.id, { dueDate: e.target.value || undefined })}
        className="h-7 w-36 text-[11.5px]"
      />
      <Select value={task.status} onValueChange={(v: OpStatus) => opStore.updateTask(task.id, { status: v })}>
        <SelectTrigger className={`h-7 w-44 border text-[11.5px] ${meta.color}`}>
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
      <Select value={task.priority} onValueChange={(v: any) => opStore.updateTask(task.id, { priority: v })}>
        <SelectTrigger className="h-7 w-24 text-[11.5px]"><SelectValue /></SelectTrigger>
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

function KanbanView({ projectId }: { projectId: string }) {
  const store = useOpStore();
  const sectionIds = new Set(store.sections.filter(s => s.projectId === projectId).map(s => s.id));
  const tasks = store.tasks.filter(t => sectionIds.has(t.sectionId));
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STATUS_ORDER.map(status => {
        const meta = STATUS_META[status];
        const items = tasks.filter(t => t.status === status);
        return (
          <div key={status} className="w-72 shrink-0 rounded-lg border border-border/60 bg-muted/20">
            <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
              <span className="text-[12px] font-semibold">{meta.label}</span>
              <span className="ml-auto text-[11px] text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2 p-2">
              {items.map(t => (
                <div key={t.id} className="rounded-md border border-border/60 bg-card p-2.5">
                  <p className="text-[12.5px] leading-snug">{t.name}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Select value={t.status} onValueChange={(v: OpStatus) => opStore.updateTask(t.id, { status: v })}>
                      <SelectTrigger className="h-6 w-full border-0 bg-transparent px-1 text-[10.5px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_ORDER.map(s => (<SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="px-1 py-2 text-[11px] italic text-muted-foreground">Vazio</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
