import { createFileRoute } from '@tanstack/react-router';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePins, useUserPins, useMyGamificationProfile, RARITY_COLORS, RARITY_LABELS, POINTS_LABEL, getLevelInfo } from '@/lib/gamificacao-store';
import { LevelSeal } from '@/components/gamificacao/LevelSeal';
import { Lock, Award, Flame, Trophy, Star, Zap, Heart, Target, Crown, Sparkles, Shield, Swords, Compass, Moon, Sun, Eye, Footprints, Mountain, Gem, Medal, Rocket, Brain, HandHeart, Users, Anchor, Feather, Bone, Drumstick } from 'lucide-react';
import { useMemo } from 'react';
import { useProfile } from '@/hooks/use-profile';

export const Route = createFileRoute('/gamificacao/pins')({
  component: PinsConquistas,
});

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  Execução: Zap, Performance: Flame, Cultura: Heart, Liderança: Crown,
  'Estrela do Líder': Crown, Resultado: Trophy, Evolução: Rocket,
  Colaboração: Users, Consistência: Mountain, Especial: Sparkles, default: Award,
};

const PIN_ICONS: Record<string, React.ComponentType<any>> = {
  'Garra de Caçador': Swords, 'Lobo Executor': Zap, 'Missão Cumprida': Target,
  'Caçador de Prazo': Compass, 'Olhar de Predador': Eye, 'Faro de Resultado': Flame, 'Mestre da Execução': Crown,
  'Batida de Meta': Target, 'Lobo de Resultado': Trophy, 'Alta Performance': Rocket,
  'Caçador Implacável': Swords, 'Meta Devorada': Drumstick, 'Lobo Lendário': Crown,
  'Voz da Alcateia': Sparkles, 'Coração de Lobo': Heart, 'Espírito SOMUS': Sparkles,
  'Lealdade da Alcateia': Shield, 'Guardião da Cultura': Shield, 'Pilar da Cultura': Mountain,
  'Lobo Parceiro': HandHeart, 'Ombro da Alcateia': HandHeart, 'Multiplicador': Users,
  'Time Primeiro': Users, 'Construtor de Bando': Users, 'Mentor da Alcateia': Brain,
  'Pegada Constante': Footprints, 'Ritmo de Alcateia': Footprints, 'Constância Brutal': Mountain,
  'Disciplina de Ferro': Anchor, 'Lobo de Aço': Shield,
  'Lobo em Evolução': Rocket, 'Mente em Movimento': Brain, 'Mente Afiada': Brain,
  'Sangue Novo': Feather, 'Lobo Reinventado': Sparkles, 'Upgrade Desbloqueado': Rocket,
  'Madrugador': Sun, 'Primeira Caçada': Bone, 'Coruja da Alcateia': Moon,
  'Destaque da Alcateia': Star, 'Lobo Alfa da Semana': Crown, 'Salvador da Pátria': Shield,
  'Honra SOMUS': Medal, 'Jogador Caro': Gem, 'Marco Histórico': Trophy,
  'Escolhido da Alcateia': Star, 'Atitude de Dono': Crown, 'Braço Direito': Shield,
  'Coragem Rara': Flame, 'Dono da Missão': Target, 'Executor Implacável': Swords,
  'Lealdade Inabalável': Shield, 'Lobo de Confiança': HandHeart, 'Lobo que Eleva o Bando': Users,
  'Sangue de Líder': Crown, 'Lenda Viva da Alcateia': Gem,
};

function getPinIcon(pin: { name: string; category: string }): React.ComponentType<any> {
  return PIN_ICONS[pin.name] ?? CATEGORY_ICONS[pin.category] ?? CATEGORY_ICONS.default;
}

