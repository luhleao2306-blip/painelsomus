import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, ArrowRight } from 'lucide-react';

type Goal = {
  id: string;
  month: number;
  year: number;
  individual_goal_amount: number;
  individual_result_amount: number;
  status: string;
  notes: string | null;
};

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export function MyGoalWidget({ userId }: { userId: string }) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const now = new Date();
    supabase
      .from('seller_monthly_goals')
      .select('id, month, year, individual_goal_amount, individual_result_amount, status, notes')
      .eq('seller_id', userId)
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear())
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setGoal({
            ...data,
            individual_goal_amount: Number(data.individual_goal_amount) || 0,
            individual_result_amount: Number(data.individual_result_amount) || 0,
          });
        }
        setLoading(false);
      });
  }, [userId]);

  if (loading || !goal) return null;

  const pct = goal.individual_goal_amount > 0
    ? Math.min(100, Math.round((goal.individual_result_amount / goal.individual_goal_amount) * 100))
    : 0;
  const gap = goal.individual_goal_amount - goal.individual_result_amount;

  return (
    <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-cyan-950/20 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-600" />
          Minha meta de {MONTH_NAMES[goal.month - 1]}
        </CardTitle>
        <Link to="/comercial/metas" className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          ver detalhes <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Realizado</div>
            <div className="text-2xl font-bold">{BRL(goal.individual_result_amount)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Meta</div>
            <div className="text-lg font-semibold">{BRL(goal.individual_goal_amount)}</div>
          </div>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="flex items-center justify-between mt-2 text-[11px]">
          <Badge variant={pct >= 100 ? 'default' : 'secondary'} className="font-bold">
            {pct}% atingido
          </Badge>
          <span className="text-muted-foreground">
            {gap > 0 ? `Faltam ${BRL(gap)}` : `Meta batida! +${BRL(-gap)}`}
          </span>
        </div>
        {goal.notes && (
          <p className="text-[11px] text-muted-foreground mt-2 italic line-clamp-2">{goal.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
