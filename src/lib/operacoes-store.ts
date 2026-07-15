import { useSyncExternalStore } from 'react';

export type OpStatus =
  | 'nao_iniciado'
  | 'em_andamento'
  | 'em_revisao'
  | 'alteracao'
  | 'aprovacao_cliente'
  | 'concluido';

export const STATUS_META: Record<OpStatus, { label: string; color: string; dot: string }> = {
  nao_iniciado:      { label: 'Não iniciado',        color: 'bg-muted text-muted-foreground border-border',      dot: 'bg-muted-foreground/40' },
  em_andamento:      { label: 'Em andamento',        color: 'bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-300',       dot: 'bg-blue-500' },
  em_revisao:        { label: 'Em revisão',          color: 'bg-pink-500/10 text-pink-700 border-pink-500/30 dark:text-pink-300',       dot: 'bg-pink-500' },
  alteracao:         { label: 'Alteração solicitada', color: 'bg-purple-500/10 text-purple-700 border-purple-500/30 dark:text-purple-300', dot: 'bg-purple-500' },
  aprovacao_cliente: { label: 'Aprovação do Cliente', color: 'bg-emerald-400/10 text-emerald-700 border-emerald-400/30 dark:text-emerald-300', dot: 'bg-emerald-400' },
  concluido:         { label: 'Concluído',           color: 'bg-emerald-700/10 text-emerald-800 border-emerald-700/30 dark:text-emerald-300', dot: 'bg-emerald-700' },
};

export const STATUS_ORDER: OpStatus[] = [
  'nao_iniciado', 'em_andamento', 'em_revisao', 'alteracao', 'aprovacao_cliente', 'concluido',
];

export type OpPriority = 'baixa' | 'media' | 'alta';

export type OpTask = {
  id: string;
  sectionId: string;
  name: string;
  assignee?: string;
  startDate?: string;
  dueDate?: string;
  status: OpStatus;
  priority: OpPriority;
  tags: string[];
  checklist: { id: string; text: string; done: boolean }[];
};

export type OpSection = { id: string; projectId: string; name: string; order: number };
export type OpProject = { id: string; folderId: string; name: string };
export type OpFolder = { id: string; name: string };

type Store = {
  folders: OpFolder[];
  projects: OpProject[];
  sections: OpSection[];
  tasks: OpTask[];
};

const KEY = 'somus-operacoes-v1';
const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): Store {
  const fId = uid();
  const pId = uid();
  const secs = ['Ativação', 'Desenvolvimento', 'Finalização', 'Entrega', 'Atualização'].map((n, i) => ({
    id: uid(), projectId: pId, name: n, order: i,
  }));
  const seed = (name: string, sectionId: string): OpTask => ({
    id: uid(), sectionId, name, status: 'nao_iniciado', priority: 'media', tags: [], checklist: [],
  });
  const tasks: OpTask[] = [
    seed('Criar grupo no WhatsApp com o cliente', secs[0].id),
    seed('Configurar pasta do projeto no Google Drive', secs[0].id),
    seed('Anexar briefing do cliente preenchido à tarefa', secs[0].id),
    seed('Ler e validar briefing internamente', secs[0].id),
    seed('Redigir System Prompt com base no briefing', secs[1].id),
    seed('Programar Agente 01 no Kommo', secs[1].id),
    seed('Redigir copywriting da Landing Page', secs[1].id),
    seed('Teste de stress da IA no Kommo', secs[2].id),
    seed('Deploy oficial em produção', secs[3].id),
    seed('Otimização mensal de prompts', secs[4].id),
  ];
  return {
    folders: [{ id: fId, name: 'SDR IA' }],
    projects: [{ id: pId, folderId: fId, name: '[Cliente Exemplo] Agente IA SDR + LP' }],
    sections: secs,
    tasks,
  };
}

function load(): Store {
  if (typeof window === 'undefined') return { folders: [], projects: [], sections: [], tasks: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      window.localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as Store;
  } catch {
    return { folders: [], projects: [], sections: [], tasks: [] };
  }
}

let state: Store = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

export const opStore = {
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  get() { return state; },
  addFolder(name: string) { state = { ...state, folders: [...state.folders, { id: uid(), name }] }; persist(); },
  renameFolder(id: string, name: string) { state = { ...state, folders: state.folders.map(f => f.id === id ? { ...f, name } : f) }; persist(); },
  removeFolder(id: string) {
    const projIds = state.projects.filter(p => p.folderId === id).map(p => p.id);
    const secIds = state.sections.filter(s => projIds.includes(s.projectId)).map(s => s.id);
    state = {
      folders: state.folders.filter(f => f.id !== id),
      projects: state.projects.filter(p => p.folderId !== id),
      sections: state.sections.filter(s => !projIds.includes(s.projectId)),
      tasks: state.tasks.filter(t => !secIds.includes(t.sectionId)),
    };
    persist();
  },
  addProject(folderId: string, name: string) {
    const id = uid();
    state = { ...state, projects: [...state.projects, { id, folderId, name }] };
    persist();
    return id;
  },
  renameProject(id: string, name: string) { state = { ...state, projects: state.projects.map(p => p.id === id ? { ...p, name } : p) }; persist(); },
  removeProject(id: string) {
    const secIds = state.sections.filter(s => s.projectId === id).map(s => s.id);
    state = {
      ...state,
      projects: state.projects.filter(p => p.id !== id),
      sections: state.sections.filter(s => s.projectId !== id),
      tasks: state.tasks.filter(t => !secIds.includes(t.sectionId)),
    };
    persist();
  },
  addSection(projectId: string, name: string) {
    const order = state.sections.filter(s => s.projectId === projectId).length;
    state = { ...state, sections: [...state.sections, { id: uid(), projectId, name, order }] };
    persist();
  },
  renameSection(id: string, name: string) { state = { ...state, sections: state.sections.map(s => s.id === id ? { ...s, name } : s) }; persist(); },
  removeSection(id: string) {
    state = { ...state, sections: state.sections.filter(s => s.id !== id), tasks: state.tasks.filter(t => t.sectionId !== id) };
    persist();
  },
  addTask(sectionId: string, name: string) {
    state = {
      ...state,
      tasks: [...state.tasks, { id: uid(), sectionId, name, status: 'nao_iniciado', priority: 'media', tags: [], checklist: [] }],
    };
    persist();
  },
  updateTask(id: string, patch: Partial<OpTask>) {
    state = { ...state, tasks: state.tasks.map(t => t.id === id ? { ...t, ...patch } : t) };
    persist();
  },
  removeTask(id: string) { state = { ...state, tasks: state.tasks.filter(t => t.id !== id) }; persist(); },
};

export function useOpStore(): Store {
  return useSyncExternalStore(opStore.subscribe, opStore.get, opStore.get);
}
