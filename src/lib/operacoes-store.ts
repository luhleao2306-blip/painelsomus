import { useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  color: string;
};

export type OpUser = { id: string; name: string; cargoId: string };

export type OpComment = { id: string; authorId: string; authorName?: string; text: string; createdAt: string };

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
  position?: number;
};

export type OpSection = { id: string; projectId: string; name: string; order: number };
export type OpProject = { id: string; folderId: string; name: string; status: 'nao_iniciado' | 'em_andamento' | 'concluido' | 'pausado' };
export type OpFolder = { id: string; name: string };

export type OpTemplateTask = { name: string; subtasks: string[] };
export type OpTemplate = {
  id: string;
  name: string;
  sections: { name: string; tasks: OpTemplateTask[] }[];
};

export type OpFormField = {
  id: string;
  type: 'texto_curto' | 'texto_longo' | 'multipla_escolha' | 'data' | 'upload' | 'checkbox';
  label: string;
  options?: string[];
};
export type OpForm = { id: string; name: string; fields: OpFormField[] };
export type OpFormAnswer = {
  id: string;
  formId: string;
  projectId?: string;
  values: Record<string, any>;
  createdAt: string;
};

export type OpSenha = {
  id: string;
  clientName: string;
  service: string;
  username: string;
  password: string;
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
  _hydrated: boolean;
  _syncing: boolean;
  _lastSyncError?: string | null;
};

const LEGACY_KEY = 'somus-operacoes-v2';
const MIGRATED_FLAG = 'somus-operacoes-migrated-cloud';
const uid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

// ============= Directory (cargos + users) — mantido em memória =============
// Estes são referências internas usadas para exibir "responsáveis"; ficam hardcoded.

const CARGOS: Cargo[] = [
  { id: 'c-ceo',    name: 'CEO',                icon: 'crown',     color: 'yellow' },
  { id: 'c-cfo',    name: 'CFO',                icon: 'megaphone', color: 'green' },
  { id: 'c-arte',   name: 'Diretor de Arte',    icon: 'brush',     color: 'gray' },
  { id: 'c-mkt',    name: 'Head de Marketing',  icon: 'diamond',   color: 'purple' },
  { id: 'c-tech',   name: 'Head de Tecnologia', icon: 'bot',       color: 'orange' },
  { id: 'c-perf',   name: 'Head de Performance',icon: 'zap',       color: 'blue' },
  { id: 'c-gp',     name: 'Gestor de Projetos', icon: 'diamond',   color: 'red' },
  { id: 'c-asst',   name: 'Assistente',         icon: 'rocket',    color: 'red' },
];
const USERS: OpUser[] = [
  { id: 'u-wilson',  name: 'Wilson',            cargoId: 'c-ceo' },
  { id: 'u-lucius',  name: 'Lúcius Vieira',     cargoId: 'c-mkt' },
  { id: 'u-guilherme', name: 'Guilherme Ferreira', cargoId: 'c-perf' },
  { id: 'u-joao',    name: 'João Rodri',        cargoId: 'c-gp' },
  { id: 'u-luis',    name: 'Luís Felipe',       cargoId: 'c-tech' },
  { id: 'u-arthur',  name: 'Arthur Limeira',    cargoId: 'c-asst' },
  { id: 'u-esaki',   name: 'Esaki',             cargoId: 'c-arte' },
];

// ============= Template semente (usado quando o banco estiver vazio) =============

const t = (name: string, subtasks: string[] = []): OpTemplateTask => ({ name, subtasks });

const SDR_LP_TEMPLATE: OpTemplate = {
  id: 'tpl-sdr-lp',
  name: 'Agente IA SDR + LP',
  sections: [
    { name: 'Ativação', tasks: [
      t('Criar grupo no WhatsApp com o cliente'),
      t('Configurar pasta do projeto no Google Drive'),
      t('Anexar briefing do cliente preenchido à tarefa'),
      t('Ler e validar briefing internamente antes de iniciar o desenvolvimento'),
      t('Confirmar acesso ao Kommo do cliente'),
    ]},
    { name: 'Desenvolvimento', tasks: [
      t('Redigir System Prompt com base no briefing anexado (bússola, tom, regras)'),
      t('Mapear fluxo de conversação e rotas operacionais'),
      t('Programar Agente 01 — esqueleto e rotas básicas no Kommo'),
      t('Programar Agente 02 — injeção de conhecimento, portfólio e diferenciais'),
      t('Aplicar engenharia de prompts (travas, variáveis e limites de escopo)'),
      t('Definir estrutura e briefing da Landing Page'),
      t('Redigir copywriting da Landing Page (headline, benefícios e CTA)'),
      t('Criar design e wireframe da Landing Page'),
      t('Integrar formulário da Landing Page ao Kommo e ao agente'),
      t('Testar responsividade e velocidade da Landing Page'),
    ]},
    { name: 'Finalização', tasks: [
      t('Realizar teste de stress da IA no Kommo (simular leads exigentes)'),
      t('Verificar coerência de tom, limites e regras de decisão'),
      t('Preencher checklist de aprovação interna'),
      t('Submeter agente para aprovação da liderança'),
    ]},
    { name: 'Entrega', tasks: [
      t('Conectar WhatsApp Business ao Kommo em produção'),
      t('Realizar deploy oficial do agente em produção'),
      t('Monitoramento intensivo nas primeiras 48h (hypercare)'),
      t('Apresentar entrega ao cliente — reunião ou documento formal'),
      t('Enviar primeiro relatório de métricas ao cliente'),
    ]},
    { name: 'Atualização', tasks: [
      t('Otimização mensal de prompts com base em conversas reais'),
      t('Atualizar base de conhecimento conforme mudanças do cliente'),
      t('Enviar relatório semanal de métricas'),
      t('Realizar reunião mensal de revisão estratégica'),
      t('Atualizar playbook comercial do cliente'),
    ]},
  ],
};

