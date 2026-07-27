import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/hooks/use-profile";
import { Database } from "@/integrations/supabase/types";

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export async function getProfile(userId?: string): Promise<ProfileRow | null> {
  const resolvedUserId = userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!resolvedUserId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', resolvedUserId)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar perfil:', error);
    return null;
  }

  return data;
}

export function getRedirectPath(role: string): string {
  switch (role) {
    case 'master': return '/operacoes';
    case 'project_manager': return '/operacoes';
    case 'consultant': return '/operacoes';
    case 'client': return '/agenda';
    default: return '/login';
  }
}
