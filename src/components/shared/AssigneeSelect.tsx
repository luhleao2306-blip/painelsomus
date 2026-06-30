import { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

type Profile = { id: string; full_name: string | null; role: string | null; avatar_url?: string | null };

const normalizeName = (value: string | null | undefined) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const resolveKnownAssignee = (value: string, users: Profile[]) => {
  const current = value.trim();
  if (!current) return '';

  const exact = users.find(u => normalizeName(u.full_name) === normalizeName(current))?.full_name?.trim();
  if (exact) return exact;

  const key = normalizeName(current);
  const matches = users.filter(u => normalizeName(u.full_name).split(' ')[0] === key);
  return matches.length === 1 ? matches[0].full_name?.trim() || current : current;
};

let cache: Profile[] | null = null;
let inflight: Promise<Profile[]> | null = null;

async function fetchAssignableUsers(): Promise<Profile[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    // Only users with an actual login (profiles = auth.users). Collaborators
    // without login are intentionally excluded to prevent "ghost" assignees.
    const profilesRes = await supabase
      .from('profiles')
      .select('id, full_name, role, avatar_url')
      .eq('status', 'active')
      .order('full_name', { ascending: true });

    const profiles = (profilesRes.data ?? []).filter(
      (p: any) => p.full_name && p.full_name.trim().length > 0,
    ) as Profile[];

    const seen = new Set<string>();
    const merged: Profile[] = [];
    for (const p of profiles) {
      const key = (p.full_name ?? '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(p);
    }
    merged.sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''));

    cache = merged;
    inflight = null;
    return cache;
  })();
  return inflight;
}


export function useAssignableUsers() {
  const [users, setUsers] = useState<Profile[]>(cache ?? []);
  useEffect(() => {
    let alive = true;
    fetchAssignableUsers().then(u => { if (alive) setUsers(u); });
    return () => { alive = false; };
  }, []);
  return users;
}

interface AssigneeSelectProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Select de responsável limitado a usuários cadastrados (profiles ativos).
 * O valor armazenado é o `full_name` do perfil (compatível com `tasks.assignee` text).
 */
export function AssigneeSelect({
  value,
  onChange,
  placeholder = 'Selecione um responsável',
  className,
  allowClear = true,
  size = 'md',
}: AssigneeSelectProps) {
  const users = useAssignableUsers();
  const current = value ?? '';
  const resolvedCurrent = useMemo(() => resolveKnownAssignee(current, users), [current, users]);
  const isKnown = !!resolvedCurrent && users.some(u => u.full_name === resolvedCurrent);
  const h = size === 'sm' ? 'h-8' : 'h-9';

  return (
    <Select
      value={isKnown ? resolvedCurrent : '__none__'}
      onValueChange={v => onChange(v === '__none__' ? '' : v)}
    >
      <SelectTrigger className={`${h} ${className ?? ''}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowClear && <SelectItem value="__none__">— Sem responsável —</SelectItem>}
        {users.map(u => (
          <SelectItem key={u.id} value={u.full_name as string}>
            {u.full_name}
          </SelectItem>
        ))}
        {users.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Nenhum usuário cadastrado
          </div>
        )}
      </SelectContent>
    </Select>
  );

}
