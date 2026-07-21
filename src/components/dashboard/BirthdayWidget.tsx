import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Cake, PartyPopper } from 'lucide-react';
import birthdayHat from '@/assets/birthday-hat.png';
import { WolfAvatar } from '@/components/WolfAvatar';

type Birthday = {
  id: string;
  full_name: string;
  display_name: string | null;
  birth_date: string;
  job_title: string | null;
  avatar_url: string | null;
  profile_id: string | null;
  profile_avatar: string | null;
  avatar_key: string | null;
};

type Enriched = Birthday & {
  monthDay: string;
  daysUntil: number;
  age: number;
  isToday: boolean;
};

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function BirthdayWidget() {
  const [rows, setRows] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (supabase as any)
      .rpc('list_collaborators_public')
      .then(({ data }: { data: any[] | null }) => {
        const mapped = (data ?? [])
          .filter((r) => r.status === 'ativo' && r.birth_date)
          .map((r: any) => ({
            id: r.id,
            full_name: r.full_name,
            display_name: r.display_name,
            birth_date: r.birth_date,
            job_title: r.job_title,
            avatar_url: r.avatar_url,
            profile_id: r.profile_id,
            profile_avatar: r.profile_avatar_url ?? null,
            avatar_key: r.profile_avatar_key ?? null,
          })) as Birthday[];
        setRows(mapped);
        setLoading(false);
      });
  }, []);


  const upcoming = useMemo<Enriched[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();

    return rows
      .map((r) => {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(r.birth_date);
        if (!m) return null;
        const birthYear = Number(m[1]);
        const month = Number(m[2]) - 1;
        const day = Number(m[3]);
        let next = new Date(year, month, day);
        next.setHours(0, 0, 0, 0);
        if (next < today) next = new Date(year + 1, month, day);
        const daysUntil = Math.round((next.getTime() - today.getTime()) / 86400000);
        const age = next.getFullYear() - birthYear;
        return {
          ...r,
          monthDay: `${String(day).padStart(2, '0')} ${MONTHS[month]}`,
          daysUntil,
          age,
          isToday: daysUntil === 0,
        } as Enriched;
      })
      .filter((x): x is Enriched => !!x && x.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 6);
  }, [rows]);

  if (loading) return null;
  if (upcoming.length === 0) return null;

  const hasToday = upcoming.some((u) => u.isToday);

  return (
    <Card className={hasToday ? 'border-pink-300 bg-gradient-to-br from-pink-50 to-amber-50 dark:from-pink-950/30 dark:to-amber-950/20' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {hasToday ? <PartyPopper className="h-5 w-5 text-pink-600" /> : <Cake className="h-5 w-5 text-pink-600" />}
          Aniversariantes
          {hasToday && <span className="text-xs font-semibold text-pink-600">🎉 Hoje!</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcoming.map((u) => {
          const name = u.display_name || u.full_name;
          const label = u.isToday
            ? 'Hoje! 🎂'
            : u.daysUntil === 1
            ? 'Amanhã'
            : `em ${u.daysUntil} dias`;
          return (
            <div
              key={u.id}
              className={`flex items-center gap-3 rounded-lg border p-2.5 transition ${
                u.isToday
                  ? 'border-pink-300 bg-white/70 dark:bg-background/40'
                  : 'border-border/60 bg-muted/30'
              }`}
            >
              <div className="relative h-12 w-12 shrink-0">
                <WolfAvatar
                  avatarKey={u.avatar_key}
                  seed={u.profile_id ?? u.id ?? name}
                  name={name}
                  size="md"
                  className="border-2 border-pink-200"
                />
                <img
                  src={birthdayHat}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="pointer-events-none absolute -top-3 -left-2 h-7 w-7 -rotate-[25deg] drop-shadow"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                {u.job_title && <p className="truncate text-xs text-muted-foreground">{u.job_title}</p>}
              </div>
              <div className="text-right">
                <p className={`text-xs font-bold ${u.isToday ? 'text-pink-600' : 'text-foreground'}`}>{label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {u.monthDay} • {u.age} anos
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
