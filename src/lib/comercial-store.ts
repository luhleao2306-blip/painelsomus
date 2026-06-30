import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Stage =
  | 'Lead'
  | 'Dados incompletos'
  | 'Em contato'
  | 'Follow up'
  | 'Reunião agendada'
  | 'Em negociação'
  | 'Ganho'
  | 'Perdido';
export type Tier = 'A' | 'B' | 'C';
export type Status = 'Ativo' | 'Pausado' | 'Arquivado';

export const stages: Stage[] = [
  'Lead', 'Dados incompletos', 'Em contato', 'Follow up', 'Reunião agendada', 'Em negociação', 'Ganho', 'Perdido',
];
export const tiers: Tier[] = ['A', 'B', 'C'];
export const owners = ['Mariana Souza', 'Rafael Lima', 'Camila Duarte', 'Bruno Carvalho'];
export const sourceOptions = [
  'Indicação', 'Instagram', 'LinkedIn', 'Site', 'Evento', 'Prospecção ativa', 'Outro',
];

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  office: string;
  stage: Stage;
  tier: Tier;
  owner: string;
  createdAt: string;
  nextFollowUp: string | null;
  status: Status;
  city?: string;
  state?: string;
  instagram?: string;
  website?: string;
  source?: string;
  notes?: string;
};

type DbStage = 'lead' | 'in_contact' | 'follow_up' | 'meeting_scheduled' | 'negotiating' | 'won' | 'lost' | 'incomplete_data';

const stageToDb: Record<Stage, DbStage> = {
  'Lead': 'lead',
  'Em contato': 'in_contact',
  'Follow up': 'follow_up',
  'Reunião agendada': 'meeting_scheduled',
  'Em negociação': 'negotiating',
  'Ganho': 'won',
  'Perdido': 'lost',
  'Dados incompletos': 'incomplete_data',
};
const stageFromDb: Record<DbStage, Stage> = {
  lead: 'Lead',
  in_contact: 'Em contato',
  follow_up: 'Follow up',
  meeting_scheduled: 'Reunião agendada',
  negotiating: 'Em negociação',
  won: 'Ganho',
  lost: 'Perdido',
  incomplete_data: 'Dados incompletos',
};

type DbRow = {
  id: string;
  lead_name: string;
  email: string | null;
  phone: string | null;
  architecture_office_name: string | null;
  city: string | null;
  state: string | null;
  instagram: string | null;
  website: string | null;
  source: string | null;
  responsible_id: string | null;
  funnel_stage: DbStage;
  lead_level: Tier;
  next_follow_up_date: string | null;
  notes: string | null;
  created_at: string;
  won_at: string | null;
  lost_at: string | null;
};

function rowToLead(r: DbRow): Lead {
  const stage = stageFromDb[r.funnel_stage];
  const status: Status = stage === 'Ganho' || stage === 'Perdido' ? 'Arquivado' : 'Ativo';
  return {
    id: r.id,
    name: r.lead_name,
    email: r.email ?? '',
    phone: r.phone ?? '',
    office: r.architecture_office_name ?? '',
    stage,
    tier: r.lead_level,
    owner: r.responsible_id ?? '—',
    createdAt: (r.created_at ?? '').slice(0, 10),
    nextFollowUp: r.next_follow_up_date ? r.next_follow_up_date.slice(0, 10) : null,
    status,
    city: r.city ?? undefined,
    state: r.state ?? undefined,
    instagram: r.instagram ?? undefined,
    website: r.website ?? undefined,
    source: r.source ?? undefined,
    notes: r.notes ?? undefined,
  };
}

function leadToDb(lead: Partial<Lead>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (lead.name !== undefined) out.lead_name = lead.name;
  if (lead.email !== undefined) out.email = lead.email || null;
  if (lead.phone !== undefined) out.phone = lead.phone || null;
  if (lead.office !== undefined) out.architecture_office_name = lead.office || null;
  if (lead.city !== undefined) out.city = lead.city || null;
  if (lead.state !== undefined) out.state = lead.state || null;
  if (lead.instagram !== undefined) out.instagram = lead.instagram || null;
  if (lead.website !== undefined) out.website = lead.website || null;
  if (lead.source !== undefined) out.source = lead.source || null;
  if (lead.notes !== undefined) out.notes = lead.notes || null;
  if (lead.stage !== undefined) {
    out.funnel_stage = stageToDb[lead.stage];
    if (lead.stage === 'Ganho') out.won_at = new Date().toISOString();
    if (lead.stage === 'Perdido') out.lost_at = new Date().toISOString();
  }
  if (lead.tier !== undefined) out.lead_level = lead.tier;
  if (lead.nextFollowUp !== undefined) {
    out.next_follow_up_date = lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString() : null;
  }
  return out;
}

let leadsState: Lead[] = [];
let loaded = false;
let loading = false;
const listeners = new Set<() => void>();

function emit() { listeners.forEach((l) => l()); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot() { return leadsState; }

export function useLeads(): Lead[] {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => { void loadLeads(); }, []);
  return snap;
}

export async function loadLeads(force = false) {
  if (loading) return;
  if (loaded && !force) return;
  loading = true;
  try {
    const { data, error } = await supabase
      .from('commercial_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    leadsState = ((data ?? []) as unknown as DbRow[]).map(rowToLead);
    loaded = true;
    emit();
  } catch (err) {
    console.error('[comercial-store] loadLeads failed', err);
  } finally {
    loading = false;
  }
}

export async function addLead(lead: Lead): Promise<Lead | null> {
  const payload = leadToDb(lead);
  const { data, error } = await supabase
    .from('commercial_leads')
    .insert(payload as never)
    .select('*')
    .single();
  if (error) {
    console.error('[comercial-store] addLead failed', error);
    return null;
  }
  const created = rowToLead(data as unknown as DbRow);
  leadsState = [created, ...leadsState];
  emit();
  return created;
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<void> {
  // optimistic
  const prev = leadsState;
  leadsState = leadsState.map((l) => (l.id === id ? { ...l, ...patch } : l));
  emit();
  const { error } = await supabase
    .from('commercial_leads')
    .update(leadToDb(patch) as never)
    .eq('id', id);
  if (error) {
    console.error('[comercial-store] updateLead failed', error);
    leadsState = prev;
    emit();
  }
}

export async function removeLead(id: string): Promise<void> {
  const prev = leadsState;
  leadsState = leadsState.filter((l) => l.id !== id);
  emit();
  const { error } = await supabase.from('commercial_leads').delete().eq('id', id);
  if (error) {
    console.error('[comercial-store] removeLead failed', error);
    leadsState = prev;
    emit();
  }
}
