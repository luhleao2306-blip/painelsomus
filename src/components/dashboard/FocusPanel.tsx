import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Target, AlertTriangle, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { useData, Task } from '@/contexts/DataContext';

const QUOTES = [
  'Foco no que move o ponteiro. Pequenos passos hoje, grandes resultados amanhã.',
  'Disciplina é a ponte entre metas e conquistas.',
  'Comece pelo mais importante — não pelo mais urgente.',
  'Feito é melhor que perfeito. Avance.',
  'Cada tarefa concluída é um passo a mais para o cliente.',
  'A consistência vence o talento quando o talento não é consistente.',
  'Energia segue foco. Escolha bem onde você coloca o seu.',
  'Não conte os dias, faça os dias contarem.',
  'Hoje é o melhor dia para começar. E também para terminar.',
  'Excelência é um hábito, não um acidente.',
  'Faça o simples bem feito. Repita.',
  'Quem domina o próprio tempo, domina o próprio resultado.',
  'Resultado nasce do que se faz, não do que se planeja.',
  'Foco é dizer não a cem coisas boas para dizer sim à essencial.',
  'Sua próxima tarefa é o seu próximo progresso.',
];

function quoteOfTheDay() {
  const d = new Date();
  const seed = d.getFullYear() * 1000 + (d.getMonth() + 1) * 31 + d.getDate();
  return QUOTES[seed % QUOTES.length];
}

interface Props {
  onOpenTask: (t: Task) => void;
}

export function FocusPanel({ onOpenTask }: Props) {
  const { profile } = useProfile();
  const { filteredTasks, projects } = useData();

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  // Parse a deadline (possibly "YYYY-MM-DD") as a local date at midnight
  // so timezone shifts don't push today's tasks into "overdue".
  const parseLocalDate = (raw: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(raw);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const normalize = (s: string | null | undefined) =>
    (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const myTasks = useMemo(() => {
    const myId = profile?.id ?? '';
    const myName = normalize(profile?.full_name);
    return filteredTasks.filter(t => {
      if (['Concluído', 'Cancelado', 'Aprovado'].includes(t.status)) return false;
      const candidates = [
        t.assignee,
        ...(t.assignees ?? []),
      ].map(normalize).filter(Boolean);
      if (myId && candidates.includes(normalize(myId))) return true;
      if (myName && candidates.some(c => c === myName || c.includes(myName) || myName.includes(c))) return true;
      return false;
    });
  }, [filteredTasks, profile?.id, profile?.full_name]);

  const in7Days = useMemo(() => {
    const d = new Date(today); d.setDate(d.getDate() + 7); return d;
  }, [today]);

  const todayTasks = useMemo(() =>
    myTasks.filter(t => {
      if (!t.deadline) return false;
      return parseLocalDate(t.deadline).getTime() === today.getTime();
    }), [myTasks, today]);

  const overdue = useMemo(() =>
    myTasks.filter(t => t.deadline && parseLocalDate(t.deadline) < today)
      .sort((a, b) => parseLocalDate(a.deadline!).getTime() - parseLocalDate(b.deadline!).getTime()),
    [myTasks, today]);

  // Foco da semana: hoje + próximos 7 dias (inclusive), ordenado por prazo.
  const upcoming = useMemo(() =>
    myTasks
      .filter(t => {
        if (!t.deadline) return false;
        const d = parseLocalDate(t.deadline);
        return d >= today && d <= in7Days;
      })
      .sort((a, b) => parseLocalDate(a.deadline!).getTime() - parseLocalDate(b.deadline!).getTime()),
    [myTasks, today, in7Days]);

  const firstName = profile?.full_name?.split(' ')[0] || 'você';
  const projectName = (id?: string) => projects.find(p => p.id === id)?.name || '—';

  return (
    <div className="space-y-4">
      {/* Hero motivacional */}
      <Card className="border-border/50 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm overflow-hidden">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl grid place-items-center bg-primary/10 text-primary shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Foco do dia, {firstName}</p>
            <p className="text-base md:text-lg font-semibold text-foreground leading-snug mt-1">
              {quoteOfTheDay()}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase tracking-wider">
                <Target className="h-3 w-3 mr-1" /> {myTasks.length} abertas
              </Badge>
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-none text-[10px] font-bold uppercase tracking-wider">
                <Calendar className="h-3 w-3 mr-1" /> {todayTasks.length} para hoje
              </Badge>
              {overdue.length > 0 && (
                <Badge variant="destructive" className="text-[10px] font-bold uppercase tracking-wider border-none">
                  <AlertTriangle className="h-3 w-3 mr-1" /> {overdue.length} atrasadas
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Atrasadas */}
        <Card className="border-destructive/20 bg-destructive/[0.03] shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" /> Minhas tarefas atrasadas
              </h3>
              <Badge variant="destructive" className="text-[10px]">{overdue.length}</Badge>
            </div>
            {overdue.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg flex flex-col items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Nada atrasado. Bom trabalho!
              </div>
            ) : (
              <div className="space-y-1.5">
                {overdue.slice(0, 6).map(t => {
                  const days = Math.max(0, Math.floor((today.getTime() - new Date(t.deadline!).getTime()) / 86400000));
                  return (
                    <button
                      key={t.id}
                      onClick={() => onOpenTask(t)}
                      className="w-full text-left flex items-center gap-2 p-2 rounded-lg bg-background border border-border/50 hover:border-destructive/40 transition-colors group"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                      <span className="text-[13px] font-medium truncate flex-1">{t.title}</span>
                      <span className="text-[10px] text-muted-foreground truncate hidden sm:inline max-w-[120px]">{projectName(t.projectId)}</span>
                      <Badge variant="destructive" className="text-[9px] font-bold shrink-0">{days}d</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-destructive shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Para hoje / próximas */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Foco {todayTasks.length > 0 ? 'de hoje' : 'desta semana'}
              </h3>
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-none">
                {(todayTasks.length > 0 ? todayTasks : upcoming).length}
              </Badge>
            </div>
            {(() => {
              const list = todayTasks.length > 0 ? todayTasks : upcoming;
              if (list.length === 0) {
                return (
                  <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
                    Nenhuma tarefa com prazo próximo.
                  </div>
                );
              }
              return (
                <div className="space-y-1.5">
                  {list.slice(0, 6).map(t => (
                    <button
                      key={t.id}
                      onClick={() => onOpenTask(t)}
                      className="w-full text-left flex items-center gap-2 p-2 rounded-lg bg-background border border-border/50 hover:border-primary/40 transition-colors group"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        t.priority === 'Crítica' ? 'bg-rose-500' :
                        t.priority === 'Alta' ? 'bg-amber-500' :
                        t.priority === 'Média' ? 'bg-blue-500' : 'bg-muted-foreground/40'
                      }`} />
                      <span className="text-[13px] font-medium truncate flex-1">{t.title}</span>
                      <span className="text-[10px] text-muted-foreground truncate hidden sm:inline max-w-[120px]">{projectName(t.projectId)}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                        {t.deadline ? new Date(t.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
