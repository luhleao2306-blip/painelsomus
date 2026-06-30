import { createFileRoute } from '@tanstack/react-router';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRedemptions, useUpdateRedemption, useGamificationProfiles, canUserAward } from '@/lib/gamificacao-store';
import { useProfile } from '@/hooks/use-profile';
import { Gift, Check, X, Truck } from 'lucide-react';

export const Route = createFileRoute('/gamificacao/resgates')({
  component: Resgates,
});

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', approved: 'Aprovado', rejected: 'Recusado', delivered: 'Entregue',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-900',
  approved: 'bg-blue-100 text-blue-900',
  rejected: 'bg-red-100 text-red-900',
  delivered: 'bg-green-100 text-green-900',
};

function Resgates() {
  const { profile, role } = useProfile();
  const isSuperAdmin = canUserAward(profile?.email, role);
  const { data: redemptions = [] } = useRedemptions();
  const { data: profiles = [] } = useGamificationProfiles();
  const update = useUpdateRedemption();

  const userName = (id: string) => profiles.find(p => p.user_id === id)?.full_name ?? 'Colaborador';

  return (
    <div className="space-y-3">
      {redemptions.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum resgate ainda.</Card>
      )}
      {redemptions.map(r => (
        <Card key={r.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{(r as any).reward?.name ?? 'Prêmio'}</p>
                <p className="text-xs text-muted-foreground">
                  {userName(r.user_id)} · {new Date(r.requested_at).toLocaleString('pt-BR')}
                </p>
                {r.notes && <p className="mt-1 text-xs italic">"{r.notes}"</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status]}</Badge>
              <p className="text-sm font-bold text-primary">{r.stars_cost} ⭐</p>
            </div>
          </div>

          {isSuperAdmin && r.status === 'pending' && (
            <div className="mt-3 flex gap-2 border-t pt-3">
              <Button size="sm" variant="default" onClick={() => update.mutate({ id: r.id, status: 'approved', stars_cost: r.stars_cost, user_id: r.user_id })}>
                <Check className="mr-1 h-3.5 w-3.5" /> Aprovar
              </Button>
              <Button size="sm" variant="outline" onClick={() => update.mutate({ id: r.id, status: 'rejected' })}>
                <X className="mr-1 h-3.5 w-3.5" /> Recusar
              </Button>
            </div>
          )}
          {isSuperAdmin && r.status === 'approved' && (
            <div className="mt-3 flex gap-2 border-t pt-3">
              <Button size="sm" variant="default" onClick={() => update.mutate({ id: r.id, status: 'delivered' })}>
                <Truck className="mr-1 h-3.5 w-3.5" /> Marcar entregue
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
