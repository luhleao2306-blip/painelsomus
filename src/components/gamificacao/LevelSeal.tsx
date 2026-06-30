import { LEVELS } from '@/lib/gamificacao-store';
import {
  PawPrint, Footprints, Dumbbell, Hammer, Target, Shield,
  Swords, Eye, Star, Crown, Sparkles, Flame,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Theme = {
  icon: LucideIcon;
  /** Gradiente do selo (from → to). */
  gradient: string;
  /** Cor da borda externa. */
  ring: string;
  /** Cor do texto/ícone. */
  fg: string;
};

// 12 temas, alinhados aos 12 níveis (índice 0..11). Cada nível tem
// identidade visual própria — cor, ícone e tom.
const THEMES: Theme[] = [
  // 1 — Colaborador
  { icon: PawPrint,   gradient: 'from-slate-300 to-slate-500',     ring: 'ring-slate-200',   fg: 'text-white' },
  // 2 — Lobo Aprendiz
  { icon: Footprints, gradient: 'from-stone-400 to-stone-600',     ring: 'ring-stone-200',   fg: 'text-white' },
  // 3 — Lobo em Treinamento
  { icon: Dumbbell,   gradient: 'from-amber-500 to-amber-700',     ring: 'ring-amber-200',   fg: 'text-white' },
  // 4 — Lobo Executor
  { icon: Hammer,     gradient: 'from-orange-500 to-red-600',      ring: 'ring-orange-200',  fg: 'text-white' },
  // 5 — Lobo Caçador
  { icon: Target,     gradient: 'from-red-500 to-rose-700',        ring: 'ring-rose-200',    fg: 'text-white' },
  // 6 — Lobo Veterano
  { icon: Shield,     gradient: 'from-emerald-500 to-emerald-700', ring: 'ring-emerald-200', fg: 'text-white' },
  // 7 — Lobo de Elite
  { icon: Swords,     gradient: 'from-teal-500 to-cyan-700',       ring: 'ring-teal-200',    fg: 'text-white' },
  // 8 — Lobo Sentinela
  { icon: Eye,        gradient: 'from-sky-500 to-blue-700',        ring: 'ring-sky-200',     fg: 'text-white' },
  // 9 — Lobo Beta
  { icon: Star,       gradient: 'from-indigo-500 to-violet-700',   ring: 'ring-indigo-200',  fg: 'text-white' },
  // 10 — Lobo Alfa
  { icon: Crown,      gradient: 'from-fuchsia-500 to-purple-700',  ring: 'ring-fuchsia-200', fg: 'text-white' },
  // 11 — Lobo Mítico
  { icon: Sparkles,   gradient: 'from-pink-500 via-rose-500 to-amber-500', ring: 'ring-pink-200', fg: 'text-white' },
  // 12 — Lenda da Alcateia
  { icon: Flame,      gradient: 'from-yellow-400 via-amber-500 to-red-600', ring: 'ring-amber-300', fg: 'text-white' },
];

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

const SIZE = {
  xs: { box: 'h-8 w-8',  ic: 'h-3.5 w-3.5', num: 'text-[8px]'  },
  sm: { box: 'h-10 w-10', ic: 'h-4 w-4',     num: 'text-[9px]'  },
  md: { box: 'h-16 w-16', ic: 'h-6 w-6',     num: 'text-[11px]' },
  lg: { box: 'h-24 w-24', ic: 'h-9 w-9',     num: 'text-sm'     },
} as const;

export function getLevelTheme(levelName?: string | null) {
  const idx = Math.max(0, LEVELS.findIndex(l => l.name === levelName));
  return { theme: THEMES[idx] ?? THEMES[0], index: idx, roman: ROMAN[idx] ?? `${idx + 1}` };
}

export function LevelSeal({
  levelName,
  size = 'md',
  showLabel = false,
  className = '',
}: {
  levelName?: string | null;
  size?: keyof typeof SIZE;
  showLabel?: boolean;
  className?: string;
}) {
  const { theme, roman } = getLevelTheme(levelName);
  const Icon = theme.icon;
  const s = SIZE[size];
  const label = levelName || LEVELS[0].name;

  return (
    <div className={`inline-flex flex-col items-center gap-1.5 ${className}`}>
      <div className={`relative ${s.box}`}>
        {/* Halo externo */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${theme.gradient} opacity-30 blur-md`} />
        {/* Selo */}
        <div
          className={`relative ${s.box} rounded-full bg-gradient-to-br ${theme.gradient} ${theme.fg}
                      flex items-center justify-center shadow-lg ring-2 ${theme.ring} ring-offset-2 ring-offset-background`}
          style={{
            clipPath:
              'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
          }}
        >
          <Icon className={s.ic} />
        </div>
        {/* Numeral */}
        <span
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-background px-1.5 py-0.5
                      font-bold tracking-wider text-foreground shadow ${s.num} border border-border`}
        >
          {roman}
        </span>
      </div>
      {showLabel && (
        <p className="text-center text-xs font-semibold leading-tight">{label}</p>
      )}
    </div>
  );
}
