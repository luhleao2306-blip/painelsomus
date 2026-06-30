import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TaskStatus = 
  | 'Backlog' 
  | 'A fazer' 
  | 'Em andamento' 
  | 'Aguardando cliente' 
  | 'Aguardando time' 
  | 'Em revisão' 
  | 'Aprovado' 
  | 'Concluído' 
  | 'Cancelado';

export type Priority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type DemandType = 'Cliente' | 'Time' | 'Aprovação' | 'Administrativo' | 'Estratégico';

const VALID_DEMAND_TYPES: DemandType[] = ['Cliente', 'Time', 'Aprovação', 'Administrativo', 'Estratégico'];

const normalizeDemandType = (value: unknown): DemandType => {
  if (VALID_DEMAND_TYPES.includes(value as DemandType)) return value as DemandType;
  return 'Administrativo';
};

const normalizePersonKey = (value: string | null | undefined) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const splitAssigneeParts = (value: string) =>
  value
    .split(/\s*(?:,|;|\/|\+|&|\be\b)\s*/i)
    .map(part => part.trim())
    .filter(Boolean);

const uniqueNames = (names: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const key = normalizePersonKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(name.trim());
  }
  return result;
};

let registeredAssigneeNamesCache: string[] | null = null;

const fetchRegisteredAssigneeNames = async () => {
  if (registeredAssigneeNamesCache) return registeredAssigneeNamesCache;
  const [profilesRes, collabsRes] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('status', 'active'),
    (supabase as any).from('collaborators').select('full_name').eq('status', 'ativo'),
  ]);
  registeredAssigneeNamesCache = uniqueNames([
    ...((profilesRes.data ?? []) as any[]).map(p => p.full_name),
    ...((collabsRes.data ?? []) as any[]).map(c => c.full_name),
  ].filter((name): name is string => typeof name === 'string' && name.trim().length > 0));
  return registeredAssigneeNamesCache;
};

const resolveRegisteredAssignee = (value: string | null | undefined, registeredNames: string[]): string => {
  const trimmed = (value ?? '').trim();
  if (!trimmed || registeredNames.length === 0) return trimmed;

  const exact = registeredNames.find(name => normalizePersonKey(name) === normalizePersonKey(trimmed));
  if (exact) return exact.trim();

  const parts = splitAssigneeParts(trimmed);
  if (parts.length > 1) {
    return uniqueNames(parts.map(part => resolveRegisteredAssignee(part, registeredNames))).join(', ');
  }

  const key = normalizePersonKey(trimmed);
  const matches = registeredNames.filter(name => normalizePersonKey(name).split(' ')[0] === key);
  return matches.length === 1 ? matches[0].trim() : trimmed;
};

const normalizeTaskAssignees = (input: any, registeredNames: string[]) => ({
  ...input,
  assignee: input.assignee === undefined ? undefined : resolveRegisteredAssignee(input.assignee, registeredNames) || null,
  assignees: Array.isArray(input.assignees)
    ? uniqueNames(input.assignees.map((name: string): string => resolveRegisteredAssignee(name, registeredNames)).filter(Boolean))
    : input.assignees,
});

export interface Subtask {
  id: string;
  title: string;
  assignee: string | null;
  completed: boolean;
  status: 'Pendente' | 'Concluído';
  deadline: string | null;
  type: string | null;
  priority: Priority;
  order: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  projectId: string;
  projectIds: string[];
  stageId: string | null;
  assignee: string | null;
  assignees: string[];
  type: DemandType;
  priority: Priority;
  status: TaskStatus;
  startDate: string | null;
  deadline: string | null;
  visibleToClient: boolean;
  delayReason: string | null;
  delayType?: 'Cliente' | 'Time' | 'Aprovação' | null;
  subtasks: Subtask[];
  clientId: string;
  timeInvestedSeconds: number;
  requiresApproval: boolean;
  requestedBy: string | null;
  tags: string[];
  recurrence?: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'ongoing' | null;
}


export interface ProjectStage {
  id: string;
  name: string;
  description: string | null;
  order: number;
  status: 'Pendente' | 'Em andamento' | 'Concluído';
  responsible: string | null;
  approver: string | null;
  deadline: string | null;
}

export interface Project {
  id: string;
  name: string;
  clientId: string | null;
  description: string | null;
  status: 'Planejamento' | 'Em andamento' | 'Finalizando' | 'Concluído' | 'Em Pausa';
  priority: Priority;
  startDate: string | null;
  deadline: string | null;
  consultantId: string | null;
  managerName: string | null;
  progress: number;
  visibleToClient: boolean;
  stages: ProjectStage[];
  currentStageIndex: number;
  team: number;
  isInternal: boolean;
  tags: string[];
}

export interface StageTemplate {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  stages: { name: string; color?: string | null }[];
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  status: 'Ativo' | 'Pendente' | 'Em Pausa';
  manager_id: string | null;
  responsible_name: string | null;
  email: string | null;
  phone: string | null;
  manager_name: string | null;
  contract_start: string | null;
  contract_end: string | null;
  is_ongoing?: boolean | null;
  birthday?: string | null;
  observations: string | null;
}

