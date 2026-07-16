import { useSyncExternalStore } from 'react';

// ============= Types =============

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

export type Cargo = {
  id: string;
  name: string;
  icon: 'crown' | 'megaphone' | 'brush' | 'diamond' | 'bot' | 'zap' | 'rocket' | 'star';
  color: string; // tailwind color name (yellow/green/gray/purple/orange/blue/red/pink)
};

export type OpUser = {
  id: string;
  name: string;
  cargoId: string;
};

export type OpComment = {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
};

export type OpRecurrence = 'nenhuma' | 'diaria' | 'semanal' | 'mensal' | 'anual';

export type OpTask = {
  id: string;
  sectionId: string;
  name: string;
  assigneeId?: string;
  startDate?: string;
  dueDate?: string;
  status: OpStatus;
  priority: OpPriority;
  recurrence?: OpRecurrence;
  tags: string[];
  checklist: { id: string; text: string; done: boolean }[];
  comments: OpComment[];
};


export type OpSection = { id: string; projectId: string; name: string; order: number };
export type OpProject = { id: string; folderId: string; name: string; status: 'nao_iniciado' | 'em_andamento' | 'concluido' | 'pausado' };
export type OpFolder = { id: string; name: string };

// Modelos: um snapshot de estrutura (seções + tarefas com nome apenas)
export type OpTemplate = {
  id: string;
  name: string;
  sections: { name: string; tasks: string[] }[];
};

// Formulários
export type OpFormField = {
  id: string;
  type: 'texto_curto' | 'texto_longo' | 'multipla_escolha' | 'data' | 'upload' | 'checkbox';
  label: string;
  options?: string[]; // para multipla_escolha
};
export type OpForm = { id: string; name: string; fields: OpFormField[] };
export type OpFormAnswer = {
  id: string;
  formId: string;
  projectId?: string;
  values: Record<string, any>;
  createdAt: string;
};

// Senhas
export type OpSenha = {
  id: string;
  clientName: string;
  service: string;
  username: string;
  password: string; // localStorage: apenas base64 (não é criptografia real; será migrado para Supabase Vault)
  notes?: string;
};

type Store = {
  cargos: Cargo[];
  users: OpUser[];
  folders: OpFolder[];
  projects: OpProject[];
  sections: OpSection[];
  tasks: OpTask[];
  templates: OpTemplate[];
  forms: OpForm[];
  formAnswers: OpFormAnswer[];
  senhas: OpSenha[];
};

const KEY = 'somus-operacoes-v2';
const uid = () => Math.random().toString(36).slice(2, 10);

// ============= Seed =============

const SDR_LP_TEMPLATE: OpTemplate = {
  id: 'tpl-sdr-lp',
  name: 'Agente IA SDR + LP',
  sections: [
    { name: 'Ativação', tasks: [
      'Criar grupo no WhatsApp com o cliente',
      'Configurar pasta do projeto no Google Drive',
      'Anexar briefing do cliente preenchido à tarefa',
      'Ler e validar briefing internamente antes de iniciar o desenvolvimento',
      'Confirmar acesso ao Kommo do cliente',
    ]},
    { name: 'Desenvolvimento', tasks: [
      'Redigir System Prompt com base no briefing anexado (bússola, tom, regras)',
      'Mapear fluxo de conversação e rotas operacionais',
      'Programar Agente 01 — esqueleto e rotas básicas no Kommo',
      'Programar Agente 02 — injeção de conhecimento, portfólio e diferenciais',
      'Aplicar engenharia de prompts (travas, variáveis e limites de escopo)',
      'Definir estrutura e briefing da Landing Page',
      'Redigir copywriting da Landing Page (headline, benefícios e CTA)',
      'Criar design e wireframe da Landing Page',
      'Integrar formulário da Landing Page ao Kommo e ao agente',
      'Testar responsividade e velocidade da Landing Page',
    ]},
    { name: 'Finalização', tasks: [
      'Realizar teste de stress da IA no Kommo (simular leads exigentes)',
      'Verificar coerência de tom, limites e regras de decisão',
      'Preencher checklist de aprovação interna',
      'Submeter agente para aprovação da liderança',
    ]},
    { name: 'Entrega', tasks: [
      'Conectar WhatsApp Business ao Kommo em produção',
      'Realizar deploy oficial do agente em produção',
      'Monitoramento intensivo nas primeiras 48h (hypercare)',
      'Apresentar entrega ao cliente — reunião ou documento formal',
      'Enviar primeiro relatório de métricas ao cliente',
    ]},
    { name: 'Atualização', tasks: [
      'Otimização mensal de prompts com base em conversas reais',
      'Atualizar base de conhecimento conforme mudanças do cliente',
      'Enviar relatório semanal de métricas',
      'Realizar reunião mensal de revisão estratégica',
      'Atualizar playbook comercial do cliente',
    ]},
  ],
};

