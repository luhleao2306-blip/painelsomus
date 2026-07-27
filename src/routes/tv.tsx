import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useOpStore, STATUS_META, getTaskClientName, type OpTask } from '@/lib/operacoes-store';
import { parseLocalDate } from '@/lib/date-utils';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, ArrowLeft, Flame } from 'lucide-react';
import somusLogoUrl from '@/assets/somus-logo.png';

export const Route = createFileRoute('/tv')({
  head: () => ({
    meta: [
      { title: 'TV Somus — Painel de Demandas' },
      { name: 'description', content: 'Dashboard em tempo real das demandas da equipe Somus.' },
      { property: 'og:title', content: 'TV Somus — Painel de Demandas' },
      { property: 'og:description', content: 'Dashboard em tempo real das demandas da equipe Somus.' },
    ],
  }),
  component: TvDashboard,
});

const WEEKDAY = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

type Bucket = {
  key: string;
  label: string;
  icon: any;
  headerBg: string;
  headerText: string;
  countText: string;
  cardBorder: string;
  tasks: OpTask[];
};

function TvDashboard() {
  const store = useOpStore();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { buckets, kpis, allActive } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const in7 = new Date(today); in7.setDate(today.getDate() + 7);

    const overdue: OpTask[] = [];
    const doHoje: OpTask[] = [];
    const doAmanha: OpTask[] = [];
    const doSemana: OpTask[] = [];
    const allActive: OpTask[] = [];
    let done = 0;

    for (const t of store.tasks) {
      if (t.status === 'concluido') { done++; continue; }
      allActive.push(t);
      if (!t.dueDate) continue;
      const d = parseLocalDate(t.dueDate); if (!d) continue;
      const bucketPush =
        d < today ? overdue :
        d.getTime() === today.getTime() ? doHoje :
        d.getTime() === tomorrow.getTime() ? doAmanha :
        d <= in7 ? doSemana : null;
      if (!bucketPush) continue;
      bucketPush.push(t);
    }

    const sortByDate = (a: OpTask, b: OpTask) => {
      const da = a.dueDate ?? '9999-12-31';
      const db = b.dueDate ?? '9999-12-31';
      return da.localeCompare(db);
    };
    [overdue, doHoje, doAmanha, doSemana, allActive].forEach(arr => arr.sort(sortByDate));

    const buckets: Bucket[] = [
      { key: 'atrasado', label: 'Atrasadas',   icon: AlertTriangle, headerBg: 'bg-red-50',     headerText: 'text-red-700',     countText: 'text-red-600',     cardBorder: 'border-red-100',     tasks: overdue },
      { key: 'hoje',     label: 'Hoje',        icon: Flame,         headerBg: 'bg-amber-50',   headerText: 'text-amber-800',   countText: 'text-amber-600',   cardBorder: 'border-amber-100',   tasks: doHoje },
      { key: 'amanha',   label: 'Amanhã',      icon: Clock,         headerBg: 'bg-blue-50',    headerText: 'text-blue-700',    countText: 'text-blue-600',    cardBorder: 'border-blue-100',    tasks: doAmanha },
      { key: 'semana',   label: 'Esta semana', icon: CalendarClock, headerBg: 'bg-emerald-50', headerText: 'text-emerald-700', countText: 'text-emerald-600', cardBorder: 'border-emerald-100', tasks: doSemana },
    ];
    return {
      buckets,
      kpis: { total: store.tasks.length, done, overdue: overdue.length, hoje: doHoje.length },
      allActive,
    };
  }, [store, now]);


  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-10 py-6 border-b border-border">
        <div className="flex items-center gap-5">
          <img src={somusLogoUrl} alt="Somus" className="h-11 w-auto object-contain" />
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="somus-eyebrow text-muted-foreground">Painel da Alcateia</div>
            <div className="font-serif italic text-2xl tracking-tight text-foreground">Demandas em tempo real</div>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right">
            <div className="somus-eyebrow text-muted-foreground">{WEEKDAY[now.getDay()]}</div>
            <div className="text-lg text-foreground">
              {now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div className="text-6xl font-display font-light tabular-nums tracking-tight text-foreground">
            {hh}<span className="animate-pulse text-muted-foreground/60">:</span>{mm}
          </div>
          <Link
            to="/operacoes"
            className="ml-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Portal
          </Link>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 px-10 pt-6">
        <Kpi label="Atrasadas"    value={kpis.overdue}          accent="text-red-600" />
        <Kpi label="Para hoje"    value={kpis.hoje}             accent="text-amber-600" />
        <Kpi label="Total ativas" value={kpis.total - kpis.done} accent="text-foreground" />
        <Kpi label="Concluídas"   value={kpis.done}             accent="text-emerald-600" icon={<CheckCircle2 className="h-6 w-6 text-emerald-500/70" />} />
      </div>

      {/* Buckets grid */}
      <div className="grid grid-cols-4 gap-4 px-10 pt-4">
        {buckets.map(b => (
          <div key={b.key} className="rounded-2xl bg-card border border-border shadow-sm flex flex-col min-h-[62vh] overflow-hidden">
            <div className={`flex items-center justify-between px-5 py-4 ${b.headerBg}`}>
              <div className={`flex items-center gap-2.5 ${b.headerText}`}>
                <b.icon className="h-5 w-5" />
                <span className="text-sm uppercase tracking-[0.25em] font-semibold">{b.label}</span>
              </div>
              <span className={`font-serif text-3xl tabular-nums ${b.countText}`}>{b.tasks.length}</span>
            </div>
            <div className="flex-1 p-3 space-y-2.5 overflow-hidden">
              {b.tasks.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic font-serif">
                  Nada por aqui.
                </div>
              ) : b.tasks.slice(0, 10).map(t => {
                const assignee = store.users.find(u => u.id === t.assigneeId);
                const client = getTaskClientName(store, t);
                const meta = STATUS_META[t.status];
                const d = t.dueDate ? parseLocalDate(t.dueDate) : null;
                return (
                  <div key={t.id} className={`rounded-lg bg-background border ${b.cardBorder} px-3.5 py-2.5`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[15px] font-medium leading-snug line-clamp-2 text-foreground">{t.name}</div>
                      {d && b.key !== 'hoje' && b.key !== 'amanha' && (
                        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                          {d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">{client}</span>
                      <span className="opacity-40">•</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border ${meta.color}`}>{meta.label}</span>
                      {assignee && (<><span className="opacity-40">•</span><span className="truncate">{assignee.name}</span></>)}
                    </div>
                  </div>
                );
              })}
              {b.tasks.length > 10 && (
                <div className="text-center text-xs text-muted-foreground pt-2">
                  + {b.tasks.length - 10} demandas
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Demandas gerais */}
      <div className="px-10 pt-6 pb-8">
        <div className="flex items-baseline justify-between mb-3">
          <div className="somus-eyebrow text-muted-foreground">Demandas gerais</div>
          <div className="text-xs text-muted-foreground tabular-nums">{allActive.length} ativas</div>
        </div>
        {allActive.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6 rounded-xl border border-border bg-card">
            Nenhuma demanda ativa.
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
            {allActive.slice(0, 24).map(t => {
              const assignee = store.users.find(u => u.id === t.assigneeId);
              const client = getTaskClientName(store, t);
              const meta = STATUS_META[t.status];
              const d = t.dueDate ? parseLocalDate(t.dueDate) : null;
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
              let dateTone = 'text-muted-foreground border-border bg-background';
              let dateLabel = d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'sem prazo';
              if (d) {
                if (d < today) { dateTone = 'text-red-700 border-red-200 bg-red-50'; }
                else if (d.getTime() === today.getTime()) { dateTone = 'text-amber-800 border-amber-200 bg-amber-50'; dateLabel = 'Hoje'; }
                else if (d.getTime() === tomorrow.getTime()) { dateTone = 'text-blue-700 border-blue-200 bg-blue-50'; dateLabel = 'Amanhã'; }
              }
              return (
                <div key={t.id} className="rounded-lg border border-border bg-card px-3.5 py-2.5 shadow-sm flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-snug truncate text-foreground">{t.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">{client}</span>
                      <span className="opacity-40">•</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border ${meta.color}`}>{meta.label}</span>
                      {assignee && (<><span className="opacity-40">•</span><span className="truncate">{assignee.name}</span></>)}
                    </div>
                  </div>
                  <span className={`shrink-0 text-[11px] tabular-nums px-2 py-1 rounded border ${dateTone}`}>{dateLabel}</span>
                </div>
              );
            })}
            {allActive.length > 24 && (
              <div className="col-span-full text-center text-xs text-muted-foreground pt-1">
                + {allActive.length - 24} demandas
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

function Kpi({ label, value, accent, icon }: { label: string; value: number; accent: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-5 flex items-center justify-between shadow-sm">
      <div>
        <div className="somus-eyebrow text-muted-foreground">{label}</div>
        <div className={`mt-1 font-serif text-5xl tabular-nums ${accent}`}>{value}</div>
      </div>
      {icon}
    </div>
  );
}
