import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useGamificationProfiles, useLeaderStars, usePoints, useUserPins, useMissions, useRedemptions,
  useRewards, useMyGamificationProfile,
  MOTIVATIONAL_PHRASES, LEADER_CATEGORY_LABELS, RARITY_COLORS, RARITY_LABELS, LEVELS,
  POINTS_LABEL, getLevelInfo,
} from '@/lib/gamificacao-store';
import { LevelSeal } from '@/components/gamificacao/LevelSeal';
import { Sparkles, Trophy, Target, Gift, TrendingUp, Crown, Flame, ArrowRight } from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';

export const Route = createFileRoute('/gamificacao/')({
  component: DashboardAlcateia,
});

function DashboardAlcateia() {
  const { profile } = useProfile();
  const { data: profiles = [] } = useGamificationProfiles();
  const { data: leaderStars = [] } = useLeaderStars();
  const { data: points = [] } = usePoints();
  const { data: userPins = [] } = useUserPins();
  const { data: missions = [] } = useMissions();
  const { data: redemptions = [] } = useRedemptions();
  const { data: rewards = [] } = useRewards();
  const { data: myProfile } = useMyGamificationProfile(profile?.id);

  const startOfMonth = useMemo(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const starsThisMonth = points
    .filter(p => new Date(p.created_at) >= startOfMonth && p.points_amount > 0)
    .reduce((s, p) => s + p.points_amount, 0);
  const totalTeamStars = profiles.reduce((s, p) => s + p.total_stars, 0);
  const top5 = profiles.slice(0, 5);
  const champion = profiles[0];
  const missionsDone = missions.filter(m => m.status === 'completed').length;
  const rewardsRedeemed = redemptions.filter(r => r.status === 'delivered').length;

  const phrase = MOTIVATIONAL_PHRASES[new Date().getDate() % MOTIVATIONAL_PHRASES.length];
  const recentLeader = leaderStars.slice(0, 5);
  const myStars = myProfile?.total_stars ?? 0;
  const myLevel = getLevelInfo((myProfile as any)?.current_level);
  const topRewards = rewards.filter(r => r.is_available).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Frase motivacional */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
        <Flame className="absolute right-6 top-6 h-8 w-8 text-primary/30" />
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">A alcateia</p>
        <p className="mt-1 font-display text-2xl font-semibold tracking-tight">{phrase}</p>
      </div>

      {/* Meu status — sempre visível */}
      {profile && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <LevelSeal levelName={myLevel.current.name} size="lg" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seu lugar na alcateia</p>
                  <p className="mt-1 font-display text-2xl font-semibold">{myLevel.current.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {myStars} {POINTS_LABEL} acumulados · nível definido pelo Super Admin
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-primary">
                <Flame className="h-7 w-7 fill-current" />
                <span className="font-display text-4xl font-bold">{myStars}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trilha de Níveis — selos visuais, sem pontos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Trilha do Lobo</CardTitle>
          <Badge variant="secondary">{LEVELS.length} selos</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-3 sm:grid-cols-4 md:grid-cols-6">
            {LEVELS.map((lvl, i) => {
              const isCurrent = myLevel.current.name === lvl.name;
              return (
                <div
                  key={lvl.name}
                  className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${
                    isCurrent
                      ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/30'
                      : 'border-dashed border-border bg-card hover:border-border'
                  }`}
                >
                  <span className={`text-[10px] font-bold tracking-widest ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                    NÍVEL {i + 1}
                  </span>
                  <LevelSeal levelName={lvl.name} size="md" />
                  <p className="text-center font-display text-xs font-semibold leading-tight">{lvl.name}</p>
                  {isCurrent && <Badge className="bg-primary text-primary-foreground text-[10px]">Você</Badge>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPI icon={<Flame className="h-4 w-4" />} label={`${POINTS_LABEL} no mês`} value={starsThisMonth} />
        <KPI icon={<Trophy className="h-4 w-4" />} label="Acumulados (time)" value={totalTeamStars} />
        <KPI icon={<Target className="h-4 w-4" />} label="Missões concluídas" value={missionsDone} />
        <KPI icon={<Gift className="h-4 w-4" />} label="Prêmios entregues" value={rewardsRedeemed} />
        <KPI icon={<Sparkles className="h-4 w-4" />} label="Pins desbloqueados (time)" value={userPins.length} />
        <KPI icon={<TrendingUp className="h-4 w-4" />} label="Lobos ativos" value={profiles.length} />
        <KPI icon={<Crown className="h-4 w-4" />} label="Estrelas do Líder" value={leaderStars.length} />
        <KPI icon={<Gift className="h-4 w-4" />} label="Prêmios na loja" value={rewards.filter(r => r.is_available).length} />
      </div>

      {/* Vitrine de prêmios — sempre visível */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Vitrine de Prêmios</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Troque seus {POINTS_LABEL} por reconhecimento real.</p>
          </div>
          <Link to="/gamificacao/loja" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            Ver loja completa <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {topRewards.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum prêmio cadastrado ainda.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {topRewards.map(r => {
                const canAfford = myStars >= r.stars_cost;
                return (
                  <Link
                    key={r.id}
                    to="/gamificacao/loja"
                    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-md"
                  >
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.name} className="h-24 w-full object-cover" />
                    ) : (
                      <div className="flex h-24 items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <Gift className="h-8 w-8 text-primary/60" />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-3">
                      <p className="line-clamp-1 text-sm font-semibold group-hover:text-primary">{r.name}</p>
                      <p className="mt-auto flex items-center gap-1 pt-2 text-sm font-bold text-primary">
                        <Flame className="h-3.5 w-3.5 fill-current" />{r.stars_cost}
                        {canAfford && <Badge variant="outline" className="ml-auto border-green-300 bg-green-50 text-[10px] text-green-700">Pode trocar</Badge>}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top + destaque */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Top 5 da Alcateia</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {top5.length === 0 && <p className="text-sm text-muted-foreground">Nenhum lobo pontuou ainda.</p>}
            {top5.map((p, i) => (
              <div key={p.user_id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground">{p.current_level}</p>
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                  <Flame className="h-3.5 w-3.5 fill-current" /> {p.total_stars}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Destaque do mês</CardTitle></CardHeader>
          <CardContent>
            {champion ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
                <Crown className="mx-auto mb-2 h-8 w-8 text-primary" />
                <p className="font-display text-xl font-semibold">{champion.full_name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{champion.current_level}</p>
                <p className="mt-3 text-3xl font-bold text-primary">{champion.total_stars}</p>
                <p className="text-xs text-muted-foreground">{POINTS_LABEL}</p>
              </div>
            ) : <p className="text-sm text-muted-foreground">Sem dados ainda.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Estrelas do líder */}
      <Card>
        <CardHeader><CardTitle className="text-base">Últimas Estrelas do Líder</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {recentLeader.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma estrela concedida ainda.</p>}
          {recentLeader.map(ls => {
            const target = profiles.find(p => p.user_id === ls.user_id);
            return (
              <div key={ls.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{target?.full_name ?? 'Colaborador'}</p>
                  <Badge variant="outline" className={RARITY_COLORS[ls.rarity]}>{RARITY_LABELS[ls.rarity]}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{LEADER_CATEGORY_LABELS[ls.category]} · +{ls.bonus_stars} {POINTS_LABEL_SHORT}</p>
                {ls.public_message && <p className="mt-1 text-xs italic">"{ls.public_message}"</p>}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

const POINTS_LABEL_SHORT = 'pts';
function POINTS_LABEL_SHORT_FOR(lvl: { name: string }) {
  return POINTS_LABEL_SHORT;
}

function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
