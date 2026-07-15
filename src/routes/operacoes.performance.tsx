import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useOpStore, CARGO_COLOR_MAP } from '@/lib/operacoes-store';
import { Crown, Megaphone, Brush, Diamond, Bot, Zap, Rocket, Star } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export const Route = createFileRoute('/operacoes/performance')({
  component: OperacoesPerformance,
});

const ICONS = { crown: Crown, megaphone: Megaphone, brush: Brush, diamond: Diamond, bot: Bot, zap: Zap, rocket: Rocket, star: Star };

function OperacoesPerformance() {
  const store = useOpStore();
  const [period, setPeriod] = useState<'semana' | 'mes' | 'trimestre'>('mes');

  const stats = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    if (period === 'semana') cutoff.setDate(now.getDate() - 7);
    else if (period === 'mes') cutoff.setMonth(now.getMonth() - 1);
    else cutoff.setMonth(now.getMonth() - 3);

    return store.users.map(u => {
      const mine = store.tasks.filter(t => t.assigneeId === u.id);
      const concluidas = mine.filter(t => t.status === 'concluido');
      const atrasadas = mine.filter(t => t.dueDate && t.status !== 'concluido' && new Date(t.dueDate) < now);
      const abertas = mine.filter(t => t.status !== 'concluido');
      const noPrazo = concluidas.filter(t => t.dueDate && new Date(t.dueDate) >= new Date(t.startDate ?? t.dueDate)).length;
      const taxa = concluidas.length > 0 ? Math.round((noPrazo / concluidas.length) * 100) : 0;
      return { user: u, concluidas: concluidas.length, atrasadas: atrasadas.length, abertas: abertas.length, taxa };
    }).sort((a, b) => b.abertas - a.abertas);
  }, [store, period]);

  const maxOpen = Math.max(1, ...stats.map(s => s.abertas));

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Performance do Time</h1>
          <p className="text-sm text-muted-foreground">Visão por pessoa: entregas, atrasos e carga atual.</p>
        </div>
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="semana">Semana</SelectItem>
            <SelectItem value="mes">Mês</SelectItem>
            <SelectItem value="trimestre">Trimestre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="hidden grid-cols-[minmax(220px,2fr)_1fr_1fr_1fr_1fr_1.5fr] gap-3 border-b border-border/60 bg-muted/20 px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
          <span>Colaborador</span>
          <span>Concluídas</span>
          <span>Em atraso</span>
          <span>Abertas</span>
          <span>No prazo</span>
          <span>Carga atual</span>
        </div>
        {stats.map(row => {
          const cargo = store.cargos.find(c => c.id === row.user.cargoId);
          const Icon = cargo ? ICONS[cargo.icon] : Star;
          return (
            <div key={row.user.id} className="grid grid-cols-1 items-center gap-2 border-b border-border/60 px-4 py-3 sm:grid-cols-[minmax(220px,2fr)_1fr_1fr_1fr_1fr_1.5fr] sm:gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
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
              <span className="text-[13px] font-medium">{row.concluidas}</span>
              <span className={`text-[13px] font-medium ${row.atrasadas > 0 ? 'text-red-600' : ''}`}>{row.atrasadas}</span>
              <span className="text-[13px] font-medium">{row.abertas}</span>
              <span className="text-[13px] font-medium">{row.taxa}%</span>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${(row.abertas / maxOpen) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