// ============= State + listeners =============

let state: Store = {
  cargos: CARGOS,
  users: USERS,
  folders: [],
  projects: [],
  sections: [],
  tasks: [],
  templates: [SDR_LP_TEMPLATE], // fallback antes de hidratar
  forms: [],
  formAnswers: [],
  senhas: [],
  _hydrated: false,
  _syncing: false,
  _lastSyncError: null,
};

const listeners = new Set<() => void>();
function emit() { listeners.forEach(l => l()); }
function setState(next: Partial<Store>) { state = { ...state, ...next }; emit(); }

// ============= Row mappers =============

const rowToFolder = (r: any): OpFolder => ({ id: r.id, name: r.name });
const rowToProject = (r: any): OpProject => ({ id: r.id, folderId: r.folder_id, name: r.name, status: r.status });
const rowToSection = (r: any): OpSection => ({ id: r.id, projectId: r.project_id, name: r.name, order: r.position });
const rowToTask = (r: any): OpTask => ({
  id: r.id,
  sectionId: r.section_id,
  name: r.name,
  assigneeId: r.assignee_id ?? undefined,
  startDate: r.start_date ?? undefined,
  dueDate: r.due_date ?? undefined,
  status: r.status,
  priority: r.priority,
  recurrence: r.recurrence ?? undefined,
  tags: r.tags ?? [],
  checklist: r.checklist ?? [],
  comments: r.comments ?? [],
  position: r.position ?? 0,
});
const rowToTemplate = (r: any): OpTemplate => ({ id: r.id, name: r.name, sections: r.sections ?? [] });
const rowToForm = (r: any): OpForm => ({ id: r.id, name: r.name, fields: r.fields ?? [] });
const rowToFormAnswer = (r: any): OpFormAnswer => ({
  id: r.id, formId: r.form_id, projectId: r.project_id ?? undefined,
  values: r.values ?? {}, createdAt: r.created_at,
});
const rowToSenha = (r: any): OpSenha => ({
  id: r.id, clientName: r.client_name, service: r.service, username: r.username,
  password: r.password, notes: r.notes ?? undefined,
});

const taskToRow = (t: OpTask): any => ({
  id: t.id,
  section_id: t.sectionId,
  name: t.name,
  assignee_id: t.assigneeId ?? null,
  start_date: t.startDate ?? null,
  due_date: t.dueDate ?? null,
  status: t.status,
  priority: t.priority,
  recurrence: t.recurrence ?? null,
  tags: t.tags ?? [],
  checklist: t.checklist ?? [],
  comments: t.comments ?? [],
  position: t.position ?? 0,
  updated_at: new Date().toISOString(),
});

// ============= Cloud sync =============

function raiseSyncError(message: string) {
  console.warn('[Operações] sync:', message);
  setState({ _lastSyncError: message, _syncing: false });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('operacoes-sync-error', { detail: { message } }));
  }
}

async function assertResult<T>(label: string, query: PromiseLike<{ data: T | null; error: any }>) {
  const result = await query;
  if (result.error) {
    throw new Error(`${label}: ${result.error.message ?? result.error}`);
  }
  return result.data;
}

async function fetchAll() {
  const [f, p, s, tsk, tpl, frm, fa, sn] = await Promise.all([
    assertResult('Pastas', supabase.from('op_folders').select('*')),
    assertResult('Projetos', supabase.from('op_projects').select('*')),
    assertResult('Seções', supabase.from('op_sections').select('*').order('position', { ascending: true })),
    assertResult('Tarefas', supabase.from('op_tasks').select('*').order('position', { ascending: true })),
    assertResult('Modelos', supabase.from('op_templates').select('*')),
    assertResult('Formulários', supabase.from('op_forms').select('*')),
    assertResult('Respostas', supabase.from('op_form_answers').select('*')),
    assertResult('Cofre de senhas', supabase.from('op_senhas').select('*')),
  ]);
  return {
    folders: (f ?? []).map(rowToFolder),
    projects: (p ?? []).map(rowToProject),
    sections: (s ?? []).map(rowToSection),
    tasks: (tsk ?? []).map(rowToTask),
    templates: (tpl ?? []).map(rowToTemplate),
    forms: (frm ?? []).map(rowToForm),
    formAnswers: (fa ?? []).map(rowToFormAnswer),
    senhas: (sn ?? []).map(rowToSenha),
  };
}

type MigrateResult = { ok: boolean; reason: 'no_window' | 'already_migrated' | 'no_local_data' | 'done' | 'error'; counts: Record<string, number> | null; error?: string };

