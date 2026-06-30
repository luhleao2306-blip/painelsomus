import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/design-system/DesignSystem';
import { supabase } from '@/integrations/supabase/client';
import * as Lucide from 'lucide-react';
import { BookOpenCheck, ArrowRight, Clock, GraduationCap } from 'lucide-react';

export const Route = createFileRoute('/cliente/trilhas/')({ component: TrilhasPage });

type Track = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  icon: string | null;
  accent: string | null;
  display_order: number;
};

type LessonAgg = { track_id: string; count: number; minutes: number };

function resolveIcon(name: string | null) {
  if (!name) return GraduationCap;
  const Comp = (Lucide as unknown as Record<string, typeof GraduationCap>)[name];
  return Comp ?? GraduationCap;
}

function TrilhasPage() {
  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['learning_tracks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_tracks')
        .select('id,title,subtitle,description,icon,accent,display_order')
        .eq('is_published', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Track[];
    },
  });

  const { data: aggs = [] } = useQuery({
    queryKey: ['learning_lessons_aggs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_lessons')
        .select('track_id,reading_minutes');
      if (error) throw error;
      const map = new Map<string, LessonAgg>();
      for (const row of (data ?? []) as { track_id: string; reading_minutes: number }[]) {
        const cur = map.get(row.track_id) ?? { track_id: row.track_id, count: 0, minutes: 0 };
        cur.count += 1;
        cur.minutes += row.reading_minutes ?? 0;
        map.set(row.track_id, cur);
      }
      return Array.from(map.values());
    },
  });

  const aggFor = (id: string) => aggs.find(a => a.track_id === id) ?? { count: 0, minutes: 0 };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-1 pb-2 border-b border-border/40">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Aprendizagem</span>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Trilha de Aprendizagem</h1>
          <p className="text-sm text-muted-foreground">Conteúdos curados para evoluir na operação, marketing, vendas e gestão.</p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : tracks.length === 0 ? (
          <EmptyState icon={BookOpenCheck} title="Nenhuma trilha publicada" description="Em breve novos conteúdos." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map(t => {
              const Icon = resolveIcon(t.icon);
              const accent = t.accent || '#006EFF';
              const agg = aggFor(t.id);
              return (
                <Link key={t.id} to="/cliente/trilhas/$trackId" params={{ trackId: t.id }} className="group">
                  <Card className="overflow-hidden border-border/60 hover:border-foreground/30 hover:shadow-lg transition-all h-full flex flex-col">
                    <div
                      className="relative h-32 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${accent}33 0%, ${accent}0d 60%, transparent 100%)`,
                      }}
                    >
                      <div
                        className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm ring-1 ring-black/5"
                        style={{ backgroundColor: `${accent}1f`, color: accent }}
                      >
                        <Icon className="h-7 w-7" />
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col gap-2">
                      <h3 className="font-display text-lg font-semibold leading-tight">{t.title}</h3>
                      {t.subtitle && <p className="text-sm text-muted-foreground line-clamp-2">{t.subtitle}</p>}
                      <div className="mt-auto pt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/40">
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap className="h-3.5 w-3.5" /> {agg.count} {agg.count === 1 ? 'aula' : 'aulas'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> ~{agg.minutes} min
                        </span>
                        <span
                          className="inline-flex items-center gap-1 font-semibold"
                          style={{ color: accent }}
                        >
                          Acessar <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
