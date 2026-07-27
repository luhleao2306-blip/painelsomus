import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useOpStore, CARGO_COLOR_MAP } from '@/lib/operacoes-store';
import {
  Crown, Megaphone, Brush, Diamond, Bot, Zap, Rocket, Star,
  TrendingUp, CheckCircle2, AlertTriangle, Clock, Target, Trophy, Medal, Award,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { OpPageHeader } from '@/components/operacoes/OpPageHeader';

export const Route = createFileRoute('/operacoes/performance')({
  component: OperacoesPerformance,
});

const ICONS = { crown: Crown, megaphone: Megaphone, brush: Brush, diamond: Diamond, bot: Bot, zap: Zap, rocket: Rocket, star: Star };

function OperacoesPerformance() {
  const store = useOpStore();
  const [period, setPeriod] = useState<'semana' | 'mes' | 'trimestre'>('mes');

  const stats = useMemo(() => {
    const now = new Date();
    return store.users.map(u => {
      const mine = store.tasks.filter(t => t.assigneeId === u.id);
      const concluidas = mine.filter(t => t.status === 'concluido');
      const atrasadas = mine.filter(t => t.dueDate && t.status !== 'concluido' && new Date(t.dueDate) < now);
      const abertas = mine.filter(t => t.status !== 'concluido');
      const noPrazo = concluidas.filter(t => t.dueDate && new Date(t.dueDate) >= new Date(t.startDate ?? t.dueDate)).length;
      const taxa = concluidas.length > 0 ? Math.round((noPrazo / concluidas.length) * 100) : 0;
      const score = concluidas.length * 10 + taxa - atrasadas.length * 5;
      return { user: u, concluidas: concluidas.length, atrasadas: atrasadas.length, abertas: abertas.length, taxa, score };
    }).sort((a, b) => b.score - a.score);
  }, [store, period]);

  const totals = useMemo(() => stats.reduce(
    (acc, s) => ({
      concluidas: acc.concluidas + s.concluidas,
      atrasadas: acc.atrasadas + s.atrasadas,
      abertas: acc.abertas + s.abertas,
      taxaSum: acc.taxaSum + s.taxa,
    }),
    { concluidas: 0, atrasadas: 0, abertas: 0, taxaSum: 0 },
  ), [stats]);
  const avgTaxa = stats.length ? Math.round(totals.taxaSum / stats.length) : 0;

  const maxOpen = Math.max(1, ...stats.map(s => s.abertas));
  const maxDone = Math.max(1, ...stats.map(s => s.concluidas));

  return (
    <div className="py-8">
      <OpPageHeader
        eyebrow="Rastro da caçada"
        title="Performance do Time"
        description="Entregas, atrasos e carga atual — cada lobo com sua régua à vista."
        icon={<TrendingUp className="h-4 w-4" />}
        actions={
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Semana</SelectItem>
              <SelectItem value="mes">Mês</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Concluídas" value={totals.concluidas} icon={<CheckCircle2 className="h-3.5 w-3.5" />} tone="emerald" />
        <KpiCard label="Em atraso" value={totals.atrasadas} icon={<AlertTriangle className="h-3.5 w-3.5" />} tone="rose" />
        <KpiCard label="Abertas" value={totals.abertas} icon={<Clock className="h-3.5 w-3.5" />} tone="neutral" />
        <KpiCard label="No prazo (média)" value={`${avgTaxa}%`} icon={<Target className="h-3.5 w-3.5" />} tone="neutral" />
      </div>

      {/* Podium */}
      {stats.length >= 1 && (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          {stats.slice(0, 3).map((row, i) => {
            const cargo = store.cargos.find(c => c.id === row.user.cargoId);
            const Icon = cargo ? ICONS[cargo.icon] : Star;
            const rankStyles = [
              { badge: 'bg-amber-400/15 text-amber-300 border-amber-400/30', ring: 'ring-amber-400/20', Icon: Trophy },
              { badge: 'bg-zinc-300/10 text-zinc-200 border-zinc-300/25', ring: 'ring-zinc-300/15', Icon: Medal },
              { badge: 'bg-orange-500/10 text-orange-300 border-orange-500/25', ring: 'ring-orange-500/15', Icon: Award },
            ][i];
            const RankIcon = rankStyles.Icon;
            return (
              <div
                key={row.user.id}
                className={`group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-b from-card to-card/40 p-4 ring-1 ${rankStyles.ring}`}
              >
                <div className="pointer-events-none absolute -top-24 -right-16 h-40 w-40 rounded-full bg-foreground/[0.03] blur-2xl" />
                <div className="flex items-start justify-between">
                  <div className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${rankStyles.badge}`}>
                    <RankIcon className="h-3 w-3" /> #{i + 1}
                  </div>
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    Score {row.score}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground/[0.06] text-[13px] font-semibold text-foreground">
                    {row.user.name.split(' ').map(p => p[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{row.user.name}</p>
                    {cargo && (
                      <span className={`mt-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold ${CARGO_COLOR_MAP[cargo.color]}`}>
                        <Icon className="h-2.5 w-2.5" /> {cargo.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="Feitas" value={row.concluidas} />
                  <MiniStat label="Atraso" value={row.atrasadas} danger={row.atrasadas > 0} />
                  <MiniStat label="No prazo" value={`${row.taxa}%`} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leaderboard */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/10 px-4 py-2.5">
          <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Ranking completo
          </div>
          <div className="text-[10.5px] text-muted-foreground">{stats.length} colaboradores</div>
        </div>

        <div className="hidden grid-cols-[40px_minmax(220px,2fr)_1fr_1fr_1fr_1fr_1.6fr] gap-3 border-b border-border/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:grid">
          <span>#</span>
          <span>Colaborador</span>
          <span className="text-right">Concluídas</span>
          <span className="text-right">Em atraso</span>
          <span className="text-right">Abertas</span>
          <span className="text-right">No prazo</span>
          <span>Carga atual</span>
        </div>

        {stats.map((row, i) => {
          const cargo = store.cargos.find(c => c.id === row.user.cargoId);
          const Icon = cargo ? ICONS[cargo.icon] : Star;
          const donePct = (row.concluidas / maxDone) * 100;
          return (
            <div
              key={row.user.id}
              className="group grid grid-cols-1 items-center gap-2 border-b border-border/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/20 sm:grid-cols-[40px_minmax(220px,2fr)_1fr_1fr_1fr_1fr_1.6fr] sm:gap-3"
            >
              <div className="hidden text-[12px] font-mono font-semibold text-muted-foreground sm:block">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.06] text-[11px] font-bold text-foreground">
                  {row.user.name.split(' ').map(p => p[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{row.user.name}</p>
                  {cargo && (
                    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold ${CARGO_COLOR_MAP[cargo.color]}`}>
                      <Icon className="h-2.5 w-2.5" /> {cargo.name}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-right text-[13px] font-medium tabular-nums text-emerald-400/90">{row.concluidas}</span>
              <span className={`text-right text-[13px] font-medium tabular-nums ${row.atrasadas > 0 ? 'text-rose-400' : 'text-muted-foreground'}`}>
                {row.atrasadas}
              </span>
              <span className="text-right text-[13px] font-medium tabular-nums">{row.abertas}</span>
              <span className="text-right text-[13px] font-medium tabular-nums text-muted-foreground">{row.taxa}%</span>
              <div className="flex items-center gap-2">
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/[0.06]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-foreground/70 to-foreground/40"
                    style={{ width: `${(row.abertas / maxOpen) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-[10.5px] font-mono text-muted-foreground tabular-nums">
                  {Math.round(donePct)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KpiCard({
  label, value, icon, tone,
}: { label: string; value: string | number; icon: React.ReactNode; tone: 'emerald' | 'rose' | 'neutral' }) {
  const toneMap = {
    emerald: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
    rose: 'text-rose-300 bg-rose-400/10 border-rose-400/20',
    neutral: 'text-foreground bg-foreground/[0.06] border-border/60',
  };
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-b from-card to-card/40 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <div className={`flex h-6 w-6 items-center justify-center rounded-md border ${toneMap[tone]}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3 font-display text-[26px] font-semibold leading-none tracking-tight tabular-nums">
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div className="rounded-md border border-border/50 bg-background/40 py-1.5">
      <div className={`text-[13px] font-semibold tabular-nums ${danger ? 'text-rose-400' : ''}`}>{value}</div>
      <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
    </div>
  );
}
