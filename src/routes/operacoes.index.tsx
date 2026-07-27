import { createFileRoute, Link } from '@tanstack/react-router';
import { useProfile } from '@/hooks/use-profile-wrapper';
import { useMemo } from 'react';
import {
  useOpStore, STATUS_META, STATUS_ORDER, CARGO_COLOR_MAP, getTaskClientName, type OpStatus,
} from '@/lib/operacoes-store';
import {
  Crown, Megaphone, Brush, Diamond, Bot, Zap, Rocket, Star,
  Flame, Target, AlertTriangle, CheckCircle2, ArrowRight, Activity, CalendarClock, Sparkles, ListTodo,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { parseLocalDate } from '@/lib/date-utils';
import { PersonalChecklistPanel } from '@/components/dashboard/PersonalChecklistPanel';


export const Route = createFileRoute('/operacoes/')({
  component: OperacoesPainel,
});

const ICONS = { crown: Crown, megaphone: Megaphone, brush: Brush, diamond: Diamond, bot: Bot, zap: Zap, rocket: Rocket, star: Star };

function OperacoesPainel() {
  const store = useOpStore();




  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in7 = new Date(today); in7.setDate(today.getDate() + 7);
    const byStatus = Object.fromEntries(STATUS_ORDER.map(s => [s, 0])) as Record<OpStatus, number>;
    let overdue = 0;
    let dueSoon = 0;
    let done = 0;
    const byAssignee: Record<string, number> = {};
    for (const t of store.tasks) {
      byStatus[t.status]++;
      if (t.status === 'concluido') done++;
      if (t.dueDate) {
        const d = parseLocalDate(t.dueDate)!;
        if (t.status !== 'concluido' && d < today) overdue++;
        else if (t.status !== 'concluido' && d >= today && d <= in7) dueSoon++;
      }
      if (t.assigneeId && t.status !== 'concluido') byAssignee[t.assigneeId] = (byAssignee[t.assigneeId] ?? 0) + 1;
    }
    const total = store.tasks.length;
    const pctDone = total ? Math.round((done / total) * 100) : 0;
    return {
      totalProjects: store.projects.length,
      activeProjects: store.projects.filter(p => p.status === 'em_andamento').length,
      totalTasks: total,
      overdue, dueSoon, done, pctDone,
      byStatus,
      byAssignee,
    };
  }, [store]);

  const maxByStatus = Math.max(1, ...Object.values(stats.byStatus));

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  // Demandas diárias por pessoa (tarefas de hoje + em atraso, não concluídas)
  const dailyByUser = store.users.map(u => {
    const items = store.tasks
      .filter(t => t.assigneeId === u.id && t.status !== 'concluido' && t.dueDate)
      .map(t => ({ t, d: parseLocalDate(t.dueDate!)! }))
      .filter(({ d }) => d < tomorrow) // hoje ou atrasadas
      .sort((a, b) => a.d.getTime() - b.d.getTime());
    return { user: u, items };
  }).sort((a, b) => b.items.length - a.items.length);

  const upcoming = store.tasks
    .filter(t => t.dueDate && t.status !== 'concluido')
    .map(t => ({ t, d: parseLocalDate(t.dueDate!)! }))
    .sort((a, b) => a.d.getTime() - b.d.getTime())
    .slice(0, 6);


  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mx-auto max-w-[1400px] px-6 py-8 lg:px-10"
    >
      {/* HERO */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-white/10 p-8"
        style={{
          background:
            'radial-gradient(600px 240px at 10% 0%, rgba(255,255,255,0.06), transparent 60%),' +
            'radial-gradient(500px 220px at 90% 100%, rgba(255,255,255,0.04), transparent 60%),' +
            'linear-gradient(180deg, #141414, #0a0a0a)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),' +
              'linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent 75%)',
          }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              <Flame className="h-3 w-3" /> Alcateia em movimento
            </div>
            <h1 className="font-display text-[34px] font-semibold leading-[1.05] tracking-tight text-white">
              Painel de <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Operações</span>
            </h1>
            <p className="mt-2 text-[13.5px] text-zinc-400">
              O comando central da alcateia — pastas, projetos, cargos e a caça aos gargalos da semana.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/operacoes/projetos"
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-b from-white to-zinc-300 px-3.5 py-2 text-[12.5px] font-semibold text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_24px_-10px_rgba(0,0,0,0.7)] transition hover:brightness-110"
              >
                Abrir projetos <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/operacoes/modelos"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.03] px-3.5 py-2 text-[12.5px] font-medium text-zinc-200 transition hover:bg-white/[0.06]"
              >
                Novo projeto por modelo
              </Link>



            </div>
          </div>
          {/* Progress ring */}
          <div className="flex items-center gap-6">
            <ProgressRing value={stats.pctDone} />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Progresso geral</div>
              <div className="font-display text-2xl font-semibold text-white">{stats.done}/{stats.totalTasks}</div>
              <div className="text-[11.5px] text-zinc-500">tarefas concluídas</div>
            </div>
          </div>
        </div>
      </div>




      {/* KPIs */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<Target className="h-4 w-4" />} label="Projetos ativos" value={stats.activeProjects} hint={`${stats.totalProjects} totais`} />
        <Kpi icon={<Activity className="h-4 w-4" />} label="Tarefas em jogo" value={stats.totalTasks - stats.done} hint={`${stats.totalTasks} totais`} />
        <Kpi icon={<AlertTriangle className="h-4 w-4" />} label="Em atraso" value={stats.overdue} tone={stats.overdue > 0 ? 'danger' : 'default'} hint="prazo estourado" />
        <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Prazo em 7 dias" value={stats.dueSoon} tone={stats.dueSoon > 0 ? 'warning' : 'default'} hint="entregas próximas" />
      </div>

      {/* Meu check-list */}
      <div className="mb-6 rounded-2xl border border-border/70 bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base font-semibold">Meu check-list</h2>
        </div>
        <PersonalChecklistPanel />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">

        {/* Status distribution */}
        <div className="lg:col-span-5 rounded-2xl border border-border/70 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold">Tarefas por status</h2>
              <p className="text-[11px] text-muted-foreground">Fluxo real de execução</p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">6 estágios</span>
          </div>
          <div className="space-y-2.5">
            {STATUS_ORDER.map(s => {
              const meta = STATUS_META[s];
              const count = stats.byStatus[s];
              const pct = Math.round((count / maxByStatus) * 100);
              return (
                <div key={s}>
                  <div className="mb-1 flex items-center gap-2 text-[12px]">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    <span className="flex-1 font-medium">{meta.label}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full ${meta.dot} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active projects */}
        <div className="lg:col-span-7 rounded-2xl border border-border/70 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold">Projetos em andamento</h2>
              <p className="text-[11px] text-muted-foreground">Operações vivas da semana</p>
            </div>
            <Link to="/operacoes/projetos" className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground hover:text-foreground">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {store.projects.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-[12.5px] text-muted-foreground">
                Nenhum projeto ainda. <Link to="/operacoes/modelos" className="underline">Crie a partir de um modelo</Link>.
              </div>
            )}
            {store.projects.slice(0, 6).map(p => {
              const secs = store.sections.filter(s => s.projectId === p.id);
              const secIds = new Set(secs.map(s => s.id));
              const pts = store.tasks.filter(t => secIds.has(t.sectionId));
              const doneCount = pts.filter(t => t.status === 'concluido').length;
              const pct = pts.length ? Math.round((doneCount / pts.length) * 100) : 0;
              const folder = store.folders.find(f => f.id === p.folderId);
              return (
                <Link
                  key={p.id}
                  to="/operacoes/projetos"
                  className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background p-3 transition hover:border-foreground/40 hover:shadow-sm"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-[11px] font-bold text-muted-foreground group-hover:bg-foreground group-hover:text-background">
                    {(folder?.name ?? p.name).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[12.5px] font-semibold">{p.name}</p>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-foreground transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">{doneCount}/{pts.length}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Demandas diárias por pessoa */}
        <div className="lg:col-span-12 rounded-2xl border border-border/70 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold inline-flex items-center gap-2">
                <CalendarClock className="h-4 w-4" /> Demandas diárias
              </h2>
              <p className="text-[11px] text-muted-foreground">
                O que cada um precisa entregar hoje · atrasadas contam
              </p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {today.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {dailyByUser.map(({ user: u, items }) => {
              const cargo = store.cargos.find(c => c.id === u.cargoId);
              const Icon = cargo ? ICONS[cargo.icon] : Star;
              const overdueCount = items.filter(({ d }) => d < today).length;
              return (
                <div key={u.id} className="rounded-lg border border-border/60 bg-background p-3">
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground font-mono text-[10.5px] font-bold text-background">
                      {u.name.split(' ').map(p => p[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium">{u.name}</p>
                      {cargo && (
                        <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold ${CARGO_COLOR_MAP[cargo.color]}`}>
                          <Icon className="h-2.5 w-2.5" /> {cargo.name}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[13px] font-semibold leading-none">{items.length}</div>
                      {overdueCount > 0 && (
                        <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-red-600 dark:text-red-400">
                          {overdueCount} atr.
                        </div>
                      )}
                    </div>
                  </div>
                  {items.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border/60 px-2 py-3 text-center text-[11px] text-muted-foreground">
                      Sem demandas para hoje.
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {items.slice(0, 5).map(({ t, d }) => {
                        const isOverdue = d < today;
                        const meta = STATUS_META[t.status];
                        return (
                          <li key={t.id}>
                            <Link
                              to="/operacoes/minhas-demandas"
                              className={`group flex items-center gap-2 rounded-md border px-2 py-1.5 transition ${
                                isOverdue
                                  ? 'border-red-500/40 bg-red-500/5 hover:border-red-500/60'
                                  : 'border-border/50 bg-background hover:border-foreground/40'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
                              <span className="shrink-0 rounded-full border border-border/50 bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground" title="Cliente">
                                {getTaskClientName(store, t)}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[11.5px]">{t.name}</span>
                              <span className={`shrink-0 font-mono text-[9.5px] uppercase tracking-wider ${
                                isOverdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                              }`}>
                                {isOverdue ? 'atraso' : 'hoje'}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                      {items.length > 5 && (
                        <li className="pt-0.5 text-center">
                          <Link
                            to="/operacoes/minhas-demandas"
                            className="inline-block w-full rounded-md border border-dashed border-border/50 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:border-foreground/40 hover:bg-muted/30"
                          >
                            + {items.length - 5} demandas
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>


        {/* Upcoming deadlines */}
        <div className="lg:col-span-12 rounded-2xl border border-border/70 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold inline-flex items-center gap-2">
                <CalendarClock className="h-4 w-4" /> Próximos vencimentos
              </h2>
              <p className="text-[11px] text-muted-foreground">As caças mais próximas · não deixe passar</p>
            </div>
            <Link to="/operacoes/projetos" className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground hover:text-foreground">
              Abrir projetos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-[12.5px] text-muted-foreground">
              <Sparkles className="mx-auto mb-2 h-4 w-4" />
              Nenhum prazo no radar. Alcateia respirando.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {upcoming.map(({ t, d }) => {
                const overdue = d < today;
                const days = Math.round((d.getTime() - today.getTime()) / 86400000);
                const rel = overdue ? `${Math.abs(days)}d em atraso` : days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days}d`;
                const meta = STATUS_META[t.status];
                const assignee = store.users.find(u => u.id === t.assigneeId);
                return (
                  <Link
                    key={t.id}
                    to="/operacoes/projetos"
                    className={`group flex items-center gap-3 rounded-lg border p-3 transition hover:shadow-sm ${
                      overdue ? 'border-red-500/40 bg-red-500/5' : 'border-border/60 bg-background hover:border-foreground/40'
                    }`}
                  >
                    <div className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md font-mono ${
                      overdue ? 'bg-red-500 text-white' : 'bg-muted text-foreground'
                    }`}>
                      <span className="text-[9px] uppercase leading-none">{d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                      <span className="text-[14px] font-bold leading-none">{d.getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">
                        {getTaskClientName(store, t)}
                      </div>
                      <p className="truncate text-[12.5px] font-medium">{t.name}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-[10.5px]">
                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ${meta.color} border`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
                        </span>
                        {assignee && <span className="text-muted-foreground">· {assignee.name.split(' ')[0]}</span>}
                      </div>
                    </div>
                    <span className={`font-mono text-[10.5px] font-semibold uppercase tracking-wider ${overdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                      {rel}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}


function Kpi({
  icon, label, value, hint, tone = 'default',
}: { icon: React.ReactNode; label: string; value: number; hint?: string; tone?: 'default' | 'danger' | 'warning' }) {
  const toneCls =
    tone === 'danger' ? 'border-red-500/40 bg-red-500/5' :
    tone === 'warning' ? 'border-amber-500/40 bg-amber-500/5' :
    'border-border/70 bg-card';
  const iconCls =
    tone === 'danger' ? 'text-red-600 dark:text-red-400' :
    tone === 'warning' ? 'text-amber-600 dark:text-amber-400' :
    'text-muted-foreground';
  return (
    <div className={`rounded-xl border p-4 ${toneCls}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <span className={iconCls}>{icon}</span>
      </div>
      <p className="font-display text-3xl font-semibold leading-none tracking-tight">{value}</p>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: 'nao_iniciado' | 'em_andamento' | 'concluido' | 'pausado' }) {
  const map = {
    nao_iniciado: { label: 'Aguardando', cls: 'bg-muted text-muted-foreground' },
    em_andamento: { label: 'Em andamento', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
    concluido: { label: 'Concluído', cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
    pausado: { label: 'Pausado', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  } as const;
  const m = map[status];
  return <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${m.cls}`}>{m.label}</span>;
}

function ProgressRing({ value }: { value: number }) {
  const size = 88;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <defs>
          <linearGradient id="opring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#a1a1aa" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none" stroke="rgba(255,255,255,0.08)" />
        <circle
          cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          className="fill-none transition-all"
          stroke="url(#opring)"
          style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.3))' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-display text-[18px] font-semibold text-white">
        {value}%
      </div>
    </div>

  );
}