// Tema visual por pin — cor temática vinculada ao significado
// [cor topo, cor meio, cor base]
const PIN_THEMES: Record<string, [string, string, string]> = {
  // Execução — laranjas/vermelhos (ação, fogo)
  'Garra de Caçador':      ['#fb923c', '#ea580c', '#7c2d12'],
  'Lobo Executor':         ['#facc15', '#f59e0b', '#92400e'],
  'Missão Cumprida':       ['#34d399', '#059669', '#064e3b'],
  'Caçador de Prazo':      ['#22d3ee', '#0891b2', '#0c4a6e'],
  'Olhar de Predador':     ['#f87171', '#dc2626', '#7f1d1d'],
  'Faro de Resultado':     ['#fb7185', '#e11d48', '#881337'],
  'Mestre da Execução':    ['#fde047', '#f59e0b', '#78350f'],
  // Performance — vermelhos/dourados
  'Batida de Meta':        ['#fca5a5', '#ef4444', '#7f1d1d'],
  'Lobo de Resultado':     ['#fcd34d', '#d97706', '#78350f'],
  'Alta Performance':      ['#fb7185', '#be123c', '#4c0519'],
  'Caçador Implacável':    ['#f97316', '#c2410c', '#431407'],
  'Meta Devorada':         ['#dc2626', '#991b1b', '#450a0a'],
  'Lobo Lendário':         ['#fbbf24', '#b45309', '#78350f'],
  // Cultura — rosas/roxos (coração, espírito)
  'Voz da Alcateia':       ['#a78bfa', '#7c3aed', '#3b0764'],
  'Coração de Lobo':       ['#fb7185', '#e11d48', '#881337'],
  'Espírito SOMUS':        ['#f472b6', '#db2777', '#831843'],
  'Lealdade da Alcateia':  ['#818cf8', '#4338ca', '#1e1b4b'],
  'Guardião da Cultura':   ['#60a5fa', '#1d4ed8', '#172554'],
  'Pilar da Cultura':      ['#c084fc', '#7e22ce', '#3b0764'],
  // Colaboração — verdes/teals (união, parceria)
  'Lobo Parceiro':         ['#5eead4', '#0d9488', '#134e4a'],
  'Ombro da Alcateia':     ['#86efac', '#16a34a', '#14532d'],
  'Multiplicador':         ['#67e8f9', '#0891b2', '#164e63'],
  'Time Primeiro':         ['#a7f3d0', '#059669', '#064e3b'],
  'Construtor de Bando':   ['#7dd3fc', '#0284c7', '#0c4a6e'],
  'Mentor da Alcateia':    ['#fcd34d', '#f59e0b', '#78350f'],
  // Consistência — azuis/cinzas (aço, disciplina)
  'Pegada Constante':      ['#cbd5e1', '#475569', '#0f172a'],
  'Ritmo de Alcateia':     ['#94a3b8', '#334155', '#020617'],
  'Constância Brutal':     ['#a8a29e', '#57534e', '#1c1917'],
  'Disciplina de Ferro':   ['#94a3b8', '#1e293b', '#020617'],
  'Lobo de Aço':           ['#e5e7eb', '#6b7280', '#111827'],
  // Evolução — verdes/azuis (crescimento, mente)
  'Lobo em Evolução':      ['#86efac', '#22c55e', '#14532d'],
  'Mente em Movimento':    ['#93c5fd', '#2563eb', '#1e3a8a'],
  'Mente Afiada':          ['#67e8f9', '#0e7490', '#164e63'],
  'Sangue Novo':           ['#fda4af', '#f43f5e', '#881337'],
  'Lobo Reinventado':      ['#c4b5fd', '#7c3aed', '#3b0764'],
  'Upgrade Desbloqueado':  ['#5eead4', '#14b8a6', '#134e4a'],
  // Especial — únicos
  'Madrugador':            ['#fde68a', '#f59e0b', '#92400e'],
  'Primeira Caçada':       ['#fdba74', '#c2410c', '#431407'],
  'Coruja da Alcateia':    ['#a5b4fc', '#4338ca', '#1e1b4b'],
  'Destaque da Alcateia':  ['#fde047', '#eab308', '#713f12'],
  'Lobo Alfa da Semana':   ['#fbbf24', '#b45309', '#451a03'],
  'Salvador da Pátria':    ['#fca5a5', '#dc2626', '#7f1d1d'],
  'Honra SOMUS':           ['#fcd34d', '#a16207', '#422006'],
  'Jogador Caro':          ['#c4b5fd', '#9333ea', '#3b0764'],
  'Marco Histórico':       ['#f0abfc', '#a21caf', '#4a044e'],
  // Estrela do Líder — dourados/roxos régios
  'Escolhido da Alcateia': ['#e9d5ff', '#a855f7', '#581c87'],
  'Atitude de Dono':       ['#fbbf24', '#b45309', '#451a03'],
  'Braço Direito':         ['#bae6fd', '#0284c7', '#0c4a6e'],
  'Coragem Rara':          ['#fca5a5', '#dc2626', '#7f1d1d'],
  'Dono da Missão':        ['#fdba74', '#ea580c', '#7c2d12'],
  'Executor Implacável':   ['#fcd34d', '#d97706', '#78350f'],
  'Lealdade Inabalável':   ['#93c5fd', '#1d4ed8', '#172554'],
  'Lobo de Confiança':     ['#86efac', '#15803d', '#14532d'],
  'Lobo que Eleva o Bando':['#67e8f9', '#0e7490', '#164e63'],
  'Sangue de Líder':       ['#f87171', '#b91c1c', '#450a0a'],
  'Lenda Viva da Alcateia':['#f0abfc', '#7e22ce', '#3b0764'],
};

