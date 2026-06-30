import { useMemo, useState, useEffect, useCallback } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/design-system/DesignSystem';
import { supabase } from '@/integrations/supabase/client';
import * as Lucide from 'lucide-react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Clock,
  GraduationCap,
  List as ListIcon,
  X,
  Quote as QuoteIcon,
} from 'lucide-react';

export const Route = createFileRoute('/cliente/trilhas/$trackId')({ component: TrackReaderPage });

type Track = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  icon: string | null;
  accent: string | null;
};

type Slide = {
  type: 'cover' | 'concept' | 'list' | 'steps' | 'compare' | 'quote' | string;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  text?: string;
  icon?: string;
  art?: string;
  items?: Array<{ icon?: string; title?: string; text?: string } | string>;
  columns?: Array<{ title?: string; items?: string[] }>;
  stats?: Array<{ value?: string | number; label?: string }>;
  cta?: { label?: string; href?: string };
};

type Lesson = {
  id: string;
  title: string;
  subtitle: string | null;
  reading_minutes: number;
  display_order: number;
  slides: Slide[] | null;
};

function resolveIcon(name: string | null | undefined) {
  if (!name) return GraduationCap;
  const Comp = (Lucide as unknown as Record<string, typeof GraduationCap>)[name];
  return Comp ?? GraduationCap;
}