export interface Deliverable {
  id: string;
  name: string;
  projectId: string;
  clientId: string;
  type: string;
  externalLink?: string;
  filePath?: string;
  status: 'Pendente' | 'Entregue' | 'Aprovado' | 'Atrasado';
  forecastDate: string;
  actualDate?: string;
  visibleToClient: boolean;
  downloadEnabled: boolean;
}

export interface Document {
  id: string;
  name: string;
  clientId: string;
  projectId?: string;
  category: string;
  externalLink?: string;
  filePath?: string;
  version: string;
  visibleToClient: boolean;
  downloadEnabled: boolean;
  type: string; 
  size: string;
  date: string;
  owner?: string;
  isContract?: boolean;
}

export type ContractStatus = 'Ativo' | 'Em Renovação' | 'Encerrado' | 'Cancelado' | 'Suspenso' | 'Vigente';

export interface Contract {
  id: string;
  clientId: string;
  projectId?: string | null;
  name: string;
  externalLink?: string | null;
  filePath?: string | null;
  status: ContractStatus;
  startDate: string | null;
  endDate: string | null;
  downloadEnabled: boolean;
  visibleToClient: boolean;
  segment?: string | null;
  product?: string | null;
  termMonths?: number | null;
  monthlyValue?: number | null;
  totalValue?: number | null;
  sellerId?: string | null;
  internalNotes?: string | null;
}

export type MeetingMinuteStatus =
  | 'Rascunho'
  | 'Revisada'
  | 'Enviada ao cliente'
  | 'Aprovada'
  | 'Arquivada';

export interface MeetingMinute {
  id: string;
  title: string;
  clientId: string;
  projectId: string;
  date: string;
  attendees: string[];
  agenda: string;
  decisions: string;
  clientPending: string;
  teamPending: string;
  nextSteps: string;
  recordingLink?: string;
  externalLink?: string;
  filePath?: string;
  visibleToClient: boolean;
  downloadEnabled: boolean;
  status: MeetingMinuteStatus;
  internalResponsibleId?: string | null;
}

export type IntelligentCentralAudience =
  | 'self'
  | 'all_clients'
  | 'specific_clients';

export interface IntelligentCentralItem {
  id: string;
  name: string;
  type: string;
  category: string | null;
  linkUrl: string;
  description: string | null;
  visibility: 'private' | 'team' | 'all';
  status: 'active' | 'inactive';
  isFavorite: boolean;
  releasedToClient: boolean;
  audience: IntelligentCentralAudience;
  audienceUserIds: string[];
  createdAt: string;
  createdBy: string | null;
}

