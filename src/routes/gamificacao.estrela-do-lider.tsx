import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, Plus, Sparkles } from 'lucide-react';
import {
  useLeaderStars, useAwardLeaderStar, useGamificationProfiles,
  LEADER_CATEGORY_LABELS, RARITY_LABELS, RARITY_COLORS, RARITY_STARS, LEADER_PHRASES,
  canUserAward,
  type LeaderCategory, type Rarity,
} from '@/lib/gamificacao-store';
import { useProfile } from '@/hooks/use-profile';
import { WolfAvatar } from '@/components/WolfAvatar';

export const Route = createFileRoute('/gamificacao/estrela-do-lider')({
  component: EstrelaDoLider,
});

function EstrelaDoLider() {
  const { profile, role } = useProfile();
  const isAwarder = canUserAward(profile?.email, role);
  const { data: stars = [] } = useLeaderStars();
  const { data: profiles = [] } = useGamificationProfiles();
  const userName = (id: string) => profiles.find(p => p.user_id === id)?.full_name ?? 'Colaborador';
  const userAvatarKey = (id: string) => (profiles.find(p => p.user_id === id) as any)?.avatar_key ?? null;
  const phrase = LEADER_PHRASES[new Date().getDate() % LEADER_PHRASES.length];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-yellow-200 bg-gradient-to-r from-yellow-50 via-amber-50 to-transparent p-6">
        <Crown className="absolute right-6 top-6 h-10 w-10 text-yellow-500/40" />
        <p className="text-xs font-semibold uppercase tracking-wider text-yellow-700">Estrela do Líder da Alcateia</p>
        <p className="mt-1 font-display text-xl font-semibold tracking-tight">{phrase}</p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{stars.length} estrelas do líder concedidas</p>
        {isAwarder && <AwardLeaderDialog />}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {stars.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground lg:col-span-2">
            Nenhuma Estrela do Líder concedida ainda.
          </Card>
        )}
        {stars.map(s => (
          <Card key={s.id} className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <WolfAvatar
                  avatarKey={userAvatarKey(s.user_id)}
                  seed={s.user_id}
                  name={userName(s.user_id)}
                  size="lg"
                  className="ring-2 ring-background shadow-md"
                />
                <HeroStar rarity={s.rarity} bonus={s.bonus_stars} />
              </div>
              <div className="min-w-0 pt-1">
                <p className="font-semibold">{userName(s.user_id)}</p>
                <p className="text-xs text-muted-foreground">
                  {LEADER_CATEGORY_LABELS[s.category]} · {new Date(s.awarded_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            {s.title && <p className="mt-3 font-medium">{s.title}</p>}
            <p className="mt-2 text-sm">{s.reason}</p>
            {s.public_message && <p className="mt-2 rounded-lg bg-muted p-3 text-sm italic">"{s.public_message}"</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}

function AwardLeaderDialog() {
  const [open, setOpen] = useState(false);
  const { data: profiles = [] } = useGamificationProfiles();
  const internalProfiles = profiles.filter(p => p.role !== 'client');
  const [form, setForm] = useState<{
    user_id: string; title: string; reason: string; category: LeaderCategory; rarity: Rarity; bonus_stars: number; public_message: string; internal_note: string;
  }>({
    user_id: '', title: '', reason: '', category: 'extraordinary_execution', rarity: 'bronze',
    bonus_stars: RARITY_STARS.bronze, public_message: '', internal_note: '',
  });
  const award = useAwardLeaderStar();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Conceder Estrela do Líder</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-yellow-600" /> Estrela do Líder</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Colaborador</Label>
            <Select value={form.user_id} onValueChange={v => setForm({ ...form, user_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {internalProfiles.map(p => (
                  <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v: LeaderCategory) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEADER_CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Raridade</Label>
              <Select value={form.rarity} onValueChange={(v: Rarity) => setForm({ ...form, rarity: v, bonus_stars: RARITY_STARS[v] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(RARITY_LABELS) as Rarity[]).map(k => (
                    <SelectItem key={k} value={k}>{RARITY_LABELS[k]} (+{RARITY_STARS[k]}pts)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Lealdade exemplar" /></div>
          <div><Label>Motivo *</Label><Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required /></div>
          <div><Label>Mensagem pública</Label><Textarea value={form.public_message} onChange={e => setForm({ ...form, public_message: e.target.value })} /></div>
          <div><Label>Nota interna</Label><Textarea value={form.internal_note} onChange={e => setForm({ ...form, internal_note: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!form.user_id || !form.reason || award.isPending} onClick={async () => {
            await award.mutateAsync(form);
            setOpen(false);
            setForm({ ...form, user_id: '', title: '', reason: '', public_message: '', internal_note: '' });
          }}>Conceder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STAR_THEME: Record<Rarity, { c1: string; c2: string; c3: string; ring: string; label: string }> = {
  bronze:    { c1: '#fde68a', c2: '#f59e0b', c3: '#b45309', ring: '#92400e', label: 'text-amber-900' },
  silver:    { c1: '#f1f5f9', c2: '#cbd5e1', c3: '#64748b', ring: '#475569', label: 'text-slate-800' },
  gold:      { c1: '#fef9c3', c2: '#facc15', c3: '#ca8a04', ring: '#854d0e', label: 'text-yellow-900' },
  legendary: { c1: '#fbcfe8', c2: '#c084fc', c3: '#7c3aed', ring: '#6d28d9', label: 'text-purple-50' },
};

function HeroStar({ rarity, bonus }: { rarity: Rarity; bonus: number }) {
  const t = STAR_THEME[rarity];
  const isLegendary = rarity === 'legendary';
  return (
    <div className="relative -ml-1 flex items-center" title={`${RARITY_LABELS[rarity]} +${bonus}`}>
      <div
        className="absolute -inset-4 rounded-full blur-2xl opacity-70"
        style={{ background: `radial-gradient(circle, ${t.c2} 0%, transparent 70%)` }}
      />
      <div className="relative">
        <div className="absolute inset-0 -m-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 h-[2px] w-[30px] -translate-y-1/2 origin-left rounded-full opacity-70"
              style={{
                transform: `translateY(-50%) rotate(${i * 36}deg)`,
                background: `linear-gradient(to right, ${t.c2}, transparent)`,
              }}
            />
          ))}
        </div>
        <svg width="74" height="74" viewBox="0 0 100 100" className="relative drop-shadow-xl">
          <defs>
            <radialGradient id={`star-${rarity}`} cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor={t.c1} />
              <stop offset="55%" stopColor={t.c2} />
              <stop offset="100%" stopColor={t.c3} />
            </radialGradient>
            <linearGradient id={`shine-${rarity}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            points="50,4 61,38 96,38 67,59 78,93 50,72 22,93 33,59 4,38 39,38"
            fill={`url(#star-${rarity})`}
            stroke={t.ring}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="52" r="16" fill={t.ring} opacity="0.25" />
          <circle cx="50" cy="52" r="14" fill={t.c1} opacity="0.95" stroke={t.ring} strokeWidth="1.2" />
          <polygon
            points="50,4 61,38 96,38 67,59 78,93 50,72 22,93 33,59 4,38 39,38"
            fill={`url(#shine-${rarity})`}
            opacity="0.6"
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center font-display text-[12px] font-extrabold tracking-tight ${t.label}`} style={{ marginTop: 4 }}>
          +{bonus}
        </div>
        {isLegendary && (
          <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-fuchsia-300 animate-pulse" />
        )}
      </div>
    </div>
  );
}
