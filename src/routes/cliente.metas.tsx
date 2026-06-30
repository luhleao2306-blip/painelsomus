import { createFileRoute } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { useStrategicGoals } from '@/lib/client-portal-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/design-system/DesignSystem';
import { Target } from 'lucide-react';

export const Route = createFileRoute('/cliente/metas')({ component: MetasPage });

const STATUS_LABEL: Record<string, string> = {
  on_track: 'No ritmo',
  at_risk: 'Em risco',
  achieved: 'Atingida',
  missed: 'Não atingida',
};
const STATUS_COLOR: Record<string, string> = {
  on_track: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
  at_risk: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
  achieved: 'bg-primary/15 text-primary border-primary/30',
  missed: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300',
};

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('pt-BR');
}

function MetasPage() {
  const { data: goals = [], isLoading } = useStrategicGoals();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-1 pb-2 border-b border-border/40">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Estratégia</span>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Metas Estratégicas</h1>
          <p className="text-sm text-muted-foreground">As metas que estamos perseguindo juntos com a Somus.</p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : goals.length === 0 ? (
          <EmptyState icon={Target} title="Sem metas cadastradas" description="A equipe Somus ainda não definiu metas estratégicas." />
        ) : (
          (() => {
            const groups: { key: 'estrategica' | 'operacional' | 'economica'; label: string }[] = [
              { key: 'estrategica', label: 'Metas Estratégicas' },
              { key: 'operacional', label: 'Metas Operacionais' },
              { key: 'economica', label: 'Metas Econômicas' },
            ];
            return (
              <div className="space-y-8">
                {groups.map(grp => {
                  const list = goals.filter(g => (g.category ?? 'estrategica') === grp.key);
                  if (list.length === 0) return null;
                  return (
                    <section key={grp.key} className="space-y-3">
                      <h2 className="font-display text-xl font-semibold tracking-tight">{grp.label}</h2>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {list.map(g => {
                          const target = Number(g.target_value ?? 0);
                          const current = Number(g.current_value ?? 0);
                          const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
                          return (
                            <Card key={g.id} className="border-border/50">
                              <CardContent className="p-5 space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <h3 className="font-display font-semibold text-lg leading-tight">{g.title}</h3>
                                    {g.metric && <p className="text-xs text-muted-foreground mt-0.5">{g.metric}</p>}
                                  </div>
                                  <Badge className={STATUS_COLOR[g.status] ?? ''}>{STATUS_LABEL[g.status] ?? g.status}</Badge>
                                </div>
                                {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}

                                {target > 0 && (
                                  <div>
                                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider mb-1.5 text-muted-foreground">
                                      <span>Progresso</span>
                                      <span className="text-foreground">{current.toLocaleString('pt-BR')} / {target.toLocaleString('pt-BR')} {g.unit ?? ''}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1 text-right">{pct}%</p>
                                  </div>
                                )}

                                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                                  <span>Início: <strong className="text-foreground">{fmtDate(g.period_start)}</strong></span>
                                  <span>Fim: <strong className="text-foreground">{fmtDate(g.period_end)}</strong></span>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            );
          })()
        )}

      </div>
    </MainLayout>
  );
}
