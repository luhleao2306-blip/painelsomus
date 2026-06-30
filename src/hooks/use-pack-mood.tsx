import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/use-profile';
import { toast } from 'sonner';

export type Mood = 'feliz' | 'neutro' | 'triste';

interface MoodRow {
  user_id: string;
  mood: Mood;
  mood_date: string;
}

interface PackMember {
  id: string;
  full_name: string | null;
}

interface PackMoodContextType {
  myMoodToday: Mood | null;
  todayMoods: MoodRow[];
  packMembers: PackMember[];
  energy: number; // 0-100
  loading: boolean;
  needsCheckIn: boolean;
  setMood: (mood: Mood) => Promise<void>;
  dismissCheckIn: () => void;
  refresh: () => Promise<void>;
}

const PackMoodContext = createContext<PackMoodContextType | undefined>(undefined);

const MOOD_SCORE: Record<Mood, number> = { feliz: 100, neutro: 60, triste: 25 };

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function PackMoodProvider({ children }: { children: ReactNode }) {
  const { profile, authReady } = useProfile();
  const [todayMoods, setTodayMoods] = useState<MoodRow[]>([]);
  const [packMembers, setPackMembers] = useState<PackMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const refresh = useCallback(async () => {
    if (!profile?.id) {
      setTodayMoods([]);
      setPackMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const today = todayISO();
      const [moodsRes, membersRes] = await Promise.all([
        supabase.from('pack_moods').select('user_id, mood, mood_date').eq('mood_date', today),
        supabase.from('profiles').select('id, full_name').in('role', ['master', 'project_manager', 'consultant']).eq('status', 'active'),
      ]);
      if (moodsRes.data) setTodayMoods(moodsRes.data as MoodRow[]);
      if (membersRes.data) setPackMembers(membersRes.data as PackMember[]);
    } catch (err) {
      console.error('pack mood fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (authReady) {
      void refresh();
      setDismissed(false);
    }
  }, [authReady, refresh, profile?.id]);

  const myMoodToday = useMemo(() => {
    if (!profile?.id) return null;
    const row = todayMoods.find(m => m.user_id === profile.id);
    return row?.mood ?? null;
  }, [todayMoods, profile?.id]);

  const energy = useMemo(() => {
    if (packMembers.length === 0) return 0;
    const total = packMembers.length;
    let score = 0;
    for (const member of packMembers) {
      const m = todayMoods.find(x => x.user_id === member.id);
      if (m) score += MOOD_SCORE[m.mood];
    }
    return Math.round(score / total);
  }, [packMembers, todayMoods]);

  const setMood = useCallback(async (mood: Mood) => {
    if (!profile?.id) return;
    const today = todayISO();
    const { error } = await supabase
      .from('pack_moods')
      .upsert(
        { user_id: profile.id, mood, mood_date: today },
        { onConflict: 'user_id,mood_date' }
      );
    if (error) {
      toast.error('Não foi possível registrar seu humor');
      throw error;
    }
    toast.success('Aullll! Humor do Lobo registrado 🐺');
    await refresh();
    setDismissed(true);
  }, [profile?.id, refresh]);

  // Check if member of pack & hasn't checked in yet today
  const isPackMember = useMemo(
    () => profile && ['master', 'project_manager', 'consultant'].includes(profile.role),
    [profile]
  );
  const needsCheckIn = !!isPackMember && !loading && myMoodToday === null && !dismissed;

  return (
    <PackMoodContext.Provider
      value={{
        myMoodToday,
        todayMoods,
        packMembers,
        energy,
        loading,
        needsCheckIn,
        setMood,
        dismissCheckIn: () => setDismissed(true),
        refresh,
      }}
    >
      {children}
    </PackMoodContext.Provider>
  );
}

export function usePackMood() {
  const ctx = useContext(PackMoodContext);
  if (!ctx) throw new Error('usePackMood must be used within PackMoodProvider');
  return ctx;
}
