import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import {
  Gift, Plus, Sparkles, Star, Crown, Zap, Coffee, Pizza, Utensils, Cake, Beef,
  Headphones, Mouse, Keyboard, Laptop, Cpu, Sun, Scissors, Car, GraduationCap, Calendar,
  Pin, Shirt, Trophy, User, Award, Plane, Mountain, Flame, Ticket, Rocket, ShoppingBag,
  Lock, ImagePlus, Loader2,
} from 'lucide-react';
import { useRewards, useCreateReward, useRequestRedemption, useMyGamificationProfile, canUserAward } from '@/lib/gamificacao-store';
import { useProfile } from '@/hooks/use-profile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/gamificacao/loja')({
  component: Loja,
});

// Moeda da loja — sempre "Estrelas da Alcateia"
const CURRENCY_LABEL = 'Estrelas da Alcateia';
const CURRENCY_SHORT = 'estrelas';

// Ordem visual das categorias
const CATEGORY_ORDER = [
  'Recompensas rápidas',
  'Comida e restaurantes',
  'Cinema e lazer',
  'Moda e estilo',
  'Tecnologia e setup',
  'Saúde e autocuidado',
  'Benefícios pessoais',
  'Experiências premium',
  'Prêmios lendários',
];

// Tema visual por categoria (alinhado à identidade SOMUS — azul/branco com acentos)
type CatTheme = { icon: React.ComponentType<any>; from: string; to: string; tag: string };
const CATEGORY_THEME: Record<string, CatTheme> = {
  'Recompensas rápidas':   { icon: Zap,        from: 'from-sky-400',     to: 'to-blue-600',    tag: 'bg-sky-50 text-sky-700 border-sky-200' },
  'Comida e restaurantes': { icon: Utensils,   from: 'from-amber-400',   to: 'to-orange-600',  tag: 'bg-amber-50 text-amber-800 border-amber-200' },
  'Cinema e lazer':        { icon: Ticket,     from: 'from-rose-500',    to: 'to-red-700',     tag: 'bg-rose-50 text-rose-700 border-rose-200' },
  'Moda e estilo':         { icon: Shirt,      from: 'from-violet-500',  to: 'to-indigo-700',  tag: 'bg-violet-50 text-violet-700 border-violet-200' },
  'Tecnologia e setup':    { icon: Cpu,        from: 'from-slate-600',   to: 'to-blue-800',    tag: 'bg-slate-100 text-slate-800 border-slate-200' },
  'Saúde e autocuidado':   { icon: Sun,        from: 'from-emerald-400', to: 'to-teal-600',    tag: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'Benefícios pessoais':   { icon: Gift,       from: 'from-cyan-400',    to: 'to-blue-600',    tag: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  'Experiências premium':  { icon: Mountain,   from: 'from-fuchsia-500', to: 'to-blue-900',    tag: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
  'Prêmios lendários':     { icon: Crown,      from: 'from-amber-400',   to: 'to-fuchsia-700', tag: 'bg-amber-50 text-amber-800 border-amber-200' },
};
const DEFAULT_THEME: CatTheme = { icon: Gift, from: 'from-blue-500', to: 'to-blue-700', tag: 'bg-blue-50 text-blue-700 border-blue-200' };

// Ícone temático por prêmio
const REWARD_ICONS: Record<string, React.ComponentType<any>> = {
  'Energético individual': Zap, 'Pack de energético': Zap, 'Caixa de chocolate': Cake,
  'Café especial': Coffee, 'Snack premium': Cake,
  'Vale iFood individual': Pizza, 'Combo lanche individual': Pizza, 'Lanche Madero': Beef,
  'Vale Outback individual': Beef, 'Vale Coco Bambu individual': Utensils,
  'Rodízio premium individual': Beef, 'Experiência gastronômica premium individual': Utensils,
  'Ingresso de cinema individual': Ticket, 'Combo cinema individual': Ticket, 'Cinema premium individual': Ticket,
  'Vale PlayStation, Xbox ou Steam': Rocket, 'Ingresso para jogo': Ticket, 'Experiência de kart individual': Flame,
  'Camiseta premium': Shirt, 'Camiseta oficial SOMUS': Shirt, 'Boné premium': Shirt, 'Boné da Alcateia': Shirt,
  'Moletom premium': Shirt, 'Tênis casual': ShoppingBag, 'Tênis premium': ShoppingBag,
  'Mousepad premium': Mouse, 'Garrafa térmica premium': Coffee, 'Mouse sem fio': Mouse,
  'Suporte de notebook': Laptop, 'Fone de ouvido bom': Headphones, 'Mouse gamer': Mouse,
  'Teclado mecânico': Keyboard, 'Fone de ouvido top': Headphones,
  'AirPods Pro ou equivalente premium': Headphones, 'Setup upgrade': Cpu,
  'iPhone': Rocket, 'MacBook': Laptop,
  'Vale barbearia': Scissors, 'Vale massagem': Sun, 'Vale academia ou esporte': Trophy,
  'Vale suplementação': Zap, 'Vale odonto': Award,
  'Vale Uber': Car, 'Crédito em curso': GraduationCap, 'Day off de meio período': Sun,
  'Day off': Calendar, 'Vale compra individual': ShoppingBag,
  'Vale TikTok': Rocket, 'Experiência premium individual': Crown,
  'Fim de semana em Pirenópolis': Mountain, 'Voucher viagem nacional': Plane,
  'Viagem internacional': Plane, 'Pin': Pin, 'User': User,
};

// Selo de raridade
type Seal = { label: string; className: string };
const RARITY_SEAL: Record<string, Seal> = {
  common:    { label: 'Comum',    className: 'bg-slate-100 text-slate-700 border-slate-300' },
  rare:      { label: 'Raro',     className: 'bg-sky-100 text-sky-800 border-sky-300' },
  epic:      { label: 'Épico',    className: 'bg-gradient-to-r from-indigo-600 to-blue-700 text-white border-transparent' },
  legendary: { label: 'Lendário', className: 'bg-gradient-to-r from-fuchsia-600 via-amber-500 to-blue-700 text-white border-transparent shadow-lg shadow-fuchsia-500/30' },
};
function getSeal(rarity?: string): Seal {
  return RARITY_SEAL[rarity || 'common'] ?? RARITY_SEAL.common;
}

function formatStars(n: number) {
  return new Intl.NumberFormat('pt-BR').format(n);
}
function formatBRL(cents?: number | null) {
  if (cents == null) return null;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function Loja() {
  const { profile, role } = useProfile();
  const { data: rewards = [] } = useRewards();
  const { data: myProfile } = useMyGamificationProfile(profile?.id);
  const myStars = myProfile?.total_stars ?? 0;

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof rewards>();
    for (const r of rewards) {
      const k = r.category || 'Outros';
      if (!map.has(k)) map.set(k, [] as any);
      map.get(k)!.push(r);
    }
    // ordena por custo dentro da categoria
    for (const list of map.values()) list.sort((a: any, b: any) => a.stars_cost - b.stars_cost);
    return map;
  }, [rewards]);

  const orderedCategories = useMemo(() => {
    const known = CATEGORY_ORDER.filter(c => byCategory.has(c));
    const extras = Array.from(byCategory.keys()).filter(c => !CATEGORY_ORDER.includes(c));
    return [...known, ...extras];
  }, [byCategory]);

  return (
    <div className="space-y-8">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-200/60 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Loja da Alcateia
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Troque <span className="text-sky-300">{CURRENCY_LABEL}</span> por recompensas reais.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              Lobo forte caça, entrega e ganha. Cada estrela é o reflexo do que você constrói com a alcateia.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="rounded-2xl bg-white/15 px-5 py-3 backdrop-blur ring-1 ring-white/20">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Seu saldo</p>
              <p className="flex items-baseline gap-1.5 font-display text-3xl font-bold">
                <Star className="h-6 w-6 self-center fill-yellow-300 text-yellow-300" />
                {formatStars(myStars)}
                <span className="text-xs font-normal text-white/70">{CURRENCY_SHORT}</span>
              </p>
            </div>
            {canUserAward(profile?.email, role) && <NewReward />}
          </div>
        </div>

        {/* Navegação por categoria — chips */}
        <div className="relative mt-6 flex flex-wrap gap-2">
          {orderedCategories.map(cat => {
            const T = CATEGORY_THEME[cat] ?? DEFAULT_THEME;
            const Icon = T.icon;
            return (
              <a
                key={cat}
                href={`#cat-${slug(cat)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur transition hover:bg-white/20"
              >
                <Icon className="h-3.5 w-3.5" />
                {cat}
                <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{byCategory.get(cat)!.length}</span>
              </a>
            );
          })}
        </div>
      </div>

      {rewards.length === 0 && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          Nenhum prêmio cadastrado ainda.
        </Card>
      )}

      {orderedCategories.map(cat => {
        const list = byCategory.get(cat) ?? [];
        const T = CATEGORY_THEME[cat] ?? DEFAULT_THEME;
        const Icon = T.icon;
        return (
          <section key={cat} id={`cat-${slug(cat)}`} className="scroll-mt-20">
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${T.from} ${T.to} text-white shadow-md`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight">{cat}</h2>
                <p className="text-xs text-muted-foreground">{list.length} prêmios disponíveis</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((r: any) => (
                <RewardCard key={r.id} reward={r} myStars={myStars} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function slug(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
}

function RewardCard({ reward, myStars }: { reward: any; myStars: number }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const request = useRequestRedemption();
  const unlockThreshold: number | null = reward.unlock_threshold_stars ?? null;
  const locked = unlockThreshold != null && myStars < unlockThreshold;
  const insufficient = myStars < reward.stars_cost;
  const outOfStock = reward.stock !== null && reward.stock <= 0;
  const unavailable = !reward.is_available || outOfStock;
  const refBRL = formatBRL(reward.reference_value_cents);
  const missing = Math.max(0, reward.stars_cost - myStars);
  const progressPct = Math.min(100, Math.round((myStars / reward.stars_cost) * 100));

  const theme = CATEGORY_THEME[reward.category] ?? DEFAULT_THEME;
  const Icon = REWARD_ICONS[reward.name] ?? theme.icon;
  const seal = getSeal(reward.rarity);
  const isLegendary = reward.rarity === 'legendary' || reward.is_featured;

  return (
    <Card
      className={`group relative flex flex-col overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-xl ${
        isLegendary ? 'ring-2 ring-fuchsia-400/50 shadow-lg shadow-fuchsia-500/10' : ''
      }`}
    >
      {/* CAPA */}
      <div className={`relative h-44 overflow-hidden bg-gradient-to-br ${theme.from} ${theme.to}`}>
        {/* imagem ilustrativa do prêmio (quando houver) */}
        {reward.image_url ? (
          <>
            <img
              src={reward.image_url}
              alt={reward.name}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </>
        ) : (
          <>
            {/* padrão decorativo de fallback */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 25% 30%, white 1px, transparent 1.5px), radial-gradient(circle at 75% 70%, white 1px, transparent 1.5px)', backgroundSize: '24px 24px' }} />
            <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
            {/* ícone central como fallback */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/30 transition-transform group-hover:scale-110">
                <Icon className="h-10 w-10 text-white drop-shadow-lg" strokeWidth={2} />
              </div>
            </div>
          </>
        )}
        {isLegendary && (
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 pointer-events-none" />
        )}

        {/* selo */}
        {seal && (
          <div className="absolute left-3 top-3">
            <Badge className={`gap-1 text-[10px] font-bold uppercase tracking-wider ${seal.className}`}>
              {isLegendary && <Crown className="h-3 w-3" />}
              {seal.label}
            </Badge>
          </div>
        )}

        {/* badge de estoque/indisponível */}
        {outOfStock && (
          <div className="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            Esgotado
          </div>
        )}
        {!outOfStock && !reward.is_available && (
          <div className="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            Indisponível
          </div>
        )}

        {/* ícone temático pequeno quando há imagem */}
        {reward.image_url && (
          <div className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-foreground shadow ring-1 ring-white/60 backdrop-blur">
            <Icon className="h-4 w-4" strokeWidth={2.2} />
          </div>
        )}

        {/* sparkles para lendário */}
        {isLegendary && (
          <>
            <Sparkles className="absolute right-4 bottom-4 h-4 w-4 text-yellow-200 animate-pulse" />
            <Sparkles className="absolute left-6 bottom-3 h-3 w-3 text-white/70 animate-pulse [animation-delay:400ms]" />
          </>
        )}
      </div>

      {/* CORPO */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{reward.name}</h3>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={`w-fit text-[10px] ${theme.tag}`}>{reward.category}</Badge>
          {reward.reward_type && (
            <span className="text-[10px] text-muted-foreground">• {reward.reward_type}</span>
          )}
        </div>
        {reward.description && (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{reward.description}</p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 ring-1 ring-blue-200">
            <Star className="h-4 w-4 fill-blue-600 text-blue-600" />
            <span className="font-bold text-blue-700">{formatStars(reward.stars_cost)}</span>
            <span className="text-[10px] text-blue-600/70">{CURRENCY_SHORT}</span>
          </div>
          {reward.stock !== null && reward.stock > 0 && (
            <p className="text-[10px] text-muted-foreground">Estoque: {reward.stock}</p>
          )}
        </div>

        {/* Barra de progresso individual */}
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full ${isLegendary ? 'bg-gradient-to-r from-fuchsia-500 via-amber-400 to-blue-600' : 'bg-gradient-to-r from-blue-500 to-blue-700'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {missing === 0
              ? 'Disponível para resgate'
              : `Faltam ${formatStars(missing)} ${CURRENCY_SHORT} para desbloquear`}
          </p>
          {locked && (
            <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-700">
              <Lock className="h-3 w-3" />
              Desbloqueia ao acumular {formatStars(unlockThreshold!)} {CURRENCY_SHORT}
            </p>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className={`mt-3 w-full ${
                !insufficient && !unavailable && !locked
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                  : ''
              }`}
              variant={insufficient || unavailable || locked ? 'secondary' : 'default'}
              disabled={insufficient || unavailable || locked}
            >
              {unavailable ? (
                <>{outOfStock ? 'Esgotado' : 'Indisponível'}</>
              ) : locked ? (
                <><Lock className="mr-1.5 h-3.5 w-3.5" /> Bloqueado</>
              ) : insufficient ? (
                <><Lock className="mr-1.5 h-3.5 w-3.5" /> Faltam {formatStars(missing)}</>
              ) : (
                <><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Solicitar resgate</>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirmar resgate</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                <p className="font-semibold text-blue-900">{reward.name}</p>
                <p className="text-xs text-blue-700">{reward.category}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border bg-muted/30 p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Custo</p>
                  <p className="font-bold text-blue-700">{formatStars(reward.stars_cost)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Saldo</p>
                  <p className="font-bold">{formatStars(myStars)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Após</p>
                  <p className="font-bold">{formatStars(myStars - reward.stars_cost)}</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">As estrelas só são descontadas após a aprovação do líder.</p>
              <div><Label>Observação (opcional)</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Algum detalhe importante para o líder?" /></div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button disabled={request.isPending} onClick={async () => {
                try {
                  await request.mutateAsync({ reward_id: reward.id, stars_cost: reward.stars_cost, notes });
                  setOpen(false); setNotes('');
                } catch (e: any) { toast.error(e.message); }
              }}>Confirmar resgate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}

function NewReward() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: 'Recompensas rápidas', stars_cost: 50, stock: 10, image_url: '' });
  const [uploading, setUploading] = useState(false);
  const create = useCreateReward();

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 5MB).');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `rewards/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('client-assets')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from('client-assets')
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (!signed?.signedUrl) throw new Error('Não foi possível gerar URL da imagem.');
      setForm(f => ({ ...f, image_url: signed.signedUrl }));
      toast.success('Imagem enviada!');
    } catch (e: any) {
      toast.error(e.message || 'Falha ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => setForm({ name: '', description: '', category: 'Recompensas rápidas', stars_cost: 50, stock: 10, image_url: '' });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="bg-white text-blue-700 hover:bg-white/90">
          <Plus className="mr-1 h-4 w-4" /> Novo prêmio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Criar prêmio</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {/* Imagem ilustrativa */}
          <div>
            <Label>Imagem ilustrativa</Label>
            <div className="mt-1 flex items-start gap-3">
              <label className="relative flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-input bg-muted/30 transition hover:border-primary hover:bg-muted/50">
                {form.image_url ? (
                  <img src={form.image_url} alt="Pré-visualização" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                    <span>{uploading ? 'Enviando...' : 'Enviar'}</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
                />
              </label>
              <div className="flex-1 space-y-1">
                <p className="text-[11px] text-muted-foreground">
                  Faça upload (JPG/PNG até 5MB) ou cole a URL de uma imagem ilustrativa do prêmio.
                </p>
                <Input
                  placeholder="https://exemplo.com/imagem.jpg"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
                {form.image_url && (
                  <button type="button" className="text-[11px] text-destructive hover:underline" onClick={() => setForm({ ...form, image_url: '' })}>
                    Remover imagem
                  </button>
                )}
              </div>
            </div>
          </div>

          <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1"><Label>Categoria</Label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORY_ORDER.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Label>Custo (estrelas)</Label><Input type="number" value={form.stars_cost} onChange={e => setForm({ ...form, stars_cost: Number(e.target.value) })} /></div>
            <div><Label>Estoque</Label><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!form.name || !form.image_url || create.isPending || uploading} onClick={async () => {
            await create.mutateAsync(form);
            setOpen(false);
            reset();
          }}>
            {!form.image_url ? 'Adicione uma imagem' : 'Criar prêmio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