const FALLBACK_THEME_BY_RARITY: Record<string, [string, string, string]> = {
  bronze:    ['#fbbf24', '#d97706', '#78350f'],
  silver:    ['#e5e7eb', '#94a3b8', '#334155'],
  gold:      ['#fde047', '#eab308', '#713f12'],
  legendary: ['#f0abfc', '#a855f7', '#3b0764'],
};

function getPinTheme(pin: { name: string; rarity: string }): [string, string, string] {
  return PIN_THEMES[pin.name] ?? FALLBACK_THEME_BY_RARITY[pin.rarity] ?? FALLBACK_THEME_BY_RARITY.bronze;
}

function PinsConquistas() {
  const { data: pins = [] } = usePins();
  const { profile } = useProfile();
  const { data: myPinsAll = [] } = useUserPins(profile?.id);
  const { data: myProfile } = useMyGamificationProfile(profile?.id);
  const myStars = myProfile?.total_stars ?? 0;
  const myLevel = getLevelInfo((myProfile as any)?.current_level);

  const unlockedSet = useMemo(() => new Set(myPinsAll.map(p => p.pin_id)), [myPinsAll]);
  const byCategory = useMemo(() => {
    const map: Record<string, typeof pins> = {};
    for (const p of pins) (map[p.category] ||= []).push(p);
    return map;
  }, [pins]);

  // Pin mais recente / mais raro do usuário
  const myUnlockedPins = pins.filter(p => unlockedSet.has(p.id));
  const featuredPin = myUnlockedPins.sort((a, b) => {
    const order = { legendary: 4, gold: 3, silver: 2, bronze: 1 } as any;
    return (order[b.rarity] ?? 0) - (order[a.rarity] ?? 0);
  })[0];

  return (
    <div className="space-y-8">
      {/* Hero — meu pin de destaque + nível */}
      <Card className="overflow-hidden border-primary/30">
        <div className="grid gap-0 md:grid-cols-[1fr_auto]">
          <div className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Sua marca na alcateia</p>
            <div className="flex items-center gap-4">
              <LevelSeal levelName={myLevel.current.name} size="lg" />
              <div>
                <p className="font-display text-2xl font-semibold">{myLevel.current.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {myUnlockedPins.length} de {pins.length} pins · {myStars} {POINTS_LABEL}
                </p>
              </div>
            </div>
          </div>

          {featuredPin && (
            <div className="flex items-center justify-center bg-gradient-to-br from-muted/30 to-transparent p-6">
              <PinMedal pin={featuredPin} unlocked size="lg" />
            </div>
          )}
        </div>
      </Card>

      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center text-sm">
        <Sparkles className="mr-1 inline h-4 w-4 text-primary" />
        Cada pin é uma marca permanente da sua trajetória. Conquiste, exiba e inspire a alcateia.
      </div>

      {Object.entries(byCategory).map(([cat, list]) => {
        const Icon = CATEGORY_ICONS[cat] ?? CATEGORY_ICONS.default;
        const unlockedInCat = list.filter(p => unlockedSet.has(p.id)).length;
        return (
          <section key={cat}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-lg font-semibold">{cat}</h2>
                <p className="text-xs text-muted-foreground">{unlockedInCat} de {list.length} desbloqueados</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map(pin => (
                <PinCard key={pin.id} pin={pin} unlocked={unlockedSet.has(pin.id)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function pinSeed(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

function PinMedal({ pin, unlocked, size = 'md' }: { pin: any; unlocked: boolean; size?: 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-28 w-28' : 'h-20 w-20';
  const iconDim = size === 'lg' ? 'h-11 w-11' : 'h-8 w-8';
  const [c1, c2, c3] = getPinTheme(pin);
  const Icon = getPinIcon(pin);
  const halo = c2;
  const seed = pinSeed(pin.name);
  const facet = seed % 5;
  const orbitCount = 3 + (seed % 4);
  const isLegendary = pin.rarity === 'legendary';
  const isGold = pin.rarity === 'gold';

  // raios decorativos para gold/legendary
  const rays = isLegendary ? 12 : isGold ? 8 : 0;

  return (
    <div className={`relative ${dim} ${unlocked ? '' : 'opacity-90'}`}>
      {/* halo de cor — identidade única, visível mesmo bloqueado */}
      <div
        className="absolute -inset-2 rounded-full opacity-70 blur-xl"
        style={{ background: `radial-gradient(circle, ${halo} 0%, transparent 70%)` }}
      />

      {/* pequenas joias orbitais dão uma assinatura diferente para cada pin */}
      {Array.from({ length: orbitCount }).map((_, i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full shadow-sm"
          style={{
            transform: `rotate(${(360 / orbitCount) * i + (seed % 45)}deg) translate(${size === 'lg' ? 58 : 42}px)`,
            background: i % 2 === 0 ? c1 : c2,
            boxShadow: `0 0 10px ${i % 2 === 0 ? c1 : c2}`,
          }}
        />
      ))}

      {/* raios para raridades altas */}
      {rays > 0 && unlocked && (
        <div className="absolute inset-0">
          {Array.from({ length: rays }).map((_, i) => (
            <div
              key={i}
              className={`absolute left-1/2 top-1/2 h-[3px] origin-left ${isLegendary ? 'w-[60%]' : 'w-[55%]'} -translate-y-1/2 rounded-full opacity-60`}
              style={{ transform: `translateY(-50%) rotate(${(360 / rays) * i}deg)`, background: `linear-gradient(to right, ${c1}, transparent)` }}
            />
          ))}
        </div>
      )}

      {/* anel externo (moldura) */}
      <div
        className="absolute inset-0 rounded-full p-[2px] shadow-lg"
        style={{
          background: `conic-gradient(from 0deg, ${c1}, #ffffff80, ${c2}, ${c1})`,
          boxShadow: `0 8px 24px -8px ${c2}80`,
        }}
      >
        {/* corpo da medalha — gradiente temático */}
        <div
          className="relative h-full w-full rounded-full flex items-center justify-center overflow-hidden"
            style={{
              background: `radial-gradient(circle at 30% 22%, #ffffffcc 0 7%, transparent 18%), linear-gradient(135deg, ${c1} 0%, ${c2} 52%, ${c3} 100%)`,
            }}
        >
          {/* faixas e facetas — cada pin ganha composição própria */}
          <div
            className="absolute inset-0 opacity-55"
            style={{
              background: facet === 0
                ? `repeating-conic-gradient(from ${seed % 90}deg, transparent 0 12deg, #ffffff55 12deg 17deg)`
                : facet === 1
                  ? `linear-gradient(${25 + (seed % 90)}deg, transparent 0 35%, #ffffff66 36% 45%, transparent 46% 100%)`
                  : facet === 2
                    ? `radial-gradient(circle at 70% 70%, #ffffff70 0 12%, transparent 13% 100%)`
                    : facet === 3
                      ? `repeating-linear-gradient(${seed % 180}deg, transparent 0 9px, #ffffff40 10px 12px)`
                      : `conic-gradient(from ${seed % 180}deg, transparent, #ffffff55, transparent, #00000022, transparent)`,
            }}
          />
          <div className="absolute inset-[13%] rotate-45 border border-white/35" />
          <div className="absolute inset-[23%] rounded-full bg-background/15 blur-[1px]" />
          {/* brilho superior */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 via-transparent to-black/20" />
          {/* anel interno decorativo */}
          <div className="absolute inset-[5px] rounded-full ring-1 ring-inset ring-white/50" />
          <div className="absolute inset-[9px] rounded-full ring-1 ring-inset ring-white/20" />
          {/* ícone */}
          <Icon className={`${iconDim} relative text-white drop-shadow-lg`} strokeWidth={2.5} />
          {/* sparkle pra legendary */}
          {isLegendary && unlocked && (
            <Sparkles className="absolute right-1 top-1 h-3 w-3 text-white/90 animate-pulse" />
          )}
        </div>
      </div>

      {/* badge de raridade flutuante (md tem dot menor) */}
      {unlocked && (isGold || isLegendary) && (
        <div
          className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full border-2 border-background px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white shadow`}
          style={{ background: halo }}
        >
          {isLegendary ? '★' : '◆'}
        </div>
      )}

      {/* lock overlay */}
      {!unlocked && (
        <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted shadow">
          <Lock className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}


function PinCard({ pin, unlocked }: { pin: any; unlocked: boolean }) {
  const [c1, c2, c3] = getPinTheme(pin);
  return (
    <Card className="relative overflow-hidden p-5 transition-all hover:scale-[1.02] hover:shadow-lg">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-25 blur-xl" style={{ background: c2 }} />
      <div className="absolute -left-10 bottom-0 h-24 w-24 rounded-full opacity-15 blur-2xl" style={{ background: c1 }} />
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${c1}, ${c2}, ${c3})` }} />
      <div className="relative flex flex-col items-center text-center">
        <PinMedal pin={pin} unlocked={unlocked} size="md" />
        <Badge variant="outline" className={`mt-3 ${RARITY_COLORS[pin.rarity as keyof typeof RARITY_COLORS]} text-[10px]`}>
          {RARITY_LABELS[pin.rarity as keyof typeof RARITY_LABELS]}
        </Badge>
        <p className="mt-2 font-semibold">{pin.name}</p>
        {pin.description && <p className="mt-1 text-xs text-muted-foreground">{pin.description}</p>}
        {pin.unlock_criteria && (
          <p className="mt-2 text-[11px] italic text-muted-foreground">📌 {pin.unlock_criteria}</p>
        )}
        {!unlocked && (
          <p className="mt-2 text-[11px] font-medium text-muted-foreground">
            <Lock className="mr-0.5 inline h-3 w-3" />
            Concedido pelo líder por meritocracia
          </p>
        )}
      </div>
    </Card>
  );
}
