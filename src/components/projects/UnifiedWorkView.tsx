import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Search, Building2, Briefcase, CheckSquare, Eye, EyeOff, Circle, CheckCircle2, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useData, type Project, type Task, type TaskStatus, type Priority } from '@/contexts/DataContext';
import { QuickTaskDialog } from '@/components/shared/QuickTaskDialog';
import { QuickProjectDialog } from '@/components/shared/QuickProjectDialog';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';
import { InlineText, InlineSelect } from '@/components/shared/InlineEdit';

const TASK_STATUSES: readonly TaskStatus[] = ['Backlog','A fazer','Em andamento','Aguardando cliente','Aguardando time','Em revisão','Aprovado','Concluído','Cancelado'] as const;
const PROJECT_STATUSES = ['Planejamento','Em andamento','Finalizando','Concluído','Em Pausa'] as const;
const PRIORITIES: readonly Priority[] = ['Baixa','Média','Alta','Crítica'] as const;

const INTERNAL_KEY = '__internal__';

type ClientGroup = {
  id: string;
  name: string;
  isInternal: boolean;
  projects: Project[];
  looseTasks: Task[];
};

const linkedProjectIds = (task: Task) => {
  const ids = [
    ...(Array.isArray(task.projectIds) ? task.projectIds : []),
    ...(task.projectId ? [task.projectId] : []),
  ];
  return Array.from(new Set(ids.filter(Boolean)));
};

