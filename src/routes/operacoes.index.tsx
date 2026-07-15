import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import {
  useOpStore, STATUS_META, STATUS_ORDER, CARGO_COLOR_MAP, type OpStatus,
} from '@/lib/operacoes-store';
import { Crown, Megaphone, Brush, Diamond, Bot, Zap, Rocket, Star } from 'lucide-react';

export const Route = createFileRoute('/operacoes/')({
  component: OperacoesPainel,
});

const ICONS = { crown: Crown, megaphone: Megaphone, brush: Brush, diamond: Diamond, bot: Bot, zap: Zap, rocket: Rocket, star: Star };

function OperacoesPainel() {
  const store = useOpStore();

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const byStatus = Object.fromEntries(STATUS_ORDER.map(s => [s, 0])) as Record<OpStatus, number>;
    let overdue = 0;
    const byAssignee: Record<string, number> = {};
    for (const t of store.tasks) {
      byStatus[t.status]++;
      if (t.dueDate && t.status !== 'concluido' && new Date(t.dueDate) < today) overdue++;
      if (t.assigneeId) byAssignee[t.assigneeId] = (byAssignee[t.assigneeId] ?? 0) + 1;
    }
    return {
      totalProjects: store.projects.length,
      activeProjects: store.projects.filter(p => p.status === 'em_andamento').length,
      totalTasks: store.tasks.length,
      overdue,
      byStatus,
      byAssignee,
    };
  }, [store]);

  const maxByStatus = Math.max(1, ...Object.values(stats.byStatus));

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Painel de Operações</h1>
        <p className="text-sm text-muted-foreground">Visão geral da operação da alcateia — projetos, tarefas e time.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-8">
        <Kpi label="Projetos ativos" value={stats.activeProjects} hint={`${stats.totalProjects} totais`} />
        <Kpi label="Tarefas totais" value={stats.totalTasks} />
        <Kpi label="Tarefas atrasadas" value={stats.overdue} tone={stats.overdue > 0 ? 'danger' : 'default'} />
        <Kpi label="Colaboradores" value={store.users.length} hint={`${store.cargos.length} cargos`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h2 className="font-display text-base font-semibold mb-4">Tarefas por status</h2>
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
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full ${meta.dot}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h2 className="font-display text-base font-semibold mb-4">Time da alcateia</h2>
          <div className="space-y-2">
            {store.users.map(u => {
              const cargo = store.cargos.find(c => c.id === u.cargoId);
              const Icon = cargo ? ICONS[cargo.icon] : Star;
              const count = stats.byAssignee[u.id] ?? 0;
              return (
                <div key={u.id} className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background p-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                    {u.name.split(' ').map(p => p[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{u.name}</p>
                    {cargo && (
                      <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${CARGO_COLOR_MAP[cargo.color]}`}>
                        <Icon className="h-2.5 w-2.5" /> {cargo.name}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{count} tarefas</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, tone = 'default' }: { label: string; value: number; hint?: string; tone?: 'default' | 'danger' }) {
  return (
    <div className={`rounded-xl border p-4 ${tone === 'danger' ? 'border-red-500/40 bg-red-500/5' : 'border-border/60 bg-card'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