async function migrateLegacyIfNeeded(force = false): Promise<MigrateResult> {
  if (typeof window === 'undefined') return { ok: false, reason: 'no_window', counts: null };
  try {
    if (!force && window.localStorage.getItem(MIGRATED_FLAG) === '1') return { ok: false, reason: 'already_migrated', counts: null };
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) { window.localStorage.setItem(MIGRATED_FLAG, '1'); return { ok: false, reason: 'no_local_data', counts: null }; }
    const legacy = JSON.parse(raw);
    const counts: Record<string, number> = {
      folders: legacy.folders?.length ?? 0,
      projects: legacy.projects?.length ?? 0,
      sections: legacy.sections?.length ?? 0,
      tasks: legacy.tasks?.length ?? 0,
      templates: legacy.templates?.length ?? 0,
      forms: legacy.forms?.length ?? 0,
      formAnswers: legacy.formAnswers?.length ?? 0,
      senhas: legacy.senhas?.length ?? 0,
    };

    // Push todas as entidades. Upsert evita erro se algo já foi migrado por outro usuário.
    if (Array.isArray(legacy.folders) && legacy.folders.length) {
      await supabase.from('op_folders').upsert(
        legacy.folders.map((f: any) => ({ id: f.id, name: f.name }))
      );
    }
    if (Array.isArray(legacy.projects) && legacy.projects.length) {
      await supabase.from('op_projects').upsert(
        legacy.projects.map((p: any) => ({ id: p.id, folder_id: p.folderId, name: p.name, status: p.status }))
      );
    }
    if (Array.isArray(legacy.sections) && legacy.sections.length) {
      await supabase.from('op_sections').upsert(
        legacy.sections.map((s: any) => ({ id: s.id, project_id: s.projectId, name: s.name, position: s.order ?? 0 }))
      );
    }
    if (Array.isArray(legacy.tasks) && legacy.tasks.length) {
      await supabase.from('op_tasks').upsert(
        legacy.tasks.map((t: any, i: number) => ({
          id: t.id,
          section_id: t.sectionId,
          name: t.name,
          assignee_id: t.assigneeId ?? null,
          start_date: t.startDate ?? null,
          due_date: t.dueDate ?? null,
          status: t.status ?? 'nao_iniciado',
          priority: t.priority ?? 'media',
          recurrence: t.recurrence ?? null,
          tags: t.tags ?? [],
          checklist: t.checklist ?? [],
          comments: t.comments ?? [],
          position: t.position ?? i,
        }))
      );
    }
    if (Array.isArray(legacy.templates) && legacy.templates.length) {
      await supabase.from('op_templates').upsert(
        legacy.templates.map((tpl: any) => ({
          id: tpl.id,
          name: tpl.name,
          sections: (tpl.sections ?? []).map((s: any) => ({
            name: s.name,
            tasks: (s.tasks ?? []).map((tt: any) =>
              typeof tt === 'string' ? { name: tt, subtasks: [] } : { name: tt.name ?? '', subtasks: tt.subtasks ?? [] }
            ),
          })),
        }))
      );
    }
    if (Array.isArray(legacy.forms) && legacy.forms.length) {
      await supabase.from('op_forms').upsert(
        legacy.forms.map((f: any) => ({ id: f.id, name: f.name, fields: f.fields ?? [] }))
      );
    }
    if (Array.isArray(legacy.formAnswers) && legacy.formAnswers.length) {
      await supabase.from('op_form_answers').upsert(
        legacy.formAnswers.map((a: any) => ({
          id: a.id, form_id: a.formId, project_id: a.projectId ?? null,
          values: a.values ?? {}, created_at: a.createdAt,
        }))
      );
    }
    if (Array.isArray(legacy.senhas) && legacy.senhas.length) {
      await supabase.from('op_senhas').upsert(
        legacy.senhas.map((s: any) => ({
          id: s.id, client_name: s.clientName, service: s.service,
          username: s.username, password: s.password, notes: s.notes ?? null,
        }))
      );
    }
    window.localStorage.setItem(MIGRATED_FLAG, '1');
    return { ok: true, reason: 'done', counts };
  } catch (e: any) {
    console.warn('[Operações] migração legacy falhou:', e);
    return { ok: false, reason: 'error', counts: null, error: e?.message ?? String(e) };
  }
}

async function seedTemplateIfEmpty() {
  const { data } = await supabase.from('op_templates').select('id').limit(1);
  if (!data || data.length === 0) {
    await supabase.from('op_templates').upsert([{
      id: SDR_LP_TEMPLATE.id,
      name: SDR_LP_TEMPLATE.name,
      sections: SDR_LP_TEMPLATE.sections,
    }]);
  }
}

let hydratePromise: Promise<void> | null = null;
async function hydrate() {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      await migrateLegacyIfNeeded();
      await seedTemplateIfEmpty();
      const data = await fetchAll();
      setState({ ...data, _hydrated: true, _lastSyncError: null });
      subscribeRealtime();
    } catch (e: any) {
      console.warn('[Operações] hydrate falhou:', e);
      setState({ _hydrated: true, _lastSyncError: e?.message ?? 'Falha ao carregar Operações.' });
    }
  })();
  return hydratePromise;
}

let realtimeChannel: any = null;
const pendingFolderIds = new Set<string>();
const pendingTemplateIds = new Set<string>();
const pendingProjectIds = new Set<string>();
const pendingSectionIds = new Set<string>();
const pendingTaskIds = new Set<string>();
const pendingFormIds = new Set<string>();
const pendingFormAnswerIds = new Set<string>();
const pendingSenhaIds = new Set<string>();

const deletingFolderIds = new Set<string>();
const deletingProjectIds = new Set<string>();
const deletingSectionIds = new Set<string>();
const deletingTaskIds = new Set<string>();
const deletingTemplateIds = new Set<string>();
const deletingFormIds = new Set<string>();
const deletingSenhaIds = new Set<string>();

