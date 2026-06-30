import { createFileRoute, Link } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Users, Building2,
  Briefcase, Video, FileText, ExternalLink, CalendarDays, CalendarRange, CircleDot,
  CalendarClock,
} from 'lucide-react';
import { useData, MeetingMinute } from '@/contexts/DataContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, format, parseISO,
  addDays, isAfter, startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CronogramaPanel } from '@/components/agenda/CronogramaPanel';

export const Route = createFileRoute('/agenda')({
  component: AgendaPage,
});

type ViewMode = 'month' | 'week' | 'agenda';

function AgendaPage() {
  const { minutes, clients, projects } = useData();
  const [cursor, setCursor] = useState<Date>(new Date());
  const [view, setView] = useState<ViewMode>('month');
  const [selected, setSelected] = useState<MeetingMinute | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, MeetingMinute[]>();
    for (const m of minutes) {
      if (!m.date) continue;
      const key = format(parseISO(m.date), 'yyyy-MM-dd');
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
    }
    return map;
  }, [minutes]);

  const clientName = (id?: string) => clients.find(c => c.id === id)?.name ?? '—';
  const projectName = (id?: string) => projects.find(p => p.id === id)?.name ?? '—';

  const colorFor = (m: MeetingMinute) => {
    const seed = (m.clientId ?? m.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const palette = [
      'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300',
      'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300',
      'bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-300',
      'bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300',
      'bg-teal-500/15 text-teal-700 border-teal-500/30 dark:text-teal-300',
      'bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300',
      'bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/30 dark:text-fuchsia-300',
    ];
    return palette[seed % palette.length];
  };

  const dotFor = (m: MeetingMinute) => {
    const seed = (m.clientId ?? m.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const palette = ['bg-emerald-500','bg-amber-500','bg-rose-500','bg-violet-500','bg-teal-500','bg-orange-500','bg-fuchsia-500'];
    return palette[seed % palette.length];
  };

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [cursor]);

  const upcoming = useMemo(() => {
    const today = startOfDay(new Date());
    return [...minutes]
      .filter(m => m.date && isAfter(parseISO(m.date), addDays(today, -1)))
      .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
      .slice(0, 8);
  }, [minutes]);

  const goPrev = () => setCursor(view === 'month' ? subMonths(cursor, 1) : addDays(cursor, -7));
  const goNext = () => setCursor(view === 'month' ? addMonths(cursor, 1) : addDays(cursor, 7));
  const goToday = () => setCursor(new Date());

  const headerLabel =
    view === 'month'
      ? format(cursor, "LLLL 'de' yyyy", { locale: ptBR })
      : view === 'week'
      ? `${format(weekDays[0], "d 'de' LLL", { locale: ptBR })} – ${format(weekDays[6], "d 'de' LLL yyyy", { locale: ptBR })}`
      : 'Próximas reuniões';

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-muted/40 p-6">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/5 blur-3xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-xl border bg-background p-3 shadow-sm">
                <CalendarIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
                <p className="text-sm text-muted-foreground">
                  Visualize as reuniões agendadas em um calendário unificado.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border bg-background p-1">
                <Button
                  size="sm"
                  variant={view === 'month' ? 'default' : 'ghost'}
                  onClick={() => setView('month')}
                  className="gap-1.5"
                >
                  <CalendarDays className="h-4 w-4" /> Mês
                </Button>
                <Button
                  size="sm"
                  variant={view === 'week' ? 'default' : 'ghost'}
                  onClick={() => setView('week')}
                  className="gap-1.5"
                >
                  <CalendarRange className="h-4 w-4" /> Semana
                </Button>
                <Button
                  size="sm"
                  variant={view === 'agenda' ? 'default' : 'ghost'}
                  onClick={() => setView('agenda')}
                  className="gap-1.5"
                >
                  <CircleDot className="h-4 w-4" /> Lista
                </Button>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/meetings">Gerenciar atas</Link>
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="calendario" className="space-y-6">
          <TabsList>
            <TabsTrigger value="calendario" className="gap-1.5">
              <CalendarDays className="h-4 w-4" /> Calendário
            </TabsTrigger>
            <TabsTrigger value="cronograma" className="gap-1.5">
              <CalendarClock className="h-4 w-4" /> Cronograma
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendario" className="space-y-6">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>Hoje</Button>
            <Button variant="outline" size="icon" onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="ml-2 text-xl font-semibold capitalize">{headerLabel}</h2>
          </div>
          <div className="text-sm text-muted-foreground">
            {minutes.length} reuniões registradas
          </div>
        </div>

        {/* Views */}
        {view === 'month' && (
          <Card className="overflow-hidden">
            <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="px-3 py-2 text-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthDays.map((day, idx) => {
                const key = format(day, 'yyyy-MM-dd');
                const events = eventsByDay.get(key) ?? [];
                const outside = !isSameMonth(day, cursor);
                const today = isToday(day);
                return (
                  <div
                    key={key + idx}
                    className={cn(
                      'min-h-[110px] border-b border-r p-1.5 transition-colors',
                      outside ? 'bg-muted/20 text-muted-foreground/60' : 'bg-card',
                      'hover:bg-muted/30',
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                          today && 'bg-primary text-primary-foreground shadow-sm',
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {events.length > 0 && (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {events.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {events.slice(0, 3).map(m => (
                        <button
                          key={m.id}
                          onClick={() => setSelected(m)}
                          className={cn(
                            'w-full truncate rounded-md border px-1.5 py-0.5 text-left text-[11px] font-medium transition hover:shadow-sm',
                            colorFor(m),
                          )}
                          title={m.title}
                        >
                          <span className="mr-1 opacity-70">
                            {format(parseISO(m.date), 'HH:mm')}
                          </span>
                          {m.title}
                        </button>
                      ))}
                      {events.length > 3 && (
                        <button
                          onClick={() => setSelected(events[3])}
                          className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
                        >
                          +{events.length - 3} mais
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {view === 'week' && (
          <Card className="overflow-hidden">
            <div className="grid grid-cols-7 border-b">
              {weekDays.map(day => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'border-r px-3 py-2 text-center last:border-r-0',
                    isToday(day) && 'bg-primary/5',
                  )}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {format(day, 'EEE', { locale: ptBR })}
                  </div>
                  <div
                    className={cn(
                      'mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                      isToday(day) && 'bg-primary text-primary-foreground',
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-h-[420px]">
              {weekDays.map(day => {
                const events = eventsByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
                return (
                  <div key={day.toISOString()} className="space-y-1.5 border-r p-2 last:border-r-0">
                    {events.length === 0 && (
                      <div className="pt-6 text-center text-[11px] text-muted-foreground/60">
                        Sem reuniões
                      </div>
                    )}
                    {events.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setSelected(m)}
                        className={cn(
                          'block w-full rounded-lg border p-2 text-left text-xs transition hover:shadow-md',
                          colorFor(m),
                        )}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold opacity-80">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(m.date), 'HH:mm')}
                        </div>
                        <div className="mt-0.5 font-semibold leading-tight">{m.title}</div>
                        <div className="mt-1 truncate text-[10px] opacity-80">
                          {clientName(m.clientId)}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {view === 'agenda' && (
          <div className="space-y-3">
            {upcoming.length === 0 && (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma reunião próxima.
                </CardContent>
              </Card>
            )}
            {upcoming.map(m => (
              <Card
                key={m.id}
                role="button"
                onClick={() => setSelected(m)}
                className="cursor-pointer transition hover:shadow-md"
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex flex-col items-center rounded-xl border bg-muted/40 px-4 py-2 text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {format(parseISO(m.date), 'MMM', { locale: ptBR })}
                    </span>
                    <span className="text-2xl font-bold leading-none">
                      {format(parseISO(m.date), 'dd')}
                    </span>
                    <span className="mt-1 text-[10px] text-muted-foreground">
                      {format(parseISO(m.date), 'HH:mm')}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', dotFor(m))} />
                      <h3 className="truncate font-semibold">{m.title}</h3>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {clientName(m.clientId)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="h-3 w-3" /> {projectName(m.projectId)}
                      </span>
                      {m.attendees && m.attendees.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" /> {m.attendees.length} participantes
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline">{m.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </TabsContent>

          <TabsContent value="cronograma">
            <CronogramaPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Event detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarIcon className="h-4 w-4" />
                  {format(parseISO(selected.date), "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
                <DialogTitle className="text-xl">{selected.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <Building2 className="h-3 w-3" /> Cliente
                    </div>
                    <div className="mt-1 font-medium">{clientName(selected.clientId)}</div>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <Briefcase className="h-3 w-3" /> Projeto
                    </div>
                    <div className="mt-1 font-medium">{projectName(selected.projectId)}</div>
                  </div>
                </div>

                {selected.attendees && selected.attendees.length > 0 && (
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <Users className="h-3 w-3" /> Participantes
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selected.attendees.map((a, i) => (
                        <Badge key={i} variant="secondary">{a}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selected.agenda && (
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <FileText className="h-3 w-3" /> Pauta
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{selected.agenda}</p>
                  </div>
                )}

                {selected.recordingLink && (
                  <a
                    href={selected.recordingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Video className="h-4 w-4" /> Acessar gravação
                  </a>
                )}
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>Fechar</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const start = new Date(selected.date);
                    const end = new Date(start.getTime() + 60 * 60 * 1000);
                    const fmt = (d: Date) =>
                      d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
                    const params = new URLSearchParams({
                      action: 'TEMPLATE',
                      text: selected.title,
                      dates: `${fmt(start)}/${fmt(end)}`,
                      details: [
                        selected.agenda ?? '',
                        selected.recordingLink ? `Gravação: ${selected.recordingLink}` : '',
                      ].filter(Boolean).join('\n\n'),
                    });
                    window.open(
                      `https://calendar.google.com/calendar/render?${params.toString()}`,
                      '_blank',
                      'noopener,noreferrer',
                    );
                  }}
                >
                  <CalendarIcon className="mr-1.5 h-4 w-4" /> Adicionar ao Google Agenda
                </Button>
                <Button asChild>
                  <Link to="/atas/$ataId" params={{ ataId: selected.id }}>
                    <ExternalLink className="mr-1.5 h-4 w-4" /> Abrir ata
                  </Link>
                </Button>
              </DialogFooter>

            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