function TrackReaderPage() {
  const { trackId } = Route.useParams();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const { data: track } = useQuery({
    queryKey: ['learning_track', trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_tracks')
        .select('id,title,subtitle,description,icon,accent')
        .eq('id', trackId)
        .maybeSingle();
      if (error) throw error;
      return data as Track | null;
    },
  });

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['learning_lessons_slides', trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_lessons')
        .select('id,title,subtitle,reading_minutes,display_order,slides')
        .eq('track_id', trackId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Lesson[];
    },
  });

  useEffect(() => {
    if (!activeId && lessons.length > 0) setActiveId(lessons[0].id);
  }, [lessons, activeId]);

  useEffect(() => {
    setSlideIdx(0);
  }, [activeId]);

  const activeIndex = useMemo(
    () => lessons.findIndex(l => l.id === activeId),
    [lessons, activeId],
  );
  const active = activeIndex >= 0 ? lessons[activeIndex] : null;
  const slides: Slide[] = active?.slides ?? [];
  const totalMinutes = lessons.reduce((s, l) => s + (l.reading_minutes ?? 0), 0);
  const accent = track?.accent || '#006EFF';
  const Icon = resolveIcon(track?.icon ?? null);

  const goPrevSlide = useCallback(() => {
    setSlideIdx(i => Math.max(0, i - 1));
  }, []);
  const goNextSlide = useCallback(() => {
    setSlideIdx(i => Math.min(slides.length - 1, i + 1));
  }, [slides.length]);

  const goPrevLesson = () => {
    if (activeIndex > 0) {
      setActiveId(lessons[activeIndex - 1].id);
      setMobileListOpen(false);
    }
  };
  const goNextLesson = () => {
    if (activeIndex >= 0 && activeIndex < lessons.length - 1) {
      setActiveId(lessons[activeIndex + 1].id);
      setMobileListOpen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight') goNextSlide();
      if (e.key === 'ArrowLeft') goPrevSlide();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNextSlide, goPrevSlide]);

  const isLastSlide = slideIdx >= slides.length - 1;
  const isFirstSlide = slideIdx <= 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
          <Link to="/cliente/trilhas"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar para Trilhas</Link>
        </Button>

        {/* Header */}
        <div
          className="relative overflow-hidden rounded-2xl border border-border/60 p-5 sm:p-6"
          style={{
            background: `linear-gradient(135deg, ${accent}26 0%, ${accent}0a 60%, transparent 100%)`,
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center shadow-sm ring-1 ring-black/5"
              style={{ backgroundColor: `${accent}26`, color: accent }}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trilha</span>
              <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight mt-0.5">
                {track?.title ?? 'Carregando...'}
              </h1>
              {track?.subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{track.subtitle}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4" /> {lessons.length} {lessons.length === 1 ? 'aula' : 'aulas'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> ~{totalMinutes} min
                </span>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando aulas...</p>
        ) : lessons.length === 0 ? (
          <EmptyState icon={BookOpenCheck} title="Nenhuma aula publicada" description="Em breve novos conteúdos." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            {/* Mobile toggle */}
            <div className="lg:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileListOpen(o => !o)}
                className="w-full justify-between"
              >
                <span className="inline-flex items-center gap-2">
                  {mobileListOpen ? <X className="h-4 w-4" /> : <ListIcon className="h-4 w-4" />}
                  {mobileListOpen ? 'Fechar' : `Aulas (${lessons.length})`}
                </span>
                {active && <span className="text-xs text-muted-foreground truncate ml-2">{active.title}</span>}
              </Button>
            </div>

            {/* Lesson list */}
            <aside className={`${mobileListOpen ? 'block' : 'hidden'} lg:block`}>
              <Card className="p-2 border-border/60 sticky top-4">
                <ol className="space-y-1">
                  {lessons.map((l, i) => {
                    const isActive = l.id === activeId;
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => { setActiveId(l.id); setMobileListOpen(false); }}
                          className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors flex gap-3 items-start ${
                            isActive ? 'bg-muted/70' : 'hover:bg-muted/40'
                          }`}
                          style={isActive ? { boxShadow: `inset 3px 0 0 ${accent}` } : undefined}
                        >
                          <span
                            className="shrink-0 h-6 w-6 rounded-md text-[11px] font-semibold flex items-center justify-center"
                            style={
                              isActive
                                ? { backgroundColor: accent, color: '#fff' }
                                : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
                            }
                          >
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className={`block text-sm leading-snug ${isActive ? 'font-semibold' : 'font-medium'}`}>
                              {l.title}
                            </span>
                            <span className="block text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {l.reading_minutes} min
                              {Array.isArray(l.slides) && l.slides.length > 0 && (
                                <span className="opacity-70">· {l.slides.length} slides</span>
                              )}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </Card>
            </aside>

            {/* Reader */}
            <main className="min-w-0">
              {active && (
                <div className="space-y-4">
                  {/* Progress dots */}
                  {slides.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {slides.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSlideIdx(i)}
                          aria-label={`Slide ${i + 1}`}
                          className="h-1.5 flex-1 rounded-full transition-all"
                          style={{
                            backgroundColor: i <= slideIdx ? accent : 'hsl(var(--muted))',
                            opacity: i === slideIdx ? 1 : i < slideIdx ? 0.7 : 1,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Slide stage */}
                  <div className="relative">
                    {slides.length === 0 ? (
                      <Card className="p-10 border-border/60">
                        <EmptyState icon={BookOpenCheck} title="Sem slides" description="Esta aula ainda não tem conteúdo em slides." />
                      </Card>
                    ) : (
                      <SlideView
                        key={`${active.id}-${slideIdx}`}
                        slide={slides[slideIdx]}
                        accent={accent}
                        index={slideIdx}
                        total={slides.length}
                        lessonTitle={active.title}
                      />
                    )}

                    {/* Side click zones for desktop */}
                    {slides.length > 1 && (
                      <>
                        <button
                          type="button"
                          aria-label="Slide anterior"
                          onClick={goPrevSlide}
                          disabled={isFirstSlide}
                          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border/60 shadow-sm hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ArrowLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Próximo slide"
                          onClick={goNextSlide}
                          disabled={isLastSlide}
                          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border/60 shadow-sm hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ArrowRight className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Bottom controls */}
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goPrevSlide}
                      disabled={isFirstSlide}
                      className="md:hidden"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Slide {slideIdx + 1} de {slides.length || 1}
                    </span>
                    {isLastSlide && activeIndex < lessons.length - 1 ? (
                      <Button
                        size="sm"
                        onClick={goNextLesson}
                        style={{ backgroundColor: accent }}
                        className="text-white hover:opacity-90"
                      >
                        Próxima aula <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={goNextSlide}
                        disabled={isLastSlide}
                        style={{ backgroundColor: accent }}
                        className="text-white hover:opacity-90 md:hidden"
                      >
                        Próximo <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>

                  {/* Lesson nav (between aulas) */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goPrevLesson}
                      disabled={activeIndex <= 0}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" /> Aula anterior
                    </Button>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      Aula {activeIndex + 1} / {lessons.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goNextLesson}
                      disabled={activeIndex >= lessons.length - 1}
                    >
                      Próxima aula <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function normalizeItems(items: Slide['items']): Array<{ icon?: string; title?: string; text?: string }> {
  if (!Array.isArray(items)) return [];
  return items.map(it => (typeof it === 'string' ? { text: it } : it ?? {}));
}

function SlideShell({
  accent,
  index,
  total,
  lessonTitle,
  children,
}: {
  accent: string;
  index: number;
  total: number;
  lessonTitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className="relative overflow-hidden border-border/60 animate-in fade-in-0 slide-in-from-right-2 duration-300"
      style={{
        background: `linear-gradient(160deg, ${accent}10 0%, transparent 55%)`,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: accent, opacity: 0.85 }}
      />
      <div className="absolute top-4 right-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </div>
      <div className="p-6 sm:p-10 md:p-14 min-h-[420px] sm:min-h-[480px] flex flex-col">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80 mb-6 truncate pr-24">
          {lessonTitle}
        </div>
        {children}
      </div>
    </Card>
  );
}

function SlideView({
  slide,
  accent,
  index,
  total,
  lessonTitle,
}: {
  slide: Slide;
  accent: string;
  index: number;
  total: number;
  lessonTitle: string;
}) {
  const Icon = resolveIcon(slide.icon);

  if (slide.type === 'cover') {
    return (
      <SlideShell accent={accent} index={index} total={total} lessonTitle={lessonTitle}>
        <div className="grid md:grid-cols-2 gap-8 items-center flex-1">
          <div>
            {slide.eyebrow && (
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
                {slide.eyebrow}
              </div>
            )}
            <div
              className="mt-4 h-14 w-14 rounded-2xl flex items-center justify-center ring-1 ring-black/5"
              style={{ backgroundColor: `${accent}26`, color: accent }}
            >
              <Icon className="h-7 w-7" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05] mt-5">
              {slide.title}
            </h2>
            {slide.text && (
              <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed max-w-md">
                {slide.text}
              </p>
            )}
          </div>
          {slide.art && (
            <div
              className="aspect-[16/10] rounded-xl overflow-hidden ring-1 ring-black/5"
              style={{ backgroundColor: `${accent}0d` }}
              dangerouslySetInnerHTML={{ __html: slide.art }}
            />
          )}
        </div>
      </SlideShell>
    );
  }

  if (slide.type === 'concept') {
    return (
      <SlideShell accent={accent} index={index} total={total} lessonTitle={lessonTitle}>
        <div className="flex-1 flex flex-col justify-center max-w-3xl">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center ring-1 ring-black/5"
            style={{ backgroundColor: `${accent}26`, color: accent }}
          >
            <Icon className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mt-5">
            {slide.title}
          </h2>
          <div className="h-1 w-16 rounded-full mt-4 mb-6" style={{ backgroundColor: accent }} />
          {slide.text && (
            <p className="text-lg sm:text-xl leading-relaxed text-foreground/85">{slide.text}</p>
          )}
        </div>
      </SlideShell>
    );
  }

  if (slide.type === 'list') {
    const items = normalizeItems(slide.items);
    return (
      <SlideShell accent={accent} index={index} total={total} lessonTitle={lessonTitle}>
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center ring-1 ring-black/5"
              style={{ backgroundColor: `${accent}26`, color: accent }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
              {slide.title}
            </h2>
          </div>
          <div className="h-1 w-16 rounded-full mt-4 mb-7" style={{ backgroundColor: accent }} />
          <ul className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            {items.map((it, i) => {
              const ItIcon = it.icon ? resolveIcon(it.icon) : null;
              return (
                <li
                  key={i}
                  className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 flex gap-3"
                >
                  <span
                    className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${accent}26`, color: accent }}
                  >
                    {ItIcon ? <ItIcon className="h-5 w-5" /> : (
                      <span className="text-xs font-bold">{String(i + 1).padStart(2, '0')}</span>
                    )}
                  </span>
                  <div className="min-w-0">
                    {it.title && <div className="font-semibold text-sm leading-snug">{it.title}</div>}
                    {it.text && (
                      <div className={`text-sm text-muted-foreground ${it.title ? 'mt-1' : ''} leading-relaxed`}>
                        {it.text}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </SlideShell>
    );
  }

  if (slide.type === 'steps') {
    const items = normalizeItems(slide.items);
    return (
      <SlideShell accent={accent} index={index} total={total} lessonTitle={lessonTitle}>
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center ring-1 ring-black/5"
              style={{ backgroundColor: `${accent}26`, color: accent }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
              {slide.title}
            </h2>
          </div>
          <div className="h-1 w-16 rounded-full mt-4 mb-8" style={{ backgroundColor: accent }} />
          <ol className="relative space-y-5">
            <div
              className="absolute left-[19px] top-2 bottom-2 w-px"
              style={{ backgroundColor: `${accent}40` }}
            />
            {items.map((it, i) => (
              <li key={i} className="relative flex gap-4 items-start">
                <span
                  className="relative z-10 shrink-0 h-10 w-10 rounded-full text-sm font-bold flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: accent }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 pt-1.5">
                  {it.title && <div className="font-semibold text-base">{it.title}</div>}
                  {it.text && (
                    <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{it.text}</div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </SlideShell>
    );
  }

  if (slide.type === 'compare') {
    const cols = Array.isArray(slide.columns) ? slide.columns : [];
    return (
      <SlideShell accent={accent} index={index} total={total} lessonTitle={lessonTitle}>
        <div className="flex-1 flex flex-col">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            {slide.title}
          </h2>
          <div className="h-1 w-16 rounded-full mt-4 mb-8" style={{ backgroundColor: accent }} />
          <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
            {cols.map((c, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/60 p-5 sm:p-6 bg-card/60 backdrop-blur-sm"
                style={{
                  background: `linear-gradient(160deg, ${accent}${i === 0 ? '14' : '06'} 0%, transparent 70%)`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: accent, opacity: i === 0 ? 1 : 0.5 }}
                  />
                  <h3 className="font-semibold text-base">{c.title}</h3>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {(c.items ?? []).map((line, j) => (
                    <li key={j} className="text-sm leading-relaxed flex gap-2">
                      <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </SlideShell>
    );
  }

  if (slide.type === 'quote') {
    return (
      <SlideShell accent={accent} index={index} total={total} lessonTitle={lessonTitle}>
        <div className="flex-1 flex flex-col justify-center items-center text-center max-w-3xl mx-auto">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center ring-1 ring-black/5"
            style={{ backgroundColor: `${accent}26`, color: accent }}
          >
            <QuoteIcon className="h-7 w-7" />
          </div>
          {slide.title && (
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mt-5">
              {slide.title}
            </div>
          )}
          {slide.text && (
            <blockquote
              className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight tracking-tight mt-4"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              <span style={{ color: accent }}>“</span>
              {slide.text}
              <span style={{ color: accent }}>”</span>
            </blockquote>
          )}
        </div>
      </SlideShell>
    );
  }

  if (slide.type === 'stats') {
    const stats = Array.isArray(slide.stats) ? slide.stats : [];
    return (
      <SlideShell accent={accent} index={index} total={total} lessonTitle={lessonTitle}>
        <div className="flex-1 flex flex-col">
          {slide.title && (
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">{slide.title}</h2>
          )}
          <div className="h-1 w-16 rounded-full mt-4 mb-8" style={{ backgroundColor: accent }} />
          <div className={`grid gap-5 ${stats.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} flex-1 items-center`}>
            {stats.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/60 p-6 text-center bg-card/60 backdrop-blur-sm"
                style={{ background: `linear-gradient(160deg, ${accent}14 0%, transparent 70%)` }}
              >
                <div
                  className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight"
                  style={{ color: accent }}
                >
                  {s.value}
                </div>
                {s.label && (
                  <div className="text-sm text-muted-foreground mt-2 leading-snug">{s.label}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </SlideShell>
    );
  }

  if (slide.type === 'cta') {
    return (
      <SlideShell accent={accent} index={index} total={total} lessonTitle={lessonTitle}>
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
          {slide.eyebrow && (
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
              {slide.eyebrow}
            </div>
          )}
          <div
            className="mt-4 h-14 w-14 rounded-2xl flex items-center justify-center ring-1 ring-black/5"
            style={{ backgroundColor: `${accent}26`, color: accent }}
          >
            <Icon className="h-7 w-7" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-5">
            {slide.title}
          </h2>
          {slide.text && (
            <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">{slide.text}</p>
          )}
          {slide.cta?.label && (
            slide.cta.href ? (
              <a
                href={slide.cta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-7 px-5 py-2.5 rounded-lg text-white font-semibold text-sm shadow-sm hover:opacity-90 transition"
                style={{ backgroundColor: accent }}
              >
                {slide.cta.label} <ArrowRight className="h-4 w-4" />
              </a>
            ) : (
              <div
                className="inline-flex items-center gap-2 mt-7 px-5 py-2.5 rounded-lg text-white font-semibold text-sm shadow-sm"
                style={{ backgroundColor: accent }}
              >
                {slide.cta.label}
              </div>
            )
          )}
        </div>
      </SlideShell>
    );
  }

  // Fallback
  return (
    <SlideShell accent={accent} index={index} total={total} lessonTitle={lessonTitle}>
      <div className="flex-1 flex flex-col justify-center">
        {slide.title && (
          <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">{slide.title}</h2>
        )}
        {slide.text && <p className="text-base mt-4 leading-relaxed">{slide.text}</p>}
      </div>
    </SlideShell>
  );
}
