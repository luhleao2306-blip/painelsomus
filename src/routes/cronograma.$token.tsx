import { createFileRoute, notFound } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import { format, parseISO, isToday, isSameMonth, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, MapPin, Sparkles, Printer, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import logoAsset from '@/assets/somus-logo.png';

export const Route = createFileRoute('/cronograma/$token')({
  component: PublicCronograma,
});

type Schedule = {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  project_id: string | null;
  public_token: string;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
};

type Item = {
  id: string;
  scheduled_date: string;
  title: string;
  theme: string | null;
  description: string | null;
  duration_minutes: number | null;
  location: string | null;
  order_index: number;
};

function PublicCronograma() {
  const { token } = Route.useParams();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [clientName, setClientName] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: s, error: e1 } = await supabase
        .from('work_schedules' as any)
        .select('*')
        .eq('public_token', token)
        .eq('is_active', true)
        .eq('is_public', true)
        .maybeSingle();
      if (cancelled) return;
      if (e1 || !s) {
        setError('Cronograma não encontrado ou indisponível.');
        setLoading(false);
        return;
      }
      const sched = s as unknown as Schedule;
      setSchedule(sched);

      const { data: its } = await supabase
        .from('work_schedule_items' as any)
        .select('*')
        .eq('schedule_id', sched.id)
        .order('scheduled_date', { ascending: true });
      if (!cancelled) setItems((its as unknown as Item[]) ?? []);

      if (sched.client_id) {
        const { data: c } = await supabase.from('clients').select('name').eq('id', sched.client_id).maybeSingle();
        if (!cancelled && c) setClientName((c as { name: string }).name);
      }
      if (sched.project_id) {
        const { data: p } = await supabase.from('projects').select('name').eq('id', sched.project_id).maybeSingle();
        if (!cancelled && p) setProjectName((p as { name: string }).name);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const k = format(startOfMonth(parseISO(it.scheduled_date)), 'yyyy-MM');
      const arr = map.get(k) ?? [];
      arr.push(it);
      map.set(k, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-muted/30 text-muted-foreground">Carregando cronograma…</div>;
  }
  if (error || !schedule) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-muted/30 p-6 text-center">
        <h1 className="text-2xl font-bold">Cronograma indisponível</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background print:bg-white">
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-break-avoid { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="mx-auto max-w-4xl px-4 py-10 md:py-16">
        {/* Top bar */}
        <div className="no-print mb-6 flex items-center justify-between">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </a>
          <Button onClick={() => window.print()} size="sm" className="gap-2">
            <Printer className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-card via-card to-muted/40 p-8 shadow-sm print:shadow-none print:border-none">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl no-print" />
          <div className="relative space-y-5">
            <div className="flex items-center gap-3">
              <img src={logoAsset} alt="Somus" className="h-9 w-auto" />
              <div className="h-6 w-px bg-border" />
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Cronograma de trabalho
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{schedule.title}</h1>
              {schedule.description && (
                <p className="mt-3 max-w-2xl text-base text-muted-foreground">{schedule.description}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {clientName && (
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">Cliente · {clientName}</Badge>
              )}
              {projectName && (
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">Projeto · {projectName}</Badge>
              )}
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                {items.length} {items.length === 1 ? 'encontro previsto' : 'encontros previstos'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-10 space-y-10">
          {items.length === 0 && (
            <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
              Nenhum encontro programado ainda.
            </div>
          )}

          {grouped.map(([monthKey, monthItems]) => {
            const first = parseISO(monthItems[0].scheduled_date);
            return (
              <section key={monthKey} className="print-break-avoid">
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    {format(first, "LLLL 'de' yyyy", { locale: ptBR })}
                  </h2>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <ol className="relative space-y-4 border-l-2 border-dashed border-border pl-6 md:pl-8">
                  {monthItems.map((it, idx) => {
                    const d = parseISO(it.scheduled_date);
                    const today = isToday(d);
                    return (
                      <li key={it.id} className="relative print-break-avoid">
                        <span
                          className={`absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                            today ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'
                          }`}
                        >
                          {today ? <CheckCircle2 className="h-3.5 w-3.5" /> : (
                            <span className="text-[10px] font-bold text-muted-foreground">{idx + 1}</span>
                          )}
                        </span>

                        <article className={`rounded-2xl border bg-card p-5 transition hover:shadow-md print:shadow-none ${today ? 'ring-2 ring-primary/40' : ''}`}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              {it.theme && (
                                <Badge variant="secondary" className="mb-2 rounded-full text-[10px] uppercase tracking-wider">
                                  {it.theme}
                                </Badge>
                              )}
                              <h3 className="text-lg font-semibold leading-tight">{it.title}</h3>
                              {it.description && (
                                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{it.description}</p>
                              )}
                            </div>
                            <div className="shrink-0 rounded-xl border bg-muted/40 px-4 py-2 text-center">
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {format(d, 'EEE', { locale: ptBR })}
                              </div>
                              <div className="text-2xl font-bold leading-none">{format(d, 'dd')}</div>
                              <div className="mt-1 text-[10px] text-muted-foreground">
                                {format(d, 'MMM', { locale: ptBR })}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" /> {format(d, "d 'de' LLLL", { locale: ptBR })}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" /> {format(d, 'HH:mm')}
                              {it.duration_minutes ? ` · ${it.duration_minutes} min` : ''}
                            </span>
                            {it.location && (
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" /> {it.location}
                              </span>
                            )}
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>

        <footer className="mt-16 border-t pt-6 text-center text-xs text-muted-foreground">
          Cronograma gerado por <strong className="text-foreground">Somus Hub</strong>
        </footer>
      </div>
    </div>
  );
}
