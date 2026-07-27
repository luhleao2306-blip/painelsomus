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

type Bucket = { key: string; label: string; icon: any; tone: string; ring: string; tasks: OpTask[] };

function TvDashboard() {
  const store = useOpStore();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { buckets, kpis, byAssignee } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const in7 = new Date(today); in7.setDate(today.getDate() + 7);

    const overdue: OpTask[] = [];
    const doHoje: OpTask[] = [];
    const doAmanha: OpTask[] = [];
    const doSemana: OpTask[] = [];
    let done = 0;
    const byA: Record<string, { total: number; overdue: number; hoje: number }> = {};

    for (const t of store.tasks) {
      if (t.status === 'concluido') { done++; continue; }
      if (!t.dueDate) continue;
      const d = parseLocalDate(t.dueDate); if (!d) continue;
      const bucketPush =
        d < today ? overdue :
        d.getTime() === today.getTime() ? doHoje :
        d.getTime() === tomorrow.getTime() ? doAmanha :
        d <= in7 ? doSemana : null;
      if (!bucketPush) continue;
      bucketPush.push(t);
      if (t.assigneeId) {
        const a = byA[t.assigneeId] ??= { total: 0, overdue: 0, hoje: 0 };
        a.total++;
        if (bucketPush === overdue) a.overdue++;
        if (bucketPush === doHoje) a.hoje++;
      }
    }

    const sortByDate = (a: OpTask, b: OpTask) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
    [overdue, doHoje, doAmanha, doSemana].forEach(arr => arr.sort(sortByDate));

    const buckets: Bucket[] = [
      { key: 'atrasado', label: 'Atrasadas',  icon: AlertTriangle, tone: 'from-red-500/25 to-red-500/5',       ring: 'ring-red-500/40',    tasks: overdue },
      { key: 'hoje',     label: 'Hoje',       icon: Flame,         tone: 'from-amber-500/25 to-amber-500/5',   ring: 'ring-amber-500/40',  tasks: doHoje },
      { key: 'amanha',   label: 'Amanhã',     icon: Clock,         tone: 'from-blue-500/25 to-blue-500/5',     ring: 'ring-blue-500/40',   tasks: doAmanha },
      { key: 'semana',   label: 'Esta semana',icon: CalendarClock, tone: 'from-emerald-500/25 to-emerald-500/5',ring:'ring-emerald-500/40',tasks: doSemana },
    ];
    return {
      buckets,
      kpis: { total: store.tasks.length, done, overdue: overdue.length, hoje: doHoje.length },
      byAssignee: Object.entries(byA)
        .map(([id, v]) => ({ user: store.users.find(u => u.id === id), ...v }))
        .filter(x => x.user)
        .sort((a, b) => b.overdue - a.overdue || b.hoje - a.hoje || b.total - a.total)
        .slice(0, 8),
    };
  }, [store, now]);

  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-10 py-6 border-b border-white/10">
        <div className="flex items-center gap-5">
          <img src={somusLogoUrl} alt="Somus" className="h-11 w-auto invert" />
          <div className="h-10 w-px bg-white/15" />
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-neutral-400">Painel da Alcateia</div>
            <div className="text-2xl font-serif italic tracking-tight">Demandas em tempo real</div>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.35em] text-neutral-400">{WEEKDAY[now.getDay()]}</div>
            <div className="text-lg text-neutral-200">{now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
          </div>
          <div className="text-6xl font-mono font-light tabular-nums">{hh}<span className="animate-pulse text-neutral-500">:</span>{mm}</div>
          <Link to="/operacoes" className="ml-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-neutral-300 hover:bg-white/5">
            <ArrowLeft className="h-3.5 w-3.5" /> Portal
          </Link>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 px-10 pt-6">
        <Kpi label="Atrasadas"  value={kpis.overdue} accent="text-red-400" />
        <Kpi label="Para hoje"  value={kpis.hoje}    accent="text-amber-300" />
        <Kpi label="Total ativas" value={kpis.total - kpis.done} accent="text-white" />
        <Kpi label="Concluídas" value={kpis.done}   accent="text-emerald-400" icon={<CheckCircle2 className="h-6 w-6 opacity-60" />} />
      </div>

      {/* Buckets grid */}
      <div className="grid grid-cols-4 gap-4 px-10 pt-4">
        {buckets.map(b => (
          <div key={b.key} className={`rounded-2xl bg-gradient-to-b ${b.tone} ring-1 ${b.ring} p-5 flex flex-col min-h-[62vh]`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <b.icon className="h-5 w-5" />
                <span className="text-sm uppercase tracking-[0.25em] font-semibold">{b.label}</span>
              </div>
              <span className="text-3xl font-serif tabular-nums">{b.tasks.length}</span>
            </div>
            <div className="flex-1 space-y-2.5 overflow-hidden">
              {b.tasks.length === 0 ? (
                <div className="h-full flex items-center justify-center text-neutral-500 text-sm italic">Nada por aqui.</div>
              ) : b.tasks.slice(0, 10).map(t => {
                const assignee = store.users.find(u => u.id === t.assigneeId);
                const client = getTaskClientName(store, t);
                const meta = STATUS_META[t.status];
                const d = t.dueDate ? parseLocalDate(t.dueDate) : null;
                return (
                  <div key={t.id} className="rounded-lg bg-black/30 backdrop-blur-sm border border-white/5 px-3.5 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[15px] font-medium leading-snug line-clamp-2">{t.name}</div>
                      {d && b.key !== 'hoje' && b.key !== 'amanha' && (
                        <span className="shrink-0 text-[11px] text-neutral-400 tabular-nums">
                          {d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-400">
                      <span className="truncate">{client}</span>
                      <span className="opacity-40">•</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                      {assignee && (<><span className="opacity-40">•</span><span className="truncate">{assignee.name}</span></>)}
                    </div>
                  </div>
                );
              })}
              {b.tasks.length > 10 && (
                <div className="text-center text-xs text-neutral-500 pt-2">+ {b.tasks.length - 10} demandas</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard responsáveis */}
      <div className="px-10 pt-6 pb-8">
        <div className="text-[10px] uppercase tracking-[0.35em] text-neutral-500 mb-3">Carga por responsável</div>
        <div className="grid grid-cols-4 gap-3">
          {byAssignee.map(({ user, total, overdue, hoje }) => (
            <div key={user!.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">{user!.name}</div>
                <div className="text-[11px] text-neutral-400">
                  {overdue > 0 && <span className="text-red-400">{overdue} atrasada{overdue > 1 ? 's' : ''}</span>}
                  {overdue > 0 && hoje > 0 && ' • '}
                  {hoje > 0 && <span className="text-amber-300">{hoje} hoje</span>}
                  {overdue === 0 && hoje === 0 && <span>sem urgência</span>}
                </div>
              </div>
              <div className="text-3xl font-serif tabular-nums text-white/90">{total}</div>
            </div>
          ))}
          {byAssignee.length === 0 && (
            <div className="col-span-4 text-center text-sm text-neutral-500 py-4">Nenhuma demanda atribuída para os próximos dias.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent, icon }: { label: string; value: number; accent: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5 flex items-center justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-[0.35em] text-neutral-400">{label}</div>
        <div className={`mt-1 text-5xl font-serif tabular-nums ${accent}`}>{value}</div>
      </div>
      {icon}
    </div>
  );
}
