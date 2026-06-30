import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cake } from 'lucide-react';

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function daysUntilBirthday(birthday: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [, m, d] = birthday.split('-').map(Number);
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

export function ClientBirthdaysCard() {
  const { clients } = useData();

  const upcoming = useMemo(() => {
    return clients
      .filter(c => !!c.birthday)
      .map(c => ({ client: c, days: daysUntilBirthday(c.birthday!) }))
      .filter(x => x.days <= 60)
      .sort((a, b) => a.days - b.days);
  }, [clients]);

  if (upcoming.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Cake className="h-4 w-4" /> Aniversários dos Clientes (próximos 60 dias)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {upcoming.map(({ client, days }) => {
            const [, m, d] = client.birthday!.split('-').map(Number);
            return (
              <Badge key={client.id} variant={days <= 7 ? 'default' : 'secondary'} className="gap-1">
                <span className="font-medium">{client.name}</span>
                <span className="opacity-80">— {String(d).padStart(2, '0')}/{MONTHS_PT[m - 1]}</span>
                <span className="opacity-60">({days === 0 ? 'hoje' : `${days}d`})</span>
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