export function UnifiedWorkView() {
  const { clients, projects, tasks, updateTask, updateProject, updateClient } = useData();
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Dialog state
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; clientId?: string | null; projectId?: string | null }>({ open: false });
  const [projectDialog, setProjectDialog] = useState<{ open: boolean; clientId?: string | null }>({ open: false });
  const [openedTaskId, setOpenedTaskId] = useState<string | null>(null);
  const openedTask = useMemo(() => tasks.find(t => t.id === openedTaskId) || null, [tasks, openedTaskId]);

  const projectClientByTaskLink = useMemo(() => {
    const m = new Map<string, string>();
    tasks.forEach(task => {
      if (!task.clientId) return;
      linkedProjectIds(task).forEach(projectId => {
        if (!m.has(projectId)) m.set(projectId, task.clientId);
      });
    });
    return m;
  }, [tasks]);

  const groups: ClientGroup[] = useMemo(() => {
    const byClient = new Map<string, ClientGroup>();
    // Init with all real clients
    clients.forEach(c => {
      byClient.set(c.id, { id: c.id, name: c.name, isInternal: false, projects: [], looseTasks: [] });
    });
    // Internal bucket
    byClient.set(INTERNAL_KEY, { id: INTERNAL_KEY, name: 'Somus (Interno)', isInternal: true, projects: [], looseTasks: [] });

    projects.forEach(p => {
      const key = p.clientId || projectClientByTaskLink.get(p.id) || INTERNAL_KEY;
      const g = byClient.get(key);
      if (g) g.projects.push(p);
    });

    tasks.forEach(t => {
      const linked = linkedProjectIds(t);
      if (linked.length > 0) return; // attached under its project(s)
      const key = t.clientId || INTERNAL_KEY;
      const g = byClient.get(key);
      if (g) g.looseTasks.push(t);
    });

    const arr = Array.from(byClient.values());
    // Only show groups with content OR all real clients (so user can add)
    return arr;
  }, [clients, projects, projectClientByTaskLink, tasks]);

  const tasksByProject = useMemo(() => {
    const m = new Map<string, Task[]>();
    tasks.forEach(t => {
      const linked = linkedProjectIds(t);
      linked.forEach(pid => {
        const list = m.get(pid) || [];
        list.push(t);
        m.set(pid, list);
      });
    });
    return m;
  }, [tasks]);

  const matchesSearch = (text: string) => !search || text.toLowerCase().includes(search.toLowerCase());

  const filteredGroups = useMemo(() => {
    return groups
      .filter(g => clientFilter === 'all' || g.id === clientFilter)
      .filter(g => {
        if (!search) return true;
        if (matchesSearch(g.name)) return true;
        const projMatch = g.projects.some(p => matchesSearch(p.name) || (tasksByProject.get(p.id) || []).some(t => matchesSearch(t.title)));
        const taskMatch = g.looseTasks.some(t => matchesSearch(t.title));
        return projMatch || taskMatch;
      });
  }, [groups, clientFilter, search, tasksByProject]);

  const toggleClient = (id: string) => {
    setExpandedClients(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleProject = (id: string) => {
    setExpandedProjects(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };


  return (
    <div className="space-y-4">
      {/* Minimal filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente, projeto ou tarefa..."
            className="pl-9"
          />
        </div>
        <select
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Todos os clientes</option>
          <option value={INTERNAL_KEY}>Somus (Interno)</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Button onClick={() => setTaskDialog({ open: true })}>
          <Plus className="h-4 w-4 mr-1" /> Nova tarefa
        </Button>
        <Button variant="outline" onClick={() => setProjectDialog({ open: true })}>
          <Plus className="h-4 w-4 mr-1" /> Novo projeto
        </Button>
      </div>

      {/* Hierarchical tree */}
      <Card className="divide-y">
        {filteredGroups.length === 0 && (
          <div className="p-10 text-center text-muted-foreground text-sm">
            Nenhum item encontrado. Ajuste a busca ou crie uma nova tarefa/projeto.
          </div>
        )}
        {filteredGroups.map(group => {
          const totalProjects = group.projects.length;
          const totalTasks = group.looseTasks.length + group.projects.reduce((acc, p) => acc + (tasksByProject.get(p.id)?.length || 0), 0);
          const isOpen = expandedClients.has(group.id);
          const hasContent = totalProjects > 0 || totalTasks > 0;

          return (
            <div key={group.id}>
              {/* Client row */}
              <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40 group">
                <button
                  onClick={() => toggleClient(group.id)}
                  className="p-1 rounded hover:bg-muted"
                  aria-label={isOpen ? 'Recolher' : 'Expandir'}
                >
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <Building2 className={`h-4 w-4 ${group.isInternal ? 'text-amber-600' : 'text-primary'}`} />
                <div className="font-semibold flex-1 truncate">
                  {group.isInternal ? (
                    <span>{group.name}</span>
                  ) : (
                    <InlineText value={group.name} onSave={(v) => updateClient(group.id, { name: v } as any)} />
                  )}
                </div>
                {group.isInternal && (
                  <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950 text-amber-700 border-amber-300">Interno</Badge>
                )}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {totalProjects} proj · {totalTasks} tarefas
                </span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => setProjectDialog({ open: true, clientId: group.isInternal ? null : group.id })}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Projeto
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => setTaskDialog({ open: true, clientId: group.isInternal ? null : group.id })}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Tarefa
                  </Button>
                </div>
              </div>

              {/* Children */}
              {isOpen && (
                <div className="bg-muted/10">
                  {!hasContent && (
                    <div className="px-12 py-3 text-xs text-muted-foreground italic">
                      Nenhum projeto ou tarefa. Use os botões acima para criar.
                    </div>
                  )}

                  {/* Projects */}
                  {group.projects.map(project => {
                    const pTasks = tasksByProject.get(project.id) || [];
                    const pOpen = expandedProjects.has(project.id);
                    return (
                      <div key={project.id}>
                        <div className="flex items-center gap-2 pl-10 pr-3 py-2 hover:bg-muted/40 group">
                          <button
                            onClick={() => toggleProject(project.id)}
                            className="p-1 rounded hover:bg-muted"
                          >
                            {pOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                          <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                          <div className="text-sm flex-1 truncate">
                            <InlineText value={project.name} onSave={(v) => updateProject(project.id, { name: v } as any)} />
                          </div>
                          <InlineSelect
                            value={project.status}
                            options={PROJECT_STATUSES}
                            onSave={(v) => updateProject(project.id, { status: v } as any)}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); updateProject(project.id, { visibleToClient: !project.visibleToClient } as any); }}
                            title={project.visibleToClient ? 'Visível para o cliente' : 'Oculto do cliente'}
                            className="p-1 rounded hover:bg-muted"
                          >
                            {project.visibleToClient ? (
                              <Eye className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <EyeOff className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                          <span className="text-xs text-muted-foreground tabular-nums">{pTasks.length}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 opacity-0 group-hover:opacity-100"
                            onClick={() => setTaskDialog({ open: true, clientId: project.clientId, projectId: project.id })}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Tarefa
                          </Button>
                        </div>
                        {pOpen && pTasks.length === 0 && (
                          <div className="pl-20 py-2 text-xs text-muted-foreground italic">
                            Nenhuma tarefa neste projeto.
                          </div>
                        )}
                        {pOpen && pTasks.map(t => (
                          <TaskRow key={t.id} task={t} onUpdate={(u) => updateTask(t.id, u as any)} onOpen={() => setOpenedTaskId(t.id)} />
                        ))}
                      </div>
                    );
                  })}

                  {/* Loose tasks (no project) */}
                  {group.looseTasks.map(t => (
                    <TaskRow key={t.id} task={t} onUpdate={(u) => updateTask(t.id, u as any)} onOpen={() => setOpenedTaskId(t.id)} indent="pl-10" />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <QuickTaskDialog
        open={taskDialog.open}
        onOpenChange={(o) => setTaskDialog({ open: o })}
        clientId={taskDialog.clientId}
        projectId={taskDialog.projectId}
        onCreated={(id) => setOpenedTaskId(id)}
      />
      <TaskDetailDialog
        task={openedTask}
        open={!!openedTask}
        onOpenChange={(o) => { if (!o) setOpenedTaskId(null); }}
      />
      <QuickProjectDialog
        open={projectDialog.open}
        onOpenChange={(o) => setProjectDialog({ open: o })}
        clientId={projectDialog.clientId}
      />
    </div>
  );
}

function TaskRow({ task, onUpdate, onOpen, indent = 'pl-20' }: { task: Task; onUpdate: (u: Partial<Task>) => void | Promise<void>; onOpen?: () => void; indent?: string }) {
  const done = task.status === 'Concluído';
  const inProgress = task.status === 'Em andamento';
  const Icon = done ? CheckCircle2 : inProgress ? Clock : Circle;
  const toggleDone = () => onUpdate({ status: done ? 'A fazer' : 'Concluído' });
  return (
    <div
      className={`flex items-center gap-2 ${indent} pr-3 py-1.5 hover:bg-muted/40 group border-l-2 border-transparent hover:border-primary/30`}
    >
      <button onClick={(e) => { e.stopPropagation(); toggleDone(); }} className="p-1 rounded hover:bg-muted shrink-0" title="Alternar conclusão">
        <Icon className={`h-3.5 w-3.5 ${done ? 'text-emerald-600' : inProgress ? 'text-blue-600' : 'text-muted-foreground'}`} />
      </button>
      <CheckSquare className="h-3 w-3 text-muted-foreground shrink-0" />
      <div className={`text-sm flex-1 truncate ${done ? 'line-through text-muted-foreground' : ''}`}>
        <button
          type="button"
          onClick={onOpen}
          className="block w-full truncate text-left rounded px-1.5 py-0.5 -mx-1.5 hover:bg-muted/60 cursor-pointer"
          title="Abrir tarefa"
        >
          {task.title || 'Sem título'}
        </button>
      </div>
      {(() => {
        const names = [
          ...(Array.isArray(task.assignees) ? task.assignees : []),
          ...(task.assignee ? [task.assignee] : []),
        ].map(n => String(n).trim()).filter(Boolean);
        const unique = Array.from(new Set(names));
        if (unique.length === 0) return null;
        return (
          <span
            className="text-xs text-muted-foreground truncate max-w-[180px] hidden sm:inline"
            title={unique.join(', ')}
          >
            {unique.join(', ')}
          </span>
        );
      })()}
      <InlineSelect
        value={task.status}
        options={TASK_STATUSES}
        onSave={(v) => onUpdate({ status: v })}
      />
      <InlineSelect
        value={task.priority}
        options={PRIORITIES}
        onSave={(v) => onUpdate({ priority: v })}
        className={task.priority === 'Alta' || task.priority === 'Crítica' ? 'text-destructive font-medium' : ''}
      />
      {task.deadline && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {new Date(task.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
        </span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onUpdate({ visibleToClient: !task.visibleToClient }); }}
        title={task.visibleToClient ? 'Visível para o cliente' : 'Oculto do cliente'}
        className="p-1 rounded hover:bg-muted"
      >
        {task.visibleToClient ? (
          <Eye className="h-3 w-3 text-emerald-600" />
        ) : (
          <EyeOff className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