interface DataContextType {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  documents: Document[];
  deliverables: Deliverable[];
  contracts: Contract[];
  minutes: MeetingMinute[];
  intelligentCentral: IntelligentCentralItem[];
  refreshClients: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshDeliverables: () => Promise<void>;
  refreshDocuments: () => Promise<void>;
  refreshContracts: () => Promise<void>;
  refreshMinutes: () => Promise<void>;
  refreshIntelligentCentral: () => Promise<void>;
  addClient: (client: Omit<Client, 'id'>) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'stages' | 'currentStageIndex' | 'team'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'subtasks'>) => Promise<string | void>;
  deleteTask: (id: string) => Promise<void>;
  updateSubtask: (id: string, updates: Partial<Subtask>) => Promise<void>;
  addSubtask: (taskId: string, subtask: Partial<Subtask>) => Promise<void>;
  deleteSubtask: (id: string) => Promise<void>;
  addDocument: (doc: any, file?: File) => Promise<void>;
  updateDocument: (id: string, updates: any) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  addDeliverable: (del: any, file?: File) => Promise<void>;
  updateDeliverable: (id: string, updates: any) => Promise<void>;
  deleteDeliverable: (id: string) => Promise<void>;
  addContract: (contract: any, file?: File) => Promise<void>;
  updateContract: (id: string, updates: any) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;
  addMinute: (minute: any, file?: File) => Promise<void>;
  updateMinute: (id: string, updates: any) => Promise<void>;
  deleteMinute: (id: string) => Promise<void>;
  addIntelligentCentral: (item: any) => Promise<void>;
  updateIntelligentCentral: (id: string, updates: any) => Promise<void>;
  deleteIntelligentCentral: (id: string) => Promise<void>;
  getDownloadUrl: (filePath: string) => Promise<string | null>;
  filteredClients: Client[];
  filteredProjects: Project[];
  filteredTasks: Task[];
  filteredDocuments: Document[];
  filteredDeliverables: Deliverable[];
  filteredContracts: Contract[];
  filteredMinutes: MeetingMinute[];
  filteredIntelligentCentral: IntelligentCentralItem[];
  delays: Task[];
  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { role, profile } = useProfile();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
  const [intelligentCentral, setIntelligentCentral] = useState<IntelligentCentralItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isClient = role === 'client';
  const clientId = profile?.client_id;

  const clientProjectIds = useMemo(
    () => new Set(projects.filter(p => p.clientId === clientId).map(p => p.id)),
    [projects, clientId]
  );

  const filteredProjects = useMemo(
    () => isClient && clientId ? projects.filter(p => p.clientId === clientId) : projects,
    [projects, isClient, clientId]
  );

  const filteredTasks = useMemo(
    () => isClient && clientId ? tasks.filter(t => t.clientId === clientId || clientProjectIds.has(t.projectId)) : tasks,
    [tasks, isClient, clientId, clientProjectIds]
  );

  const filteredDocuments = useMemo(
    () => isClient && clientId ? documents.filter(d => d.clientId === clientId || (d.projectId ? clientProjectIds.has(d.projectId) : false)) : documents,
    [documents, isClient, clientId, clientProjectIds]
  );

  const filteredDeliverables = useMemo(
    () => isClient && clientId ? deliverables.filter(d => d.clientId === clientId || clientProjectIds.has(d.projectId)) : deliverables,
    [deliverables, isClient, clientId, clientProjectIds]
  );

  const filteredContracts = useMemo(
    () => isClient && clientId ? contracts.filter(c => c.clientId === clientId || (c.projectId ? clientProjectIds.has(c.projectId) : false)) : contracts,
    [contracts, isClient, clientId, clientProjectIds]
  );

  const filteredMinutes = useMemo(
    () => isClient && clientId ? minutes.filter(m => m.clientId === clientId || (m.projectId ? clientProjectIds.has(m.projectId) : false)) : minutes,
    [minutes, isClient, clientId, clientProjectIds]
  );

  const filteredIntelligentCentral = useMemo(() => {
    return intelligentCentral.filter((i) => {
      const r: string = role;
      if (r === 'master' || r === 'project_manager') return true;
      if (i.status !== 'active') return false;
      if (i.createdBy && profile?.id && i.createdBy === profile.id) return true;
      if (r !== 'client') return false;
      switch (i.audience) {
        case 'all_clients':
          return true;
        case 'specific_clients':
          return !!clientId && i.audienceUserIds.includes(clientId);
        case 'self':
        default:
          return false;
      }
    });
  }, [intelligentCentral, role, profile?.id, clientId]);

  const delays = useMemo(() => tasks.filter(t => t.delayType), [tasks]);

  const fetchClients = useCallback(async () => {
    const { data, error } = await supabase.from('clients').select('*');
    if (!error) setClients(data as Client[]);
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase.from('projects').select('*, project_stages(*)');
    if (!error) {
      const formatted: Project[] = (data as any[]).map(p => ({
        id: p.id, name: p.name, clientId: p.client_id, description: p.description,
        status: p.status, priority: p.priority, startDate: p.start_date, deadline: p.deadline,
        consultantId: p.consultant_id, managerName: p.manager_name, progress: p.progress,
        visibleToClient: p.visible_to_client, currentStageIndex: p.current_stage_index, team: p.team_size,
        isInternal: !!p.is_internal, tags: Array.isArray(p.tags) ? p.tags : [],
        stages: (p.project_stages || []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((s: any) => ({
          id: s.id, name: s.name, description: s.description, order: s.sort_order, status: s.status,
          responsible: s.responsible, approver: s.approver, deadline: s.deadline
        }))
      }));
      setProjects(formatted);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase.from('tasks').select('*, subtasks(*)');
      if (error) {
        console.error('Erro ao carregar tarefas:', error);
        toast.error('Não foi possível carregar as tarefas.');
        return;
      }

      const registeredNames = await fetchRegisteredAssigneeNames();
      const taskIds = (data as any[]).map(t => t.id);
      const [aRes, pRes] = await Promise.all([
        taskIds.length
          ? (supabase as any).from('task_assignees').select('task_id, assignee').in('task_id', taskIds)
          : Promise.resolve({ data: [] as any[] }),
        taskIds.length
          ? (supabase as any).from('task_projects').select('task_id, project_id').in('task_id', taskIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      if (aRes.error) console.warn('Erro ao carregar responsáveis extras das tarefas:', aRes.error);
      if (pRes.error) console.warn('Erro ao carregar projetos extras das tarefas:', pRes.error);

      const assigneesByTask = new Map<string, string[]>();
      for (const r of (aRes.data ?? []) as any[]) {
        const list = assigneesByTask.get(r.task_id) ?? [];
        list.push(r.assignee);
        assigneesByTask.set(r.task_id, list);
      }
      const projectsByTask = new Map<string, string[]>();
      for (const r of (pRes.data ?? []) as any[]) {
        const list = projectsByTask.get(r.task_id) ?? [];
        list.push(r.project_id);
        projectsByTask.set(r.task_id, list);
      }

      const { isBeforeToday } = await import('@/lib/date-utils');
      const formatted: Task[] = (data as any[]).map(t => {
        const isOverdue = t.deadline && isBeforeToday(t.deadline) && !['Concluído', 'Cancelado'].includes(t.status);
        let delayType: any = null;
        if (isOverdue) {
          if (t.demand_type === 'Cliente' || t.status === 'Aguardando cliente') delayType = 'Cliente';
          else if (t.demand_type === 'Aprovação' || t.status === 'Em revisão') delayType = 'Aprovação';
          else delayType = 'Time';
        }

        const primaryAssignee = resolveRegisteredAssignee(t.assignee, registeredNames) || null;
        const extraAssignees = (assigneesByTask.get(t.id) ?? [])
          .map(name => resolveRegisteredAssignee(name, registeredNames));
        const allAssignees = Array.from(new Set([
          ...(primaryAssignee ? [primaryAssignee] : []),
          ...extraAssignees,
        ]));
        const extraProjects = projectsByTask.get(t.id) ?? [];
        const allProjects = Array.from(new Set([
          ...(t.project_id ? [t.project_id] : []),
          ...extraProjects,
        ]));

        return {
          id: t.id, title: t.title, description: t.description, projectId: t.project_id,
          projectIds: allProjects,
          stageId: t.stage_id, clientId: t.client_id, assignee: primaryAssignee,
          assignees: allAssignees,
          type: t.demand_type,
          priority: t.priority, status: t.status, startDate: t.start_date, deadline: t.deadline,
          visibleToClient: t.visible_to_client, delayReason: t.delay_reason, delayType,
          timeInvestedSeconds: t.time_invested_seconds ?? 0,
          requiresApproval: t.requires_approval ?? false,
          requestedBy: t.requested_by ?? null,
          tags: Array.isArray((t as any).tags) ? (t as any).tags : [],
          recurrence: (t as any).recurrence ?? 'none',
          subtasks: (t.subtasks || []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((s: any) => ({

            id: s.id, title: s.title, assignee: resolveRegisteredAssignee(s.assignee, registeredNames) || null, completed: s.status === 'Concluído',
            status: s.status, deadline: s.deadline, type: s.demand_type, priority: (s.priority as Priority) || 'Média', order: s.sort_order
          }))
        };
      });
      setTasks(formatted);
    } catch (error) {
      console.error('Erro inesperado ao carregar tarefas:', error);
      toast.error('Não foi possível carregar as tarefas.');
    }
  };

  const fetchDeliverables = async () => {
    const { data, error } = await supabase.from('deliverables').select('*');
    if (!error) {
      setDeliverables((data as any[]).map(d => ({
        id: d.id, name: d.name, projectId: d.project_id, clientId: d.client_id,
        type: d.type, externalLink: d.link, filePath: d.file_path, status: d.status,
        forecastDate: d.forecast_date, actualDate: d.actual_date,
        visibleToClient: d.visible_to_client, downloadEnabled: d.download_enabled
      })));
    }
  };

  const fetchDocuments = async () => {
    const { data, error } = await supabase.from('documents').select('*');
    if (!error) {
      setDocuments((data as any[]).map(d => ({
        id: d.id, name: d.name, clientId: d.client_id, projectId: d.project_id,
        category: d.category, externalLink: d.external_link, filePath: d.file_path, version: d.version,
        visibleToClient: d.visible_to_client, downloadEnabled: d.download_enabled,
        type: d.file_type || 'OUTRO', size: d.file_size || '0 KB', date: d.created_at,
        isContract: d.is_contract
      })));
    }
  };

  const fetchContracts = async () => {
    const contractsSource = role === 'client' ? 'contracts_client_view' : 'contracts';
    const query = (supabase as any).from(contractsSource).select('*');
    const { data, error } = await query;

    if (!error) {
      setContracts((data as any[]).map(c => ({
        id: c.id, clientId: c.client_id, projectId: c.project_id, name: c.name,
        externalLink: role === 'client' ? null : c.external_link, filePath: c.file_path, status: c.status,
        startDate: c.start_date, endDate: c.end_date,
        downloadEnabled: c.download_enabled, visibleToClient: c.visible_to_client,
        product: c.product, termMonths: c.term_months,
        segment: role === 'client' ? null : c.segment,
        monthlyValue: role === 'client' ? null : c.monthly_value !== null && c.monthly_value !== undefined ? Number(c.monthly_value) : null,
        totalValue: role === 'client' ? null : c.total_value !== null && c.total_value !== undefined ? Number(c.total_value) : null,
        sellerId: role === 'client' ? null : c.seller_id,
        internalNotes: role === 'client' ? null : c.internal_notes,
      })));
    }
  };

  const fetchMinutes = async () => {
    const { data, error } = await supabase.from('meeting_minutes').select('*');
    if (!error) {
      setMinutes((data as any[]).map(m => ({
        id: m.id, title: m.title, clientId: m.client_id, projectId: m.project_id,
        date: m.meeting_date, attendees: m.attendees || [], agenda: m.agenda,
        decisions: m.decisions, clientPending: m.client_pending, teamPending: m.team_pending,
        nextSteps: m.next_steps, recordingLink: m.recording_link,
        externalLink: m.external_link, filePath: m.file_path, visibleToClient: m.visible_to_client,
        downloadEnabled: m.download_enabled,
        status: (m.status ?? 'Rascunho') as MeetingMinuteStatus,
        internalResponsibleId: m.internal_responsible_id ?? null,
      })));
    }
  };

  const fetchIntelligentCentral = async () => {
    const { data, error } = await supabase.from('intelligent_central').select('*');
    if (!error) {
      setIntelligentCentral((data as any[]).map(i => ({
        id: i.id, name: i.name, type: i.type, category: i.category,
        linkUrl: i.link_url, description: i.description, visibility: i.visibility,
        status: i.status, isFavorite: i.is_favorite, releasedToClient: i.released_to_client,
        audience: (i.audience ?? 'all') as IntelligentCentralAudience,
        audienceUserIds: (i.audience_user_ids ?? []) as string[],
        createdAt: i.created_at, createdBy: i.created_by
      })));
    }
  };

  useEffect(() => {
    if (profile) {
      setLoading(true);
      Promise.all([
        fetchClients(), 
        fetchProjects(), 
        fetchTasks(),
        fetchDeliverables(),
        fetchDocuments(),
        fetchContracts(),
        fetchMinutes(),
        fetchIntelligentCentral()
      ]).finally(() => setLoading(false));
    }
  }, [profile, fetchClients]);

  const uploadFile = async (file: File, clientId: string, projectId?: string) => {
    const folder = projectId ? `${clientId}/${projectId}` : `${clientId}/general`;
    const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('client-assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;
    return filePath;
  };

  const getDownloadUrl = async (filePath: string) => {
    const fileName = filePath.split('/').pop() || 'download';
    const { data, error } = await supabase.storage
      .from('client-assets')
      .createSignedUrl(filePath, 3600, { download: fileName });

    if (error) {
      toast.error("Erro ao gerar link de download");
      return null;
    }
    return data.signedUrl;
  };

  const stripUndefined = <T extends Record<string, any>>(value: T) =>
    Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as T;

  // Preserve undefined so stripUndefined removes the key (avoids overwriting columns
  // not present in a partial update). Only convert explicit empty strings to null.
  const emptyToNull = (v: any) => (v === undefined ? undefined : v === '' ? null : v);

  const mapProjectToDb = (input: any) => stripUndefined({
    name: input.name,
    client_id: input.isInternal ? null : (input.clientId || null),
    description: input.description ?? null,
    status: input.status,
    priority: input.priority,
    start_date: emptyToNull(input.startDate),
    deadline: emptyToNull(input.deadline),
    consultant_id: emptyToNull(input.consultantId),
    manager_name: input.managerName ?? null,
    progress: input.progress,
    visible_to_client: input.visibleToClient,
    current_stage_index: input.currentStageIndex,
    team_size: input.team ?? input.teamSize,
    is_internal: input.isInternal ?? undefined,
    tags: Array.isArray(input.tags) ? input.tags : undefined,
  });

  const mapTaskToDb = (input: any) => stripUndefined({
    title: input.title,
    description: input.description ?? null,
    project_id: emptyToNull(input.projectId),
    stage_id: emptyToNull(input.stageId),
    client_id: emptyToNull(input.clientId),
    assignee: emptyToNull(input.assignee),

    demand_type: normalizeDemandType(input.type ?? input.demandType),
    priority: input.priority,
    status: input.status,
    start_date: input.startDate ?? null,
    deadline: input.deadline ?? null,
    visible_to_client: input.visibleToClient,
    delay_reason: input.delayReason ?? null,
    requires_approval: input.requiresApproval,
    requested_by: input.requestedBy ?? null,
    tags: Array.isArray(input.tags) ? input.tags : undefined,
    recurrence: input.recurrence ?? undefined,
  });


  const mapSubtaskToDb = (input: any) => stripUndefined({
    title: input.title,
    assignee: input.assignee ?? null,
    status: input.completed === undefined ? input.status : input.completed ? 'Concluído' : 'Pendente',
    deadline: input.deadline ?? null,
    demand_type: input.type ?? input.demandType ?? null,
    priority: input.priority ?? undefined,
    sort_order: input.order,
  });

  const mapDocumentToDb = (input: any) => stripUndefined({
    client_id: input.clientId,
    project_id: input.projectId ?? null,
    name: input.name,
    category: input.category ?? null,
    external_link: input.externalLink ?? null,
    file_path: input.filePath ?? null,
    version: input.version,
    visible_to_client: input.visibleToClient,
    download_enabled: input.downloadEnabled,
    file_type: input.fileType ?? null,
    file_size: input.fileSize ?? null,
    owner_id: input.ownerId ?? null,
    is_contract: input.isContract,
  });

  const mapDeliverableToDb = (input: any) => stripUndefined({
    client_id: input.clientId,
    project_id: input.projectId ?? null,
    name: input.name,
    type: input.type,
    link: input.externalLink ?? null,
    file_path: input.filePath ?? null,
    status: input.status,
    forecast_date: input.forecastDate ?? null,
    actual_date: input.actualDate ?? null,
    visible_to_client: input.visibleToClient,
    download_enabled: input.downloadEnabled,
  });

  const mapContractToDb = (input: any) => {
    const num = (v: any) => (v === '' || v === undefined ? undefined : v === null ? null : Number(v));
    return stripUndefined({
      client_id: input.clientId,
      project_id: emptyToNull(input.projectId),
      name: input.name,
      external_link: emptyToNull(input.externalLink),
      file_path: input.filePath,
      status: input.status,
      start_date: emptyToNull(input.startDate),
      end_date: emptyToNull(input.endDate),
      visible_to_client: input.visibleToClient,
      download_enabled: input.downloadEnabled,
      segment: emptyToNull(input.segment),
      product: emptyToNull(input.product),
      term_months: num(input.termMonths),
      monthly_value: num(input.monthlyValue),
      total_value: num(input.totalValue),
      seller_id: emptyToNull(input.sellerId),
      internal_notes: emptyToNull(input.internalNotes),
    });
  };

  const mapMinuteToDb = (input: any) => stripUndefined({
    title: input.title,
    client_id: input.clientId,
    project_id: input.projectId || null,
    meeting_date: input.date ? new Date(input.date).toISOString() : undefined,
    attendees: input.attendees,
    agenda: input.agenda ?? null,
    decisions: input.decisions ?? null,
    client_pending: input.clientPending ?? null,
    team_pending: input.teamPending ?? null,
    next_steps: input.nextSteps ?? null,
    recording_link: input.recordingLink ?? null,
    external_link: input.externalLink ?? null,
    file_path: input.filePath ?? null,
    visible_to_client: input.visibleToClient,
    download_enabled: input.downloadEnabled,
    status: input.status,
    internal_responsible_id: input.internalResponsibleId ? input.internalResponsibleId : null,
  });

  const addClient = async (d: any) => {
    const { data, error } = await supabase.from('clients').insert([d]).select().single();
    if (error) throw error;
    setClients(prev => [...prev, data as Client]);
    toast.success('Cliente cadastrado!');
    return data as Client;
  };

  const updateClient = async (id: string, u: any) => {
    const { data, error } = await supabase.from('clients').update(u).eq('id', id).select().single();
    if (error) throw error;
    setClients(prev => prev.map(c => c.id === id ? (data as Client) : c));
    toast.success('Cliente atualizado!');
  };

  const deleteClient = async (id: string) => {
    // Capture profile emails linked to this client BEFORE deleting
    const { data: linkedProfiles } = await supabase
      .from('profiles')
      .select('id,email')
      .eq('client_id', id);

    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir cliente: ' + (error.message || 'desconhecido'));
      throw error;
    }

    // Best-effort: remove auth users / orphan profiles for each linked email
    if (linkedProfiles && linkedProfiles.length > 0) {
      await Promise.all(
        linkedProfiles.map(async (p: any) => {
          if (!p?.email) return;
          try {
            await supabase.functions.invoke('admin-delete-user', { body: { user_id: p.id, email: p.email } });
          } catch { /* ignore */ }
        })
      );
    }

    setClients(prev => prev.filter(c => c.id !== id));
    toast.success('Cliente excluído!');
  };

  const addProject = async (d: any) => {
    try {
      const { error } = await supabase.from('projects').insert([mapProjectToDb(d)]);
      if (error) throw error;
      await fetchProjects();
      toast.success('Projeto criado!');
    } catch (e: any) {
      toast.error('Erro ao criar projeto: ' + (e?.message || 'desconhecido'));
      throw e;
    }
  };

  const updateProject = async (id: string, u: any) => {
    try {
      const { error } = await supabase.from('projects').update(mapProjectToDb(u)).eq('id', id);
      if (error) throw error;
      await fetchProjects();
      toast.success('Projeto atualizado!');
    } catch (e: any) {
      toast.error('Erro ao salvar projeto: ' + (e?.message || 'desconhecido'));
      throw e;
    }
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    setProjects(prev => prev.filter(p => p.id !== id));
    toast.success('Projeto excluído!');
  };

  const syncTaskRelations = async (
    taskId: string,
    assignees: string[] | undefined,
    projectIds: string[] | undefined,
    primary: { assignee?: string | null; projectId?: string | null }
  ) => {
    try {
      if (Array.isArray(assignees)) {
        const extras = assignees.filter(a => a && a !== primary.assignee);
        await (supabase as any).from('task_assignees').delete().eq('task_id', taskId);
        if (extras.length) {
          await (supabase as any).from('task_assignees').insert(
            extras.map(a => ({ task_id: taskId, assignee: a }))
          );
        }
      }
      if (Array.isArray(projectIds)) {
        const extras = projectIds.filter(p => p && p !== primary.projectId);
        await (supabase as any).from('task_projects').delete().eq('task_id', taskId);
        if (extras.length) {
          await (supabase as any).from('task_projects').insert(
            extras.map(p => ({ task_id: taskId, project_id: p }))
          );
        }
      }
    } catch (e) {
      console.error('[syncTaskRelations]', e);
    }
  };

  const addTask = async (d: any) => {
    try {
      const registeredNames = await fetchRegisteredAssigneeNames();
      const normalizedTask = normalizeTaskAssignees(d, registeredNames);
      const payload = mapTaskToDb({
        ...normalizedTask,
        status: normalizedTask.status || 'A fazer',
        priority: normalizedTask.priority || 'Média',
        type: normalizeDemandType(normalizedTask.type ?? normalizedTask.demandType ?? 'Cliente'),
        visibleToClient: normalizedTask.visibleToClient ?? true,
      });
      const { data: inserted, error } = await supabase.from('tasks').insert([payload]).select('id').single();
      if (error) throw error;
      if (inserted?.id) {
        await syncTaskRelations(inserted.id, normalizedTask.assignees, normalizedTask.projectIds, {
          assignee: normalizedTask.assignee ?? null,
          projectId: normalizedTask.projectId ?? null,
        });
      }
      await fetchTasks();
      toast.success('Tarefa criada!');
      return inserted?.id as string | undefined;
    } catch (e: any) {
      toast.error('Erro ao criar tarefa: ' + (e?.message || 'desconhecido'));
      throw e;
    }
  };

  const updateTask = async (id: string, u: any) => {
    try {
      const registeredNames = await fetchRegisteredAssigneeNames();
      const normalizedUpdates = normalizeTaskAssignees(u, registeredNames);
      const { error } = await supabase.from('tasks').update(mapTaskToDb(normalizedUpdates)).eq('id', id);
      if (error) throw error;
      await syncTaskRelations(id, normalizedUpdates.assignees, normalizedUpdates.projectIds, {
        assignee: normalizedUpdates.assignee,
        projectId: normalizedUpdates.projectId,
      });
      await fetchTasks();
      toast.success('Tarefa atualizada!');
    } catch (e: any) {
      const msg = e?.message || '';
      if (!msg.includes('tempo investido')) {
        toast.error('Erro ao atualizar tarefa: ' + (msg || 'desconhecido'));
      }
      throw e;
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success('Tarefa excluída!');
  };

  const updateSubtask = async (id: string, u: any) => {
    const { error } = await supabase.from('subtasks').update(mapSubtaskToDb(u)).eq('id', id);
    if (error) throw error;
    await fetchTasks();
  };

  const addSubtask = async (taskId: string, s: any) => {
    try {
      const payload = {
        task_id: taskId,
        title: s.title,
        assignee: s.assignee ?? null,
        status: s.completed ? 'Concluído' : (s.status || 'Pendente'),
        deadline: s.deadline ?? null,
        demand_type: s.type ?? s.demandType ?? null,
        sort_order: typeof s.order === 'number' ? s.order : 0,
      };
      const { error } = await supabase.from('subtasks').insert([payload]);
      if (error) throw error;
      await fetchTasks();
      toast.success('Subtarefa criada!');
    } catch (e: any) {
      toast.error('Erro ao criar subtarefa: ' + (e?.message || 'desconhecido'));
      throw e;
    }
  };

  const deleteSubtask = async (id: string) => {
    try {
      const { error } = await supabase.from('subtasks').delete().eq('id', id);
      if (error) throw error;
      await fetchTasks();
      toast.success('Subtarefa excluída!');
    } catch (e: any) {
      toast.error('Erro ao excluir subtarefa: ' + (e?.message || 'desconhecido'));
      throw e;
    }
  };

  const addDocument = async (d: any, file?: File) => {
    try {
      let filePath: string | null = null;
      let fileType: string | null = null;
      let fileSize: string | null = null;
      if (file) {
        filePath = await uploadFile(file, d.clientId, d.projectId || undefined);
        fileType = (file.name.split('.').pop() || '').toUpperCase();
        fileSize = `${(file.size / 1024).toFixed(0)} KB`;
      }
      const payload = {
        client_id: d.clientId,
        project_id: d.projectId || null,
        name: d.name,
        category: d.category || null,
        external_link: d.externalLink || null,
        file_path: filePath,
        file_type: fileType,
        file_size: fileSize,
        visible_to_client: d.visibleToClient ?? true,
        download_enabled: d.downloadEnabled ?? true,
        owner_id: profile?.id ?? null,
      };
      const { error } = await supabase.from('documents').insert([payload]);
      if (error) throw error;
      await fetchDocuments();
      toast.success('Documento adicionado!');
    } catch (e: any) {
      toast.error('Erro ao salvar documento: ' + (e?.message || 'desconhecido'));
      throw e;
    }
  };

  const updateDocument = async (id: string, u: any) => {
    const { error } = await supabase.from('documents').update(mapDocumentToDb(u)).eq('id', id);
    if (error) throw error;
    await fetchDocuments();
    toast.success('Documento atualizado!');
  };

  const deleteDocument = async (id: string) => {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) throw error;
    await fetchDocuments();
    toast.success('Documento removido!');
  };

  const addDeliverable = async (d: any, file?: File) => {
    try {
      let filePath: string | null = null;
      if (file) {
        filePath = await uploadFile(file, d.clientId, d.projectId || undefined);
      }
      const payload = {
        client_id: d.clientId,
        project_id: d.projectId,
        name: d.name,
        type: d.type || d.category || 'Entrega',
        link: d.externalLink || null,
        file_path: filePath,
        status: d.status || 'Pendente',
        forecast_date: d.forecastDate || null,
        visible_to_client: d.visibleToClient ?? true,
        download_enabled: d.downloadEnabled ?? true,
      };
      const { error } = await supabase.from('deliverables').insert([payload]);
      if (error) throw error;
      await fetchDeliverables();
      toast.success('Entregável cadastrado!');
    } catch (e: any) {
      toast.error('Erro ao salvar entregável: ' + (e?.message || 'desconhecido'));
      throw e;
    }
  };

  const updateDeliverable = async (id: string, u: any) => {
    const { error } = await supabase.from('deliverables').update(mapDeliverableToDb(u)).eq('id', id);
    if (error) throw error;
    await fetchDeliverables();
    toast.success('Entregável atualizado!');
  };

  const deleteDeliverable = async (id: string) => {
    const { error } = await supabase.from('deliverables').delete().eq('id', id);
    if (error) throw error;
    await fetchDeliverables();
    toast.success('Entregável removido!');
  };

  const addContract = async (d: any, file?: File) => {
    try {
      let filePath: string | null = null;
      if (file) {
        filePath = await uploadFile(file, d.clientId, d.projectId || undefined);
      }
      const payload = {
        client_id: d.clientId,
        project_id: d.projectId || null,
        name: d.name,
        file_path: filePath,
        external_link: d.externalLink || null,
        status: d.status || 'Vigente',
        start_date: d.startDate || null,
        end_date: d.endDate || null,
        visible_to_client: d.visibleToClient ?? true,
        download_enabled: d.downloadEnabled ?? true,
      };
      const { error } = await supabase.from('contracts').insert([payload]);
      if (error) throw error;
      await fetchContracts();
      toast.success('Contrato adicionado!');
    } catch (e: any) {
      toast.error('Erro ao salvar contrato: ' + (e?.message || 'desconhecido'));
      throw e;
    }
  };

  const updateContract = async (id: string, u: any) => {
    const { error } = await supabase.from('contracts').update(mapContractToDb(u)).eq('id', id);
    if (error) throw error;
    await fetchContracts();
    toast.success('Contrato atualizado!');
  };

  const deleteContract = async (id: string) => {
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) throw error;
    await fetchContracts();
    toast.success('Contrato removido!');
  };

  const addMinute = async (d: any, file?: File) => {
    let filePath: string | null = null;
    if (file) {
      filePath = await uploadFile(file, d.clientId, d.projectId);
    }
    const payload = {
      title: d.title,
      client_id: d.clientId,
      project_id: d.projectId || null,
      meeting_date: d.date ? new Date(d.date).toISOString() : new Date().toISOString(),
      attendees: d.attendees || [],
      agenda: d.agenda || null,
      decisions: d.decisions || null,
      client_pending: d.clientPending || null,
      team_pending: d.teamPending || null,
      next_steps: d.nextSteps || null,
      recording_link: d.recordingLink || null,
      external_link: d.externalLink || null,
      file_path: filePath,
      visible_to_client: d.visibleToClient ?? true,
      download_enabled: d.downloadEnabled ?? true,
      status: d.status || 'rascunho',
      internal_responsible_id: d.internalResponsibleId || null,
    };
    const { error } = await supabase.from('meeting_minutes').insert([payload]);
    if (error) throw error;
    await fetchMinutes();
  };

  const updateMinute = async (id: string, u: any) => {
    const { error } = await supabase.from('meeting_minutes').update(mapMinuteToDb(u)).eq('id', id);
    if (error) throw error;
    await fetchMinutes();
    toast.success('Ata atualizada!');
  };

  const deleteMinute = async (id: string) => {
    const { error } = await supabase.from('meeting_minutes').delete().eq('id', id);
    if (error) throw error;
    await fetchMinutes();
    toast.success('Ata removida!');
  };

  const addIntelligentCentral = async (d: any) => {
    const dbData = {
      name: d.name,
      type: d.type,
      category: d.category,
      link_url: d.linkUrl,
      description: d.description,
      visibility: d.visibility ?? 'all',
      status: d.status,
      released_to_client: d.releasedToClient ?? (d.audience === 'all_clients'),
      audience: d.audience ?? 'all_clients',
      audience_user_ids: d.audienceUserIds ?? [],
      created_by: profile?.id
    };
    const { error } = await supabase.from('intelligent_central').insert([dbData]);
    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
    await fetchIntelligentCentral();
    toast.success('Acesso cadastrado!');
  };

  const updateIntelligentCentral = async (id: string, u: any) => {
    const dbData: any = { ...u };
    if ('linkUrl' in u) { dbData.link_url = u.linkUrl; delete dbData.linkUrl; }
    if ('releasedToClient' in u) { dbData.released_to_client = u.releasedToClient; delete dbData.releasedToClient; }
    if ('isFavorite' in u) { dbData.is_favorite = u.isFavorite; delete dbData.isFavorite; }
    if ('audienceUserIds' in u) { dbData.audience_user_ids = u.audienceUserIds; delete dbData.audienceUserIds; }

    const { error } = await supabase.from('intelligent_central').update(dbData).eq('id', id);
    if (error) throw error;
    await fetchIntelligentCentral();
    if (!('isFavorite' in u)) toast.success('Acesso atualizado!');
  };

  const deleteIntelligentCentral = async (id: string) => {
    const { error } = await supabase.from('intelligent_central').delete().eq('id', id);
    if (error) throw error;
    await fetchIntelligentCentral();
    toast.success('Acesso removido!');
  };

  const value = useMemo(() => ({
      clients, projects, tasks, documents, deliverables, contracts, minutes, intelligentCentral,
      refreshClients: fetchClients, refreshProjects: fetchProjects, refreshTasks: fetchTasks,
      refreshDeliverables: fetchDeliverables, refreshDocuments: fetchDocuments,
      refreshContracts: fetchContracts, refreshMinutes: fetchMinutes, refreshIntelligentCentral: fetchIntelligentCentral,
      addClient, updateClient, deleteClient, addProject, updateProject, deleteProject, updateTask, addTask, deleteTask, updateSubtask, addSubtask, deleteSubtask,
      addDocument, updateDocument, deleteDocument,
      addDeliverable, updateDeliverable, deleteDeliverable,
      addContract, updateContract, deleteContract,
      addMinute, updateMinute, deleteMinute,
      addIntelligentCentral, updateIntelligentCentral, deleteIntelligentCentral,
      getDownloadUrl,
      filteredClients: clients, filteredProjects, filteredTasks,
      filteredDocuments, filteredDeliverables,
      filteredContracts, filteredMinutes, filteredIntelligentCentral,
      delays, loading
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [clients, projects, tasks, documents, deliverables, contracts, minutes, intelligentCentral,
        filteredProjects, filteredTasks, filteredDocuments, filteredDeliverables,
        filteredContracts, filteredMinutes, filteredIntelligentCentral, delays, loading]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
}
