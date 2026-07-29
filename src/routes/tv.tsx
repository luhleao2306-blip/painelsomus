import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useOpStore, STATUS_META, getTaskClientName, opStore, type OpTask } from '@/lib/operacoes-store';
import { parseLocalDate } from '@/lib/date-utils';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, ArrowLeft, Flame, Users, Trophy, TrendingUp, Radio } from 'lucide-react';
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
  const [assigneeFilter, setAssigneeFilter] = useState<string>('__all__');

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Users que têm ao menos uma tarefa (para não poluir o filtro)
  const filterableUsers = useMemo(() => {
    const ids = new Set<string>();
    for (const t of store.tasks) if (t.assigneeId) ids.add(t.assigneeId);
    return store.users
      .filter(u => ids.has(u.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [store.tasks, store.users]);

  const filteredTasks = useMemo(() => {
    if (assigneeFilter === '__all__') return store.tasks;
    if (assigneeFilter === '__none__') return store.tasks.filter(t => !t.assigneeId);
    return store.tasks.filter(t => t.assigneeId === assigneeFilter);
  }, [store.tasks, assigneeFilter]);

  const { buckets, kpis, completed } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const in7 = new Date(today); in7.setDate(today.getDate() + 7);
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const overdue: OpTask[] = [];
    const doHoje: OpTask[] = [];
    const doAmanha: OpTask[] = [];
    const doSemana: OpTask[] = [];
    const doneToday: OpTask[] = [];
    const doneWeek: OpTask[] = [];
    const doneMonth: OpTask[] = [];
    let done = 0;

    for (const t of filteredTasks) {
      if (t.status === 'concluido') {
        done++;
        const u = t.updatedAt ? new Date(t.updatedAt) : null;
        if (u) {
          if (u >= today) doneToday.push(t);
          if (u >= weekStart) doneWeek.push(t);
          if (u >= monthStart) doneMonth.push(t);
        }
        continue;
      }
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
    [overdue, doHoje, doAmanha, doSemana].forEach(arr => arr.sort(sortByDate));
    const sortByUpdated = (a: OpTask, b: OpTask) =>
      (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
    [doneToday, doneWeek, doneMonth].forEach(arr => arr.sort(sortByUpdated));

    const buckets: Bucket[] = [
      { key: 'atrasado', label: 'Atrasadas',   icon: AlertTriangle, headerBg: 'bg-red-50',     headerText: 'text-red-700',     countText: 'text-red-600',     cardBorder: 'border-red-100',     tasks: overdue },
      { key: 'hoje',     label: 'Hoje',        icon: Flame,         headerBg: 'bg-amber-50',   headerText: 'text-amber-800',   countText: 'text-amber-600',   cardBorder: 'border-amber-100',   tasks: doHoje },
      { key: 'amanha',   label: 'Amanhã',      icon: Clock,         headerBg: 'bg-blue-50',    headerText: 'text-blue-700',    countText: 'text-blue-600',    cardBorder: 'border-blue-100',    tasks: doAmanha },
      { key: 'semana',   label: 'Esta semana', icon: CalendarClock, headerBg: 'bg-emerald-50', headerText: 'text-emerald-700', countText: 'text-emerald-600', cardBorder: 'border-emerald-100', tasks: doSemana },
    ];
    return {
      buckets,
      kpis: { total: filteredTasks.length, done, overdue: overdue.length, hoje: doHoje.length },
      completed: { today: doneToday, week: doneWeek, month: doneMonth },
    };
  }, [filteredTasks, now]);

  // Ranking de conclusões no mês (independente do filtro para ter contexto)
  const ranking = useMemo(() => {
    const monthStart = new Date(); monthStart.setHours(0,0,0,0); monthStart.setDate(1);
    const counts = new Map<string, number>();
    for (const t of store.tasks) {
      if (t.status !== 'concluido' || !t.assigneeId || !t.updatedAt) continue;
      if (new Date(t.updatedAt) < monthStart) continue;
      counts.set(t.assigneeId, (counts.get(t.assigneeId) ?? 0) + 1);
    }
    const rows = [...counts.entries()]
      .map(([id, count]) => ({ id, count, name: store.users.find(u => u.id === id)?.name ?? '—' }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    const max = rows[0]?.count ?? 0;
    return { rows, max };
  }, [store.tasks, store.users]);

  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const currentAssigneeName =
    assigneeFilter === '__all__' ? 'Toda a equipe' :
    assigneeFilter === '__none__' ? 'Sem responsável' :
    store.users.find(u => u.id === assigneeFilter)?.name ?? '—';

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-10 py-6 border-b border-border">
        <div className="flex items-center gap-5">
          <img src={somusLogoUrl} alt="Somus" className="h-11 w-auto object-contain" />
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="somus-eyebrow text-muted-foreground">Painel da Alcateia</div>
            <div className="font-serif italic text-2xl tracking-tight text-foreground">{currentAssigneeName}</div>
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

      {/* Filtro por responsável */}
      <div className="px-10 pt-5">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="somus-eyebrow text-muted-foreground">Filtrar por colaborador</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterPill active={assigneeFilter === '__all__'} onClick={() => setAssigneeFilter('__all__')}>
            Todos
          </FilterPill>
          {filterableUsers.map(u => (
            <FilterPill key={u.id} active={assigneeFilter === u.id} onClick={() => setAssigneeFilter(u.id)}>
              {u.name}
            </FilterPill>
          ))}
          <FilterPill active={assigneeFilter === '__none__'} onClick={() => setAssigneeFilter('__none__')}>
            Sem responsável
          </FilterPill>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 px-10 pt-5">
        <Kpi label="Atrasadas"    value={kpis.overdue}          accent="text-red-600" />
        <Kpi label="Para hoje"    value={kpis.hoje}             accent="text-amber-600" />
        <Kpi label="Total ativas" value={kpis.total - kpis.done} accent="text-foreground" />
        <Kpi label="Concluídas"   value={kpis.done}             accent="text-emerald-600" icon={<CheckCircle2 className="h-6 w-6 text-emerald-500/70" />} />
      </div>

      {/* Buckets grid */}
      <div className="grid grid-cols-4 gap-4 px-10 pt-4">
        {buckets.map(b => (
          <div key={b.key} className="rounded-2xl bg-card border border-border shadow-sm flex flex-col min-h-[52vh] overflow-hidden">
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
              ) : b.tasks.slice(0, 8).map(t => {
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
              {b.tasks.length > 8 && (
                <div className="text-center text-xs text-muted-foreground pt-2">
                  + {b.tasks.length - 8} demandas
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Concluídas + Performance */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 px-10 pt-6 pb-10">
        <DoneCard label="Concluídas hoje" tone="emerald" tasks={completed.today} store={store} />
        <DoneCard label="Concluídas na semana" tone="teal" tasks={completed.week} store={store} />
        <DoneCard label="Concluídas no mês" tone="sky" tasks={completed.month} store={store} />

        {/* Ranking */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-violet-50">
            <div className="flex items-center gap-2.5 text-violet-700">
              <Trophy className="h-5 w-5" />
              <span className="text-sm uppercase tracking-[0.25em] font-semibold">Ranking do mês</span>
            </div>
            <TrendingUp className="h-4 w-4 text-violet-500/70" />
          </div>
          <div className="p-4 space-y-3">
            {ranking.rows.length === 0 ? (
              <div className="text-sm italic font-serif text-muted-foreground text-center py-6">
                Sem conclusões no mês ainda.
              </div>
            ) : ranking.rows.map((r, i) => {
              const pct = ranking.max > 0 ? Math.round((r.count / ranking.max) * 100) : 0;
              return (
                <div key={r.id}>
                  <div className="flex items-center justify-between text-[13px] mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-5 text-center font-serif tabular-nums ${i === 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>{i + 1}</span>
                      <span className="truncate font-medium text-foreground">{r.name}</span>
                    </div>
                    <span className="font-serif tabular-nums text-foreground">{r.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-violet-400' : 'bg-violet-300'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-[12px] uppercase tracking-wider border transition-colors ${
        active
          ? 'bg-foreground text-background border-foreground'
          : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function DoneCard({
  label, tone, tasks, store,
}: {
  label: string;
  tone: 'emerald' | 'teal' | 'sky';
  tasks: OpTask[];
  store: ReturnType<typeof useOpStore>;
}) {
  const toneMap = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', count: 'text-emerald-600' },
    teal:    { bg: 'bg-teal-50',    text: 'text-teal-700',    count: 'text-teal-600' },
    sky:     { bg: 'bg-sky-50',     text: 'text-sky-700',     count: 'text-sky-600' },
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
      <div className={`flex items-center justify-between px-5 py-4 ${toneMap.bg}`}>
        <div className={`flex items-center gap-2.5 ${toneMap.text}`}>
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm uppercase tracking-[0.25em] font-semibold">{label}</span>
        </div>
        <span className={`font-serif text-3xl tabular-nums ${toneMap.count}`}>{tasks.length}</span>
      </div>
      <div className="p-3 space-y-2 max-h-[42vh] overflow-hidden">
        {tasks.length === 0 ? (
          <div className="text-sm italic font-serif text-muted-foreground text-center py-6">
            Nada concluído ainda.
          </div>
        ) : tasks.slice(0, 6).map(t => {
          const assignee = store.users.find(u => u.id === t.assigneeId);
          const client = getTaskClientName(store, t);
          return (
            <div key={t.id} className="rounded-lg bg-background border border-border px-3 py-2">
              <div className="text-[13px] font-medium leading-snug line-clamp-2 text-foreground">{t.name}</div>
              <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                <span className="truncate">{client}</span>
                {assignee && (<><span className="opacity-40">•</span><span className="truncate">{assignee.name}</span></>)}
              </div>
            </div>
          );
        })}
        {tasks.length > 6 && (
          <div className="text-center text-[11px] text-muted-foreground pt-1">+ {tasks.length - 6}</div>
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
