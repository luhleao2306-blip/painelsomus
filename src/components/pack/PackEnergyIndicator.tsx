import { usePackMood } from '@/hooks/use-pack-mood';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Flame } from 'lucide-react';

function barColor(v: number) {
  if (v >= 80) return 'bg-gradient-to-r from-emerald-500 to-emerald-400';
  if (v >= 60) return 'bg-gradient-to-r from-lime-500 to-emerald-400';
  if (v >= 40) return 'bg-gradient-to-r from-amber-500 to-lime-400';
  if (v >= 20) return 'bg-gradient-to-r from-orange-500 to-amber-400';
  return 'bg-gradient-to-r from-rose-600 to-orange-500';
}

export function PackEnergyIndicator() {
  const { energy, packMembers, todayMoods, loading } = usePackMood();
  if (loading || packMembers.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="hidden md:flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 hover:bg-muted/60 transition-colors"
          title="Energia da Alcateia"
        >
          <span className="text-base leading-none">🐺</span>
          <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className={`absolute inset-y-0 left-0 ${barColor(energy)} transition-all duration-500`}
              style={{ width: `${energy}%` }}
            />
          </div>
          <span className="text-[11px] font-bold tabular-nums text-foreground flex items-center gap-0.5">
            <Flame className="h-3 w-3 text-orange-500" />
            {energy}%
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Energia da Alcateia</p>
          <p className="text-sm">
            <span className="text-2xl font-black">{energy}%</span>
            <span className="text-xs text-muted-foreground ml-2">{todayMoods.length}/{packMembers.length} lobos</span>
          </p>
          <p className="text-xs text-muted-foreground italic">
            "Sozinho o lobo é forte, junto a alcateia é invencível."
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
