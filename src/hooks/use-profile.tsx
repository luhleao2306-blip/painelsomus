import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getProfile } from '@/lib/auth-utils';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export type UserRole = 'master' | 'project_manager' | 'consultant' | 'client';

interface ProfileContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  profile: ProfileRow | null;
  loading: boolean;
  authReady: boolean;
  refreshProfile: () => Promise<ProfileRow | null>;
  refreshProfileForUser: (userId: string) => Promise<ProfileRow | null>;
  updateProfile: (updates: Partial<ProfileRow>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('client');
  const [profile, setLocalProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const checkSession = async (userId?: string) => {
    setLoading(true);
    try {
      const p = await getProfile(userId);
      if (p) {
        setLocalProfile(p);
        setRole(p.role as UserRole);
        return p;
      } else {
        setLocalProfile(null);
        setRole('client');
        return null;
      }
    } catch (err) {
      console.error('Error in checkSession:', err);
      setLocalProfile(null);
      setRole('client');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user?.id) {
        await checkSession(session.user.id);
      } else if (isMounted) {
        setLocalProfile(null);
        setRole('client');
        setLoading(false);
      }

      if (isMounted) {
        setAuthReady(true);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        if (isMounted) {
          setLoading(true);
          setAuthReady(true);
        }

        void checkSession(session.user.id);
      } else {
        if (!isMounted) return;
        setLocalProfile(null);
        setRole('client');
        setLoading(false);
        setAuthReady(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const updateProfile = async (updates: Partial<ProfileRow>) => {
    if (!profile?.id) return;
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);
      
    if (error) {
      toast.error('Erro ao atualizar perfil');
      throw error;
    }
    
    await checkSession();
    toast.success('Perfil atualizado com sucesso!');
  };

  return (
    <ProfileContext.Provider value={{ role, setRole, profile, loading, authReady, refreshProfile: checkSession, refreshProfileForUser: (userId: string) => checkSession(userId), updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