function seed(): Store {
  const cargos: Cargo[] = [
    { id: 'c-ceo',    name: 'CEO',                icon: 'crown',     color: 'yellow' },
    { id: 'c-cfo',    name: 'CFO',                icon: 'megaphone', color: 'green' },
    { id: 'c-arte',   name: 'Diretor de Arte',    icon: 'brush',     color: 'gray' },
    { id: 'c-mkt',    name: 'Head de Marketing',  icon: 'diamond',   color: 'purple' },
    { id: 'c-tech',   name: 'Head de Tecnologia', icon: 'bot',       color: 'orange' },
    { id: 'c-perf',   name: 'Head de Performance',icon: 'zap',       color: 'blue' },
    { id: 'c-gp',     name: 'Gestor de Projetos', icon: 'diamond',   color: 'red' },
    { id: 'c-asst',   name: 'Assistente',         icon: 'rocket',    color: 'red' },
  ];
  const users: OpUser[] = [
    { id: 'u-wilson',  name: 'Wilson',            cargoId: 'c-ceo' },
    { id: 'u-lucius',  name: 'Lúcius Vieira',     cargoId: 'c-mkt' },
    { id: 'u-guilherme', name: 'Guilherme Ferreira', cargoId: 'c-perf' },
    { id: 'u-joao',    name: 'João Rodri',        cargoId: 'c-gp' },
    { id: 'u-luis',    name: 'Luís Felipe',       cargoId: 'c-tech' },
    { id: 'u-arthur',  name: 'Arthur Limeira',    cargoId: 'c-asst' },
    { id: 'u-esaki',   name: 'Esaki',             cargoId: 'c-arte' },
  ];

  // Cria pasta+projeto a partir do template
  const folderId = uid();
  const projectId = uid();
  const sections: OpSection[] = SDR_LP_TEMPLATE.sections.map((s, i) => ({
    id: uid(), projectId, name: s.name, order: i,
  }));
  const tasks: OpTask[] = [];
  SDR_LP_TEMPLATE.sections.forEach((s, i) => {
    s.tasks.forEach(t => {
      tasks.push({
        id: uid(),
        sectionId: sections[i].id,
        name: t,
        status: 'nao_iniciado',
        priority: 'media',
        tags: [],
        checklist: [],
        comments: [],
      });
    });
  });

  return {
    cargos,
    users,
    folders: [{ id: folderId, name: 'SDR IA' }],
    projects: [{ id: projectId, folderId, name: '[Cliente Exemplo] Agente IA SDR + LP', status: 'em_andamento' }],
    sections,
    tasks,
    templates: [SDR_LP_TEMPLATE],
    forms: [
      {
        id: 'form-briefing-cliente',
        name: 'Briefing de Cliente',
        fields: [
          { id: uid(), type: 'texto_curto',      label: 'Nome do escritório' },
          { id: uid(), type: 'texto_curto',      label: 'Segmento principal' },
          { id: uid(), type: 'texto_longo',      label: 'Diferenciais e posicionamento' },
          { id: uid(), type: 'multipla_escolha', label: 'Prazo de decisão', options: ['Imediato', '30 dias', '60 dias', '90+ dias'] },
        ],
      },
    ],
    formAnswers: [],
    senhas: [],
  };
}

function load(): Store {
  if (typeof window === 'undefined') {
    return { cargos: [], users: [], folders: [], projects: [], sections: [], tasks: [], templates: [], forms: [], formAnswers: [], senhas: [] };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      window.localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as Store;
  } catch {
    return { cargos: [], users: [], folders: [], projects: [], sections: [], tasks: [], templates: [], forms: [], formAnswers: [], senhas: [] };
  }
}

