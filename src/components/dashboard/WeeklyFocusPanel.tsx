import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, ArrowRight, CheckCircle2, CalendarDays } from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { useData, Task } from '@/contexts/DataContext';

interface Props {
  onOpenTask: (t: Task) => void;
}

function getWeekBounds(date: Date) {
  const day = date.getDay(); // 0 = Sun, 1 = Mon, ...
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

export function WeeklyFocusPanel({ onOpenTask }: Props) {
  const { profile } = useProfile();
  const { filteredTasks, projects } = useData();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const { monday, sunday } = useMemo(() => getWeekBounds(today), [today]);

  const myOpenTasks = useMemo(
    () =>
      filteredTasks.filter(
        (t) =>
          (t.assignee === profile?.id || t.assignee === profile?.full_name) &&
          !['Concluído', 'Cancelado'].includes(t.status)
      ),
    [filteredTasks, profile?.id, profile?.full_name]
  );

  const weekTasks = useMemo(() => {
    return myOpenTasks
      .filter((t) => {
        if (!t.deadline) return false;
        const d = new Date(t.deadline);
        return d >= monday && d <= sunday;
      })
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  }, [myOpenTasks, monday, sunday]);

  const overdue = useMemo(
    () =>
      myOpenTasks
        .filter((t) => t.deadline && new Date(t.deadline) < today)
        .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()),
    [myOpenTasks, today]
  );

  const projectName = (id?: string) => projects.find((p) => p.id === id)?.name || '—';

  const weekLabel = useMemo(() => {
    const fmt = (d: Date) =>
      d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return `${fmt(monday)} – ${fmt(sunday)}`;
  }, [monday, sunday]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Foco da Semana */}
      <Card className="lg:col-span-2 border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Foco da Semana
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-none">
              <CalendarDays className="h-3 w-3 mr-1" />
              {weekLabel}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {weekTasks.length} tarefa{weekTasks.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {weekTasks.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-lg flex flex-col items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Nenhuma tarefa com prazo nesta semana. Bom trabalho!
            </div>
          ) : (
            <div className="space-y-1.5">
              {weekTasks.map((t) => {
                const deadline = new Date(t.deadline!);
                const isToday = deadline.toDateString() === today.toDateString();
                const dayLabel = isToday
                  ? 'Hoje'
                  : deadline.toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    });
                return (
                  <button
                    key={t.id}
                    onClick={() => onOpenTask(t)}
                    className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/50 hover:border-primary/40 transition-colors group"
                  >
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        t.priority === 'Crítica'
                          ? 'bg-rose-500'
                          : t.priority === 'Alta'
                            ? 'bg-amber-500'
                            : t.priority === 'Média'
                              ? 'bg-blue-500'
                              : 'bg-muted-foreground/40'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium truncate">{t.title}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {projectName(t.projectId)}
                      </div>
                    </div>
                    <Badge
                      variant={isToday ? 'default' : 'secondary'}
                      className="text-[9px] font-bold shrink-0"
                    >
                      {dayLabel}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo rápido */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Resumo da Semana</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Tarefas da semana</span>
            </div>
            <span className="text-lg font-bold text-primary">{weekTasks.length}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">Atrasadas</span>
            </div>
            <span className="text-lg font-bold text-amber-600">{overdue.length}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium">Minhas abertas</span>
            </div>
            <span className="text-lg font-bold text-emerald-600">{myOpenTasks.length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