function mergePendingRows<T extends { id: string }>(cloudRows: T[], localRows: T[], pending: Set<string>, deleting?: Set<string>) {
  const localById = new Map(localRows.map(row => [row.id, row]));
  const merged = cloudRows
    .filter(row => !deleting?.has(row.id))
    .map(row => (pending.has(row.id) ? (localById.get(row.id) ?? row) : row));
  localRows.forEach(row => {
    if (pending.has(row.id) && !merged.some(item => item.id === row.id)) {
      merged.push(row);
    }
  });
  return merged;
}

function clearIds(set: Set<string>, ids: string[]) {
  ids.forEach(id => set.delete(id));
}

type PendingBucket = { set: Set<string>; ids: string[] };
type SyncOptions = {
  pending?: PendingBucket[];
  deleting?: PendingBucket[];
  rollback?: () => void;
};

function clearSyncOptions(options?: SyncOptions) {
  options?.pending?.forEach(bucket => clearIds(bucket.set, bucket.ids));
  options?.deleting?.forEach(bucket => clearIds(bucket.set, bucket.ids));
}

function subscribeRealtime() {
  if (realtimeChannel || typeof window === 'undefined') return;
  const refresh = async () => {
    try {
      const data = await fetchAll();
      setState({
        ...data,
        folders: mergePendingRows(data.folders, state.folders, pendingFolderIds, deletingFolderIds),
        templates: mergePendingRows(data.templates, state.templates, pendingTemplateIds, deletingTemplateIds),
        projects: mergePendingRows(data.projects, state.projects, pendingProjectIds, deletingProjectIds),
        sections: mergePendingRows(data.sections, state.sections, pendingSectionIds, deletingSectionIds),
        tasks: mergePendingRows(data.tasks, state.tasks, pendingTaskIds, deletingTaskIds),
        forms: mergePendingRows(data.forms, state.forms, pendingFormIds, deletingFormIds),
        formAnswers: mergePendingRows(data.formAnswers, state.formAnswers, pendingFormAnswerIds),
        senhas: mergePendingRows(data.senhas, state.senhas, pendingSenhaIds, deletingSenhaIds),
        _lastSyncError: null,
      });
    } catch (e: any) {
      raiseSyncError(e?.message ?? 'Falha ao atualizar Operações em tempo real.');
    }
  };
  realtimeChannel = supabase
    .channel('op-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'op_folders' },  refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'op_projects' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'op_sections' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'op_tasks' },    refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'op_templates' },refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'op_forms' },    refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'op_form_answers' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'op_senhas' },   refresh)
    .subscribe();
}

// dispara na 1ª leitura do store no browser
if (typeof window !== 'undefined') {
  setTimeout(() => { hydrate(); }, 0);
}

// Sincroniza com o Cloud e mostra erro real em vez de deixar a ação “sumir”.
const bg = (p: any, options?: SyncOptions) => {
  setState({ _syncing: true, _lastSyncError: null });
  const run = () => (typeof p === 'function' ? p() : p);
  const attempt = (count = 0) => Promise.resolve(run())
    .then((r: any) => {
      const results = Array.isArray(r) ? r : [r];
      const failed = results.find((item: any) => item?.error);
      if (failed?.error) {
        if (count < 2) {
          setTimeout(() => attempt(count + 1), 500 * (count + 1));
          return;
        }
        clearSyncOptions(options);
        options?.rollback?.();
        raiseSyncError(failed.error.message ?? String(failed.error));
        return;
      }
      clearSyncOptions(options);
      setState({ _syncing: false, _lastSyncError: null });
    })
    .catch((e: any) => {
      if (count < 2) {
        setTimeout(() => attempt(count + 1), 500 * (count + 1));
        return;
      }
      clearSyncOptions(options);
      options?.rollback?.();
      raiseSyncError(e?.message ?? String(e));
    });
  attempt();
};

function patchTaskLocal(taskId: string, fn: (t: OpTask) => OpTask): OpTask | undefined {
  let out: OpTask | undefined;
  const tasks = state.tasks.map(t => {
    if (t.id !== taskId) return t;
    out = fn(t);
    return out;
  });
  setState({ tasks });
  return out;
}
function patchTemplateLocal(id: string, fn: (t: OpTemplate) => OpTemplate): OpTemplate | undefined {
  let out: OpTemplate | undefined;
  const templates = state.templates.map(t => { if (t.id !== id) return t; out = fn(t); return out; });
  setState({ templates });
  return out;
}
function patchFormLocal(id: string, fn: (f: OpForm) => OpForm): OpForm | undefined {
  let out: OpForm | undefined;
  const forms = state.forms.map(f => { if (f.id !== id) return f; out = fn(f); return out; });
  setState({ forms });
  return out;
}
function patchSenhaLocal(id: string, fn: (s: OpSenha) => OpSenha): OpSenha | undefined {
  let out: OpSenha | undefined;
  const senhas = state.senhas.map(s => { if (s.id !== id) return s; out = fn(s); return out; });
  setState({ senhas });
  return out;
}

// ============= Public API =============

export const opStore = {
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  get() { return state; },
  hydrate,
  async forceSyncLegacy() {
    const res = await migrateLegacyIfNeeded(true);
    if (res.ok) {
      try {
        const data = await fetchAll();
        setState({ ...data });
      } catch (e) { console.warn('[Operações] refetch após sync falhou:', e); }
    }
    return res;
  },
  reset() {
    // limpa apenas flags locais; dados permanecem no Cloud
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LEGACY_KEY);
      window.localStorage.removeItem(MIGRATED_FLAG);
    }
  },

  // Folders
  addFolder(name: string) {
    const id = uid();
    const previous = state.folders;
    pendingFolderIds.add(id);
    setState({ folders: [...state.folders, { id, name }] });
    bg(() => supabase.from('op_folders').upsert({ id, name }), {
      pending: [{ set: pendingFolderIds, ids: [id] }],
      rollback: () => setState({ folders: previous }),
    });
  },
  renameFolder(id: string, name: string) {
    const previous = state.folders;
    pendingFolderIds.add(id);
    setState({ folders: state.folders.map(f => f.id === id ? { ...f, name } : f) });
    bg(() => supabase.from('op_folders').update({ name, updated_at: new Date().toISOString() }).eq('id', id), {
      pending: [{ set: pendingFolderIds, ids: [id] }],
      rollback: () => setState({ folders: previous }),
    });
  },
  removeFolder(id: string) {
    const previous = {
      folders: state.folders,
      projects: state.projects,
      sections: state.sections,
      tasks: state.tasks,
    };
    const projIds = state.projects.filter(p => p.folderId === id).map(p => p.id);
    const secIds = state.sections.filter(s => projIds.includes(s.projectId)).map(s => s.id);
    const taskIds = state.tasks.filter(t => secIds.includes(t.sectionId)).map(t => t.id);
    deletingFolderIds.add(id);
    projIds.forEach(projectId => deletingProjectIds.add(projectId));
    secIds.forEach(sectionId => deletingSectionIds.add(sectionId));
    taskIds.forEach(taskId => deletingTaskIds.add(taskId));
    setState({
      folders: state.folders.filter(f => f.id !== id),
      projects: state.projects.filter(p => p.folderId !== id),
      sections: state.sections.filter(s => !projIds.includes(s.projectId)),
      tasks: state.tasks.filter(t => !secIds.includes(t.sectionId)),
    });
    bg(() => supabase.from('op_folders').delete().eq('id', id), {
      deleting: [
        { set: deletingFolderIds, ids: [id] },
        { set: deletingProjectIds, ids: projIds },
        { set: deletingSectionIds, ids: secIds },
        { set: deletingTaskIds, ids: taskIds },
      ],
      rollback: () => setState(previous),
    });
  },

  // Projects
  addProject(folderId: string, name: string) {
    const id = uid();
    const previous = state.projects;
    pendingProjectIds.add(id);
    setState({ projects: [...state.projects, { id, folderId, name, status: 'nao_iniciado' }] });
    bg(() => supabase.from('op_projects').upsert({ id, folder_id: folderId, name, status: 'nao_iniciado' }), {
      pending: [{ set: pendingProjectIds, ids: [id] }],
      rollback: () => setState({ projects: previous }),
    });
    return id;
  },
  renameProject(id: string, name: string) {
    const previous = state.projects;
    pendingProjectIds.add(id);
    setState({ projects: state.projects.map(p => p.id === id ? { ...p, name } : p) });
    bg(() => supabase.from('op_projects').update({ name, updated_at: new Date().toISOString() }).eq('id', id), {
      pending: [{ set: pendingProjectIds, ids: [id] }],
      rollback: () => setState({ projects: previous }),
    });
  },
  updateProjectStatus(id: string, s: OpProject['status']) {
    const previous = state.projects;
    pendingProjectIds.add(id);
    setState({ projects: state.projects.map(p => p.id === id ? { ...p, status: s } : p) });
    bg(() => supabase.from('op_projects').update({ status: s, updated_at: new Date().toISOString() }).eq('id', id), {
      pending: [{ set: pendingProjectIds, ids: [id] }],
      rollback: () => setState({ projects: previous }),
    });
  },
  removeProject(id: string) {
    const previous = { projects: state.projects, sections: state.sections, tasks: state.tasks };
    const secIds = state.sections.filter(s => s.projectId === id).map(s => s.id);
    const taskIds = state.tasks.filter(t => secIds.includes(t.sectionId)).map(t => t.id);
    deletingProjectIds.add(id);
    secIds.forEach(sectionId => deletingSectionIds.add(sectionId));
    taskIds.forEach(taskId => deletingTaskIds.add(taskId));
    setState({
      projects: state.projects.filter(p => p.id !== id),
      sections: state.sections.filter(s => s.projectId !== id),
      tasks: state.tasks.filter(t => !secIds.includes(t.sectionId)),
    });
    bg(() => supabase.from('op_projects').delete().eq('id', id), {
      deleting: [
        { set: deletingProjectIds, ids: [id] },
        { set: deletingSectionIds, ids: secIds },
        { set: deletingTaskIds, ids: taskIds },
      ],
      rollback: () => setState(previous),
    });
  },

  // Sections
  addSection(projectId: string, name: string) {
    const id = uid();
    const order = state.sections.filter(s => s.projectId === projectId).length;
    const previous = state.sections;
    pendingSectionIds.add(id);
    setState({ sections: [...state.sections, { id, projectId, name, order }] });
    bg(() => supabase.from('op_sections').upsert({ id, project_id: projectId, name, position: order }), {
      pending: [{ set: pendingSectionIds, ids: [id] }],
      rollback: () => setState({ sections: previous }),
    });
  },
  renameSection(id: string, name: string) {
    const previous = state.sections;
    pendingSectionIds.add(id);
    setState({ sections: state.sections.map(s => s.id === id ? { ...s, name } : s) });
    bg(() => supabase.from('op_sections').update({ name, updated_at: new Date().toISOString() }).eq('id', id), {
      pending: [{ set: pendingSectionIds, ids: [id] }],
      rollback: () => setState({ sections: previous }),
    });
  },
  removeSection(id: string) {
    const previous = { sections: state.sections, tasks: state.tasks };
    const taskIds = state.tasks.filter(t => t.sectionId === id).map(t => t.id);
    deletingSectionIds.add(id);
    taskIds.forEach(taskId => deletingTaskIds.add(taskId));
    setState({ sections: state.sections.filter(s => s.id !== id), tasks: state.tasks.filter(t => t.sectionId !== id) });
    bg(() => supabase.from('op_sections').delete().eq('id', id), {
      deleting: [
        { set: deletingSectionIds, ids: [id] },
        { set: deletingTaskIds, ids: taskIds },
      ],
      rollback: () => setState(previous),
    });
  },

  // Tasks
  addTask(sectionId: string, name: string) {
    const id = uid();
    const position = state.tasks.filter(t => t.sectionId === sectionId).length;
    const task: OpTask = { id, sectionId, name, status: 'nao_iniciado', priority: 'media', tags: [], checklist: [], comments: [], position };
    const previous = state.tasks;
    pendingTaskIds.add(id);
    setState({ tasks: [...state.tasks, task] });
    bg(() => supabase.from('op_tasks').upsert(taskToRow(task)), {
      pending: [{ set: pendingTaskIds, ids: [id] }],
      rollback: () => setState({ tasks: previous }),
    });
    return id;
  },
  updateTask(id: string, patch: Partial<OpTask>) {
    let updated: OpTask | null = null;
    const previous = state.tasks;
    pendingTaskIds.add(id);
    setState({ tasks: state.tasks.map(t => {
      if (t.id !== id) return t;
      updated = { ...t, ...patch };
      return updated;
    }) });
    if (updated) {
      const taskForSync = updated;
      bg(() => supabase.from('op_tasks').update(taskToRow(taskForSync)).eq('id', id), {
      pending: [{ set: pendingTaskIds, ids: [id] }],
      rollback: () => setState({ tasks: previous }),
      });
    }
  },
  addChecklistItem(taskId: string, text: string) {
    const item = { id: uid(), text, done: false };
    const previous = state.tasks;
    pendingTaskIds.add(taskId);
    const u = patchTaskLocal(taskId, t => ({ ...t, checklist: [...t.checklist, item] }));
    if (u) bg(() => supabase.from('op_tasks').update({ checklist: u.checklist, updated_at: new Date().toISOString() }).eq('id', taskId), {
      pending: [{ set: pendingTaskIds, ids: [taskId] }],
      rollback: () => setState({ tasks: previous }),
    });
  },
  toggleChecklistItem(taskId: string, itemId: string) {
    const previous = state.tasks;
    pendingTaskIds.add(taskId);
    const u = patchTaskLocal(taskId, t => ({ ...t, checklist: t.checklist.map(i => i.id === itemId ? { ...i, done: !i.done } : i) }));
    if (u) bg(() => supabase.from('op_tasks').update({ checklist: u.checklist, updated_at: new Date().toISOString() }).eq('id', taskId), {
      pending: [{ set: pendingTaskIds, ids: [taskId] }],
      rollback: () => setState({ tasks: previous }),
    });
  },
  removeChecklistItem(taskId: string, itemId: string) {
    const previous = state.tasks;
    pendingTaskIds.add(taskId);
    const u = patchTaskLocal(taskId, t => ({ ...t, checklist: t.checklist.filter(i => i.id !== itemId) }));
    if (u) bg(() => supabase.from('op_tasks').update({ checklist: u.checklist, updated_at: new Date().toISOString() }).eq('id', taskId), {
      pending: [{ set: pendingTaskIds, ids: [taskId] }],
      rollback: () => setState({ tasks: previous }),
    });
  },
  addComment(taskId: string, authorId: string, text: string, authorName?: string) {
    const c: OpComment = { id: uid(), authorId, authorName, text, createdAt: new Date().toISOString() };
    const previous = state.tasks;
    pendingTaskIds.add(taskId);
    const u = patchTaskLocal(taskId, t => ({ ...t, comments: [...t.comments, c] }));
    if (u) bg(() => supabase.from('op_tasks').update({ comments: u.comments, updated_at: new Date().toISOString() }).eq('id', taskId), {
      pending: [{ set: pendingTaskIds, ids: [taskId] }],
      rollback: () => setState({ tasks: previous }),
    });
  },
  removeTask(id: string) {
    const previous = state.tasks;
    deletingTaskIds.add(id);
    setState({ tasks: state.tasks.filter(t => t.id !== id) });
    bg(() => supabase.from('op_tasks').delete().eq('id', id), {
      deleting: [{ set: deletingTaskIds, ids: [id] }],
      rollback: () => setState({ tasks: previous }),
    });
  },
  moveTask(id: string, direction: 'up' | 'down') {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    const siblings = state.tasks.filter(t => t.sectionId === task.sectionId);
    const idx = siblings.findIndex(t => t.id === id);
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= siblings.length) return;
    const other = siblings[swapWith];
    const tasks = [...state.tasks];
    const i1 = tasks.findIndex(t => t.id === task.id);
    const i2 = tasks.findIndex(t => t.id === other.id);
    [tasks[i1], tasks[i2]] = [tasks[i2], tasks[i1]];
    // recompute positions for siblings
    let pos = 0;
    const withPos = tasks.map(t => {
      if (t.sectionId !== task.sectionId) return t;
      return { ...t, position: pos++ };
    });
    setState({ tasks: withPos });
    // sync positions
    const patches = withPos.filter(t => t.sectionId === task.sectionId);
    patches.forEach(p => bg(supabase.from('op_tasks').update({ position: p.position }).eq('id', p.id)));
  },
  reorderTask(id: string, targetId: string, position: 'before' | 'after' = 'before') {
    if (id === targetId) return;
    const src = state.tasks.find(t => t.id === id);
    const tgt = state.tasks.find(t => t.id === targetId);
    if (!src || !tgt) return;
    const tasks = state.tasks.filter(t => t.id !== id);
    const moved = { ...src, sectionId: tgt.sectionId };
    const idx = tasks.findIndex(t => t.id === targetId);
    tasks.splice(position === 'before' ? idx : idx + 1, 0, moved);
    // recompute positions for target section
    let pos = 0;
    const withPos = tasks.map(t => {
      if (t.sectionId !== tgt.sectionId) return t;
      return { ...t, position: pos++ };
    });
    setState({ tasks: withPos });
    bg(supabase.from('op_tasks').update({ section_id: tgt.sectionId, position: withPos.find(t => t.id === id)?.position ?? 0 }).eq('id', id));
    withPos.filter(t => t.sectionId === tgt.sectionId && t.id !== id).forEach(p =>
      bg(supabase.from('op_tasks').update({ position: p.position }).eq('id', p.id))
    );
  },

  // Templates
  applyTemplate(templateId: string, folderId: string, projectName: string) {
    const tpl = state.templates.find(t => t.id === templateId);
    if (!tpl) return null;
    const projectId = uid();
    const newSections: OpSection[] = tpl.sections.map((s, i) => ({ id: uid(), projectId, name: s.name, order: i }));
    const newTasks: OpTask[] = [];
    tpl.sections.forEach((s, i) => {
      s.tasks.forEach((tt, pos) => {
        newTasks.push({
          id: uid(), sectionId: newSections[i].id, name: tt.name,
          status: 'nao_iniciado', priority: 'media', tags: [],
          checklist: (tt.subtasks ?? []).map(st => ({ id: uid(), text: st, done: false })),
          comments: [], position: pos,
        });
      });
    });
    // Marca como pendente para o realtime não sobrescrever antes do commit.
    pendingProjectIds.add(projectId);
    newSections.forEach(s => pendingSectionIds.add(s.id));
    newTasks.forEach(t => pendingTaskIds.add(t.id));
    setState({
      projects: [...state.projects, { id: projectId, folderId, name: projectName, status: 'nao_iniciado' }],
      sections: [...state.sections, ...newSections],
      tasks: [...state.tasks, ...newTasks],
    });
    // Inserts em CADEIA (await), não em paralelo — as FKs exigem que
    // op_projects commite antes de op_sections, e op_sections antes de op_tasks.
    (async () => {
      try {
        const { error: e1 } = await supabase.from('op_projects')
          .insert({ id: projectId, folder_id: folderId, name: projectName, status: 'nao_iniciado' });
        if (e1) throw e1;
        if (newSections.length) {
          const { error: e2 } = await supabase.from('op_sections')
            .insert(newSections.map(s => ({ id: s.id, project_id: s.projectId, name: s.name, position: s.order })));
          if (e2) throw e2;
        }
        if (newTasks.length) {
          const { error: e3 } = await supabase.from('op_tasks').insert(newTasks.map(taskToRow));
          if (e3) throw e3;
        }
        // libera pendências após um pequeno delay para o próximo refresh já ver as linhas
        setTimeout(() => {
          pendingProjectIds.delete(projectId);
          newSections.forEach(s => pendingSectionIds.delete(s.id));
          newTasks.forEach(t => pendingTaskIds.delete(t.id));
        }, 4000);
      } catch (err: any) {
        console.warn('[Operações] applyTemplate falhou:', err?.message ?? err);
        // rollback local
        pendingProjectIds.delete(projectId);
        newSections.forEach(s => pendingSectionIds.delete(s.id));
        newTasks.forEach(t => pendingTaskIds.delete(t.id));
        setState({
          projects: state.projects.filter(p => p.id !== projectId),
          sections: state.sections.filter(s => s.projectId !== projectId),
          tasks: state.tasks.filter(t => !newTasks.some(n => n.id === t.id)),
        });
      }
    })();
    return projectId;
  },
  saveProjectAsTemplate(projectId: string, name: string) {
    const secs = state.sections.filter(s => s.projectId === projectId).sort((a, b) => a.order - b.order);
    const tpl: OpTemplate = {
      id: uid(), name,
      sections: secs.map(s => ({
        name: s.name,
        tasks: state.tasks.filter(t => t.sectionId === s.id).map(t => ({
          name: t.name, subtasks: t.checklist.map(c => c.text),
        })),
      })),
    };
    setState({ templates: [...state.templates, tpl] });
    bg(supabase.from('op_templates').insert({ id: tpl.id, name: tpl.name, sections: tpl.sections }));
  },
  removeTemplate(id: string) {
    setState({ templates: state.templates.filter(t => t.id !== id) });
    bg(supabase.from('op_templates').delete().eq('id', id));
  },
  updateTemplate(id: string, patch: Partial<Omit<OpTemplate, 'id'>>) {
    const u = patchTemplateLocal(id, t => ({ ...t, ...patch }));
    if (u) bg(supabase.from('op_templates').update({ name: u.name, sections: u.sections, updated_at: new Date().toISOString() }).eq('id', id));
  },
  duplicateTemplate(id: string) {
    const tpl = state.templates.find(t => t.id === id);
    if (!tpl) return null;
    const copy: OpTemplate = {
      id: uid(),
      name: `${tpl.name} (cópia)`,
      sections: tpl.sections.map(s => ({
        name: s.name,
        tasks: s.tasks.map(t => ({ name: t.name, subtasks: [...(t.subtasks ?? [])] })),
      })),
    };
    // Marca como pendente para não ser removido por um refresh de realtime
    // que rode antes do insert commitar no banco.
    pendingTemplateIds.add(copy.id);
    setState({ templates: [...state.templates, copy] });
    (async () => {
      const { error } = await supabase
        .from('op_templates')
        .upsert({ id: copy.id, name: copy.name, sections: copy.sections as any });
      if (error) {
        console.warn('[Operações] duplicateTemplate falhou:', error.message);
        pendingTemplateIds.delete(copy.id);
        setState({ templates: state.templates.filter(t => t.id !== copy.id) });
      } else {
        // libera após um pequeno delay para o próximo refresh já enxergar a linha
        setTimeout(() => pendingTemplateIds.delete(copy.id), 4000);
      }
    })();
    return copy.id;
  },

  // Forms
  addForm(name: string) {
    const id = uid();
    setState({ forms: [...state.forms, { id, name, fields: [] }] });
    bg(supabase.from('op_forms').insert({ id, name, fields: [] }));
    return id;
  },
  updateForm(id: string, patch: Partial<OpForm>) {
    const u = patchFormLocal(id, f => ({ ...f, ...patch }));
    if (u) bg(supabase.from('op_forms').update({ name: u.name, fields: u.fields, updated_at: new Date().toISOString() }).eq('id', id));
  },
  removeForm(id: string) {
    setState({ forms: state.forms.filter(f => f.id !== id) });
    bg(supabase.from('op_forms').delete().eq('id', id));
  },
  addFormField(formId: string, field: Omit<OpFormField, 'id'>) {
    const withId = { ...field, id: uid() };
    const u = patchFormLocal(formId, f => ({ ...f, fields: [...f.fields, withId] }));
    if (u) bg(supabase.from('op_forms').update({ fields: u.fields, updated_at: new Date().toISOString() }).eq('id', formId));
  },
  removeFormField(formId: string, fieldId: string) {
    const u = patchFormLocal(formId, f => ({ ...f, fields: f.fields.filter(x => x.id !== fieldId) }));
    if (u) bg(supabase.from('op_forms').update({ fields: u.fields, updated_at: new Date().toISOString() }).eq('id', formId));
  },
  submitFormAnswer(formId: string, projectId: string | undefined, values: Record<string, any>) {
    const answer: OpFormAnswer = { id: uid(), formId, projectId, values, createdAt: new Date().toISOString() };
    setState({ formAnswers: [...state.formAnswers, answer] });
    bg(supabase.from('op_form_answers').insert({
      id: answer.id, form_id: formId, project_id: projectId ?? null, values, created_at: answer.createdAt,
    }));
  },

  // Senhas
  addSenha(s: Omit<OpSenha, 'id' | 'password'> & { password: string }) {
    const encoded = typeof window !== 'undefined' ? btoa(unescape(encodeURIComponent(s.password))) : s.password;
    const id = uid();
    const row: OpSenha = { ...s, id, password: encoded };
    setState({ senhas: [...state.senhas, row] });
    bg(supabase.from('op_senhas').insert({
      id, client_name: row.clientName, service: row.service, username: row.username,
      password: row.password, notes: row.notes ?? null,
    }));
  },
  updateSenha(id: string, patch: Partial<Omit<OpSenha, 'id'>>) {
    if (patch.password && typeof window !== 'undefined') {
      patch = { ...patch, password: btoa(unescape(encodeURIComponent(patch.password))) };
    }
    const u = patchSenhaLocal(id, s => ({ ...s, ...patch }));
    if (u) bg(supabase.from('op_senhas').update({
      client_name: u.clientName, service: u.service, username: u.username,
      password: u.password, notes: u.notes ?? null, updated_at: new Date().toISOString(),
    }).eq('id', id));
  },
  removeSenha(id: string) {
    setState({ senhas: state.senhas.filter(s => s.id !== id) });
    bg(supabase.from('op_senhas').delete().eq('id', id));
  },
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

// ============= Task → Client resolver =============
// Folder = Cliente. Resolve o cliente de uma tarefa via section→project→folder.
export function getTaskClientName(
  store: Pick<Store, 'sections' | 'projects' | 'folders'>,
  task: Pick<OpTask, 'sectionId'>,
): string {
  const section = store.sections.find(s => s.id === task.sectionId);
  if (!section) return '—';
  const project = store.projects.find(p => p.id === section.projectId);
  if (!project) return '—';
  const folder = store.folders.find(f => f.id === project.folderId);
  return folder?.name ?? '—';
}

export function getTaskProjectName(
  store: Pick<Store, 'sections' | 'projects'>,
  task: Pick<OpTask, 'sectionId'>,
): string | null {
  const section = store.sections.find(s => s.id === task.sectionId);
  if (!section) return null;
  const project = store.projects.find(p => p.id === section.projectId);
  return project?.name ?? null;
}