let state: Store = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }
  listeners.forEach(l => l());
}

// ============= Actions =============

export const opStore = {
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  get() { return state; },
  reset() {
    if (typeof window !== 'undefined') window.localStorage.removeItem(KEY);
    state = load();
    persist();
  },

  // Folders
  addFolder(name: string) { state = { ...state, folders: [...state.folders, { id: uid(), name }] }; persist(); },
  renameFolder(id: string, name: string) { state = { ...state, folders: state.folders.map(f => f.id === id ? { ...f, name } : f) }; persist(); },
  removeFolder(id: string) {
    const projIds = state.projects.filter(p => p.folderId === id).map(p => p.id);
    const secIds = state.sections.filter(s => projIds.includes(s.projectId)).map(s => s.id);
    state = {
      ...state,
      folders: state.folders.filter(f => f.id !== id),
      projects: state.projects.filter(p => p.folderId !== id),
      sections: state.sections.filter(s => !projIds.includes(s.projectId)),
      tasks: state.tasks.filter(t => !secIds.includes(t.sectionId)),
    };
    persist();
  },

  // Projects
  addProject(folderId: string, name: string) {
    const id = uid();
    state = { ...state, projects: [...state.projects, { id, folderId, name, status: 'nao_iniciado' }] };
    persist();
    return id;
  },
  renameProject(id: string, name: string) { state = { ...state, projects: state.projects.map(p => p.id === id ? { ...p, name } : p) }; persist(); },
  updateProjectStatus(id: string, s: OpProject['status']) { state = { ...state, projects: state.projects.map(p => p.id === id ? { ...p, status: s } : p) }; persist(); },
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

  // Sections
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

  // Tasks
  addTask(sectionId: string, name: string) {
    state = {
      ...state,
      tasks: [...state.tasks, { id: uid(), sectionId, name, status: 'nao_iniciado', priority: 'media', tags: [], checklist: [], comments: [] }],
    };
    persist();
  },
  updateTask(id: string, patch: Partial<OpTask>) {
    state = { ...state, tasks: state.tasks.map(t => t.id === id ? { ...t, ...patch } : t) };
    persist();
  },
  addChecklistItem(taskId: string, text: string) {
    state = { ...state, tasks: state.tasks.map(t => t.id === taskId ? { ...t, checklist: [...t.checklist, { id: uid(), text, done: false }] } : t) };
    persist();
  },
  toggleChecklistItem(taskId: string, itemId: string) {
    state = { ...state, tasks: state.tasks.map(t => t.id === taskId ? { ...t, checklist: t.checklist.map(i => i.id === itemId ? { ...i, done: !i.done } : i) } : t) };
    persist();
  },
  removeChecklistItem(taskId: string, itemId: string) {
    state = { ...state, tasks: state.tasks.map(t => t.id === taskId ? { ...t, checklist: t.checklist.filter(i => i.id !== itemId) } : t) };
    persist();
  },
  addComment(taskId: string, authorId: string, text: string) {
    state = { ...state, tasks: state.tasks.map(t => t.id === taskId ? { ...t, comments: [...t.comments, { id: uid(), authorId, text, createdAt: new Date().toISOString() }] } : t) };
    persist();
  },
  removeTask(id: string) { state = { ...state, tasks: state.tasks.filter(t => t.id !== id) }; persist(); },

  // Templates
  applyTemplate(templateId: string, folderId: string, projectName: string) {
    const tpl = state.templates.find(t => t.id === templateId);
    if (!tpl) return null;
    const projectId = uid();
    const newSections: OpSection[] = tpl.sections.map((s, i) => ({ id: uid(), projectId, name: s.name, order: i }));
    const newTasks: OpTask[] = [];
    tpl.sections.forEach((s, i) => {
      s.tasks.forEach(taskName => {
        newTasks.push({
          id: uid(), sectionId: newSections[i].id, name: taskName,
          status: 'nao_iniciado', priority: 'media', tags: [], checklist: [], comments: [],
        });
      });
    });
    state = {
      ...state,
      projects: [...state.projects, { id: projectId, folderId, name: projectName, status: 'nao_iniciado' }],
      sections: [...state.sections, ...newSections],
      tasks: [...state.tasks, ...newTasks],
    };
    persist();
    return projectId;
  },
  saveProjectAsTemplate(projectId: string, name: string) {
    const secs = state.sections.filter(s => s.projectId === projectId).sort((a, b) => a.order - b.order);
    const tpl: OpTemplate = {
      id: uid(),
      name,
      sections: secs.map(s => ({
        name: s.name,
        tasks: state.tasks.filter(t => t.sectionId === s.id).map(t => t.name),
      })),
    };
    state = { ...state, templates: [...state.templates, tpl] };
    persist();
  },
  removeTemplate(id: string) { state = { ...state, templates: state.templates.filter(t => t.id !== id) }; persist(); },
  updateTemplate(id: string, patch: Partial<Omit<OpTemplate, 'id'>>) {
    state = { ...state, templates: state.templates.map(t => t.id === id ? { ...t, ...patch } : t) };
    persist();
  },
  duplicateTemplate(id: string) {
    const tpl = state.templates.find(t => t.id === id);
    if (!tpl) return null;
    const copy: OpTemplate = {
      id: uid(),
      name: `${tpl.name} (cópia)`,
      sections: tpl.sections.map(s => ({ name: s.name, tasks: [...s.tasks] })),
    };
    state = { ...state, templates: [...state.templates, copy] };
    persist();
    return copy.id;
  },

  // Forms
  addForm(name: string) {
    const id = uid();
    state = { ...state, forms: [...state.forms, { id, name, fields: [] }] };
    persist();
    return id;
  },
  updateForm(id: string, patch: Partial<OpForm>) { state = { ...state, forms: state.forms.map(f => f.id === id ? { ...f, ...patch } : f) }; persist(); },
  removeForm(id: string) { state = { ...state, forms: state.forms.filter(f => f.id !== id) }; persist(); },
  addFormField(formId: string, field: Omit<OpFormField, 'id'>) {
    state = { ...state, forms: state.forms.map(f => f.id === formId ? { ...f, fields: [...f.fields, { ...field, id: uid() }] } : f) };
    persist();
  },
  removeFormField(formId: string, fieldId: string) {
    state = { ...state, forms: state.forms.map(f => f.id === formId ? { ...f, fields: f.fields.filter(x => x.id !== fieldId) } : f) };
    persist();
  },
  submitFormAnswer(formId: string, projectId: string | undefined, values: Record<string, any>) {
    state = { ...state, formAnswers: [...state.formAnswers, { id: uid(), formId, projectId, values, createdAt: new Date().toISOString() }] };
    persist();
  },

  // Senhas
  addSenha(s: Omit<OpSenha, 'id' | 'password'> & { password: string }) {
    const encoded = typeof window !== 'undefined' ? btoa(unescape(encodeURIComponent(s.password))) : s.password;
    state = { ...state, senhas: [...state.senhas, { ...s, id: uid(), password: encoded }] };
    persist();
  },
  updateSenha(id: string, patch: Partial<Omit<OpSenha, 'id'>>) {
    if (patch.password && typeof window !== 'undefined') {
      patch = { ...patch, password: btoa(unescape(encodeURIComponent(patch.password))) };
    }
    state = { ...state, senhas: state.senhas.map(s => s.id === id ? { ...s, ...patch } : s) };
    persist();
  },
  removeSenha(id: string) { state = { ...state, senhas: state.senhas.filter(s => s.id !== id) }; persist(); },
  revealPassword(pw: string) {
    try {
      return typeof window !== 'undefined' ? decodeURIComponent(escape(atob(pw))) : pw;
    } catch { return pw; }
  },
};

export function useOpStore(): Store {
  return useSyncExternalStore(opStore.subscribe, opStore.get, opStore.get);
}

// ============= Cargo helpers =============

export const CARGO_COLOR_MAP: Record<string, string> = {
  yellow: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-300',
  green:  'bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-300',
  gray:   'bg-zinc-500/15 text-zinc-700 border-zinc-500/30 dark:text-zinc-300',
  purple: 'bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-300',
  orange: 'bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300',
  blue:   'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300',
  red:    'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-300',
  pink:   'bg-pink-500/15 text-pink-700 border-pink-500/30 dark:text-pink-300',
};
