import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, Sparkles, Plus, Flame, Layers, Award, Check } from 'lucide-react';
import { useGamificationProfiles, useUserPins, usePins, useAwardStars, useSetUserLevel, useAwardPin, useRevokePin, POINTS_LABEL, canUserAward, LEVELS, RARITY_LABELS } from '@/lib/gamificacao-store';
import { LevelSeal } from '@/components/gamificacao/LevelSeal';
import { useProfile } from '@/hooks/use-profile';

export const Route = createFileRoute('/gamificacao/galeria-do-lobo')({
  component: GaleriaDoLobo,
});

const roleLabel = (role?: string | null, email?: string | null) => {
  if (role === 'super_admin' || email?.toLowerCase() === 'wilson@agenciaw2.com.br') return 'Super Admin';
  if (role === 'master') return 'Administrador';
  if (role === 'project_manager') return 'Gestor';
  if (role === 'consultant') return 'Consultor';
  if (role === 'client') return 'Cliente';
  return role?.replace('_', ' ') ?? 'Usuário';
};

function GaleriaDoLobo() {
  const { profile, role } = useProfile();
  const isAwarder = canUserAward(profile?.email, role);
  const [search, setSearch] = useState('');
  const { data: profiles = [] } = useGamificationProfiles();
  const { data: userPins = [] } = useUserPins();
  const { data: pins = [] } = usePins();

  const filtered = profiles.filter(p =>
    !search || p.full_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Input placeholder="Buscar colaborador..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <p className="text-xs text-muted-foreground">{profiles.length} lobos na alcateia</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(p => {
          const myPins = userPins.filter(up => up.user_id === p.user_id);
          const myPinIds = new Set(myPins.map(mp => mp.pin_id));
          const lastPin = myPins[0] ? pins.find(pin => pin.id === myPins[0].pin_id) : null;
          const levelName = p.current_level ?? LEVELS[0].name;

          return (
            <Card key={p.user_id} className="p-5">
              <div className="flex items-start gap-3">
                <LevelSeal levelName={levelName} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold">{p.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{roleLabel(p.role, p.email)}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">#{p.ranking_position}</Badge>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="leading-tight">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nível</p>
                  <p className="font-display text-sm font-semibold">{levelName}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5 text-primary">
                    <Flame className="h-4 w-4 fill-current" />
                    <span className="text-lg font-bold">{p.total_stars}</span>
                  </div>
                  {p.leader_stars_count > 0 && (
                    <Badge className="mt-1 gap-1 bg-yellow-100 text-yellow-900 hover:bg-yellow-100">
                      <Crown className="h-3 w-3" /> {p.leader_stars_count}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p>
                  <Sparkles className="mr-1 inline h-3 w-3" />
                  {myPins.length + (p.leader_stars_count ?? 0)} selos conquistados
                  {p.leader_stars_count > 0 && (
                    <span className="ml-1 text-[10px]">
                      ({myPins.length} pins · {p.leader_stars_count} estrela{p.leader_stars_count > 1 ? 's' : ''} do líder)
                    </span>
                  )}
                </p>
                {lastPin && <p>Última conquista: <span className="text-foreground">{lastPin.name}</span></p>}
              </div>

              {isAwarder && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <AwardButton userId={p.user_id} userName={p.full_name} />
                  <SetLevelButton userId={p.user_id} userName={p.full_name} currentLevel={p.current_level} />
                  <AwardPinButton userId={p.user_id} userName={p.full_name} pins={pins} ownedPinIds={myPinIds} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function AwardButton({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState('');
  const award = useAwardStars();
  const safeReason = reason.trim() || 'Concessão manual de pontos';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <Plus className="mr-1 h-3.5 w-3.5" /> Pontos
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Conceder pontos — {userName}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Pontos</Label>
            <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
          </div>
          <div>
            <Label>Motivo (opcional)</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex.: Entregou projeto antes do prazo" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={amount === 0 || award.isPending}
            onClick={async () => {
              try {
                await award.mutateAsync({ user_id: userId, points_amount: amount, reason: safeReason });
                setOpen(false);
                setReason('');
              } catch {
                // O toast de erro é exibido pelo hook da mutação.
              }
            }}
          >Conceder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SetLevelButton({ userId, userName, currentLevel }: { userId: string; userName: string; currentLevel?: string | null }) {
  const [open, setOpen] = useState(false);
  const [levelName, setLevelName] = useState<string>(currentLevel ?? '');
  const setLevel = useSetUserLevel();

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setLevelName(currentLevel ?? ''); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="w-full">
          <Layers className="mr-1 h-3.5 w-3.5" /> Nível
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Definir nível — {userName}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Defina o estágio de maturidade do colaborador. Os {POINTS_LABEL.toLowerCase()} <strong>não serão alterados</strong> — apenas a exibição do nível.
          </p>
          <div>
            <Label>Nível</Label>
            <Select value={levelName} onValueChange={setLevelName}>
              <SelectTrigger><SelectValue placeholder="Selecione um nível" /></SelectTrigger>
              <SelectContent>
                {LEVELS.map(l => (
                  <SelectItem key={l.name} value={l.name}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={!levelName || levelName === currentLevel || setLevel.isPending}
            onClick={async () => {
              await setLevel.mutateAsync({ user_id: userId, level_name: levelName });
              setOpen(false);
            }}
          >Definir nível</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AwardPinButton({ userId, userName, pins, ownedPinIds }: { userId: string; userName: string; pins: any[]; ownedPinIds: Set<string> }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const award = useAwardPin();
  const revoke = useRevokePin();

  const grouped = pins.reduce<Record<string, any[]>>((acc, p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return acc;
    (acc[p.category] ||= []).push(p);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <Award className="mr-1 h-3.5 w-3.5" /> Selo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Conceder selo — {userName}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          Os selos são concedidos por meritocracia. Selecione um pin para entregar ou revogar.
        </p>
        <Input placeholder="Buscar selo..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{cat}</p>
              <div className="grid gap-2">
                {list.map(pin => {
                  const owned = ownedPinIds.has(pin.id);
                  return (
                    <div key={pin.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">{pin.name}</p>
                          <Badge variant="outline" className="text-[9px]">{RARITY_LABELS[pin.rarity as keyof typeof RARITY_LABELS]}</Badge>
                        </div>
                        {pin.description && <p className="truncate text-xs text-muted-foreground">{pin.description}</p>}
                      </div>
                      {owned ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={revoke.isPending}
                          onClick={() => revoke.mutate({ user_id: userId, pin_id: pin.id })}
                        >
                          <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" /> Concedido
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={award.isPending}
                          onClick={() => award.mutate({ user_id: userId, pin_id: pin.id })}
                        >
                          Conceder
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
