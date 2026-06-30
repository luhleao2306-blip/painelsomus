import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePackMood, Mood } from '@/hooks/use-pack-mood';
import { Flame } from 'lucide-react';

const FACE: Record<Mood, string> = { feliz: '😄', neutro: '😐', triste: '😢' };
const LABEL: Record<Mood, string> = { feliz: 'Feliz', neutro: 'Neutro', triste: 'Triste' };

function energyColor(v: number) {
  if (v >= 80) return 'from-emerald-500 to-emerald-400';
  if (v >= 60) return 'from-lime-500 to-emerald-400';
  if (v >= 40) return 'from-amber-500 to-lime-400';
  if (v >= 20) return 'from-orange-500 to-amber-400';
  return 'from-rose-600 to-orange-500';
}

function energyLabel(v: number) {
  if (v >= 80) return 'Alcateia em chamas';
  if (v >= 60) return 'Alcateia forte';
  if (v >= 40) return 'Alcateia em rota';
  if (v >= 20) return 'Alcateia precisa de você';
  return 'Alcateia precisa se reunir';
}

export function PackEnergyCard() {
  const { energy, packMembers, todayMoods, myMoodToday, setMood, loading } = usePackMood();

  if (loading && packMembers.length === 0) return null;

  const checkedIn = todayMoods.length;
  const total = packMembers.length;
  const counts = todayMoods.reduce<Record<Mood, number>>(
    (acc, m) => { acc[m.mood] = (acc[m.mood] || 0) + 1; return acc; },
    { feliz: 0, neutro: 0, triste: 0 }
  );

  return (
    <Card className="border-slate-700/40 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white shadow-lg">
      <CardContent className="p-5 md:p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 text-3xl">🐺</div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">Energia da Alcateia</p>
            <h3 className="text-xl font-bold leading-tight mt-0.5">{energyLabel(energy)}</h3>
            <p className="text-xs text-white/60 mt-1">
              {checkedIn} de {total} lobos marcaram presença hoje
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1.5 text-3xl font-black">
              <Flame className="h-6 w-6 text-orange-400" />
              {energy}%
            </div>
          </div>
        </div>

        {/* Barra de energia */}
        <div className="space-y-2">
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-800 border border-white/10">
            <div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r ${energyColor(energy)} transition-all duration-700 ease-out shadow-[0_0_20px_rgba(251,146,60,0.5)]`}
              style={{ width: `${energy}%` }}
            />
            <div className="absolute inset-0 flex">
              {[20, 40, 60, 80].map(t => (
                <div key={t} className="border-r border-white/10" style={{ width: '20%' }} />
              ))}
            </div>
          </div>
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-white/40 font-bold">
            <span>Uivo baixo</span><span>Caçando</span><span>Em chamas</span>
          </div>
        </div>

        {/* Breakdown + meu humor */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="flex gap-2 flex-wrap">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-none">😄 {counts.feliz}</Badge>
            <Badge className="bg-amber-500/20 text-amber-300 border-none">😐 {counts.neutro}</Badge>
            <Badge className="bg-rose-500/20 text-rose-300 border-none">😢 {counts.triste}</Badge>
            <Badge variant="secondary" className="bg-white/10 text-white/70 border-none">— {Math.max(0, total - checkedIn)} sem registro</Badge>
          </div>

          {myMoodToday ? (
            <div className="flex items-center gap-2 text-xs text-white/80">
              <span>Seu uivo de hoje:</span>
              <span className="text-lg">{FACE[myMoodToday]}</span>
              <span className="font-semibold">{LABEL[myMoodToday]}</span>
            </div>
          ) : (
            <div className="flex gap-1.5">
              {(['feliz', 'neutro', 'triste'] as Mood[]).map(m => (
                <Button
                  key={m}
                  size="sm"
                  variant="ghost"
                  onClick={() => setMood(m)}
                  className="h-8 w-8 p-0 text-lg bg-white/5 hover:bg-white/15 text-white"
                  title={LABEL[m]}
                >
                  {FACE[m]}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
