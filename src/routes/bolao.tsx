import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Trophy, Calendar, Save, Pencil } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProfile } from '@/hooks/use-profile';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getFlagUrl } from '@/lib/country-flags';

function TeamFlag({ name, size = 28 }: { name: string; size?: number }) {
  const url = getFlagUrl(name);
  if (!url) {
    return (
      <div
        className="flex items-center justify-center rounded-sm bg-muted text-[10px] font-bold text-muted-foreground"
        style={{ width: size, height: Math.round(size * 0.7) }}
        aria-hidden
      >
        {name.slice(0, 3).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={`Bandeira ${name}`}
      className="rounded-sm object-cover shadow-sm ring-1 ring-border/40"
      style={{ width: size, height: Math.round(size * 0.7) }}
      loading="lazy"
    />
  );
}

export const Route = createFileRoute('/bolao')({
  component: BolaoPage,
});



type Match = {
  id: string;
  phase: string;
  group_name: string | null;
  team_a: string;
  team_b: string;
  kickoff_at: string;
  venue: string | null;
  score_a: number | null;
  score_b: number | null;
  status: string;
};

type Bet = {
  id: string;
  match_id: string;
  user_id: string;
  guess_a: number;
  guess_b: number;
  amount: number;
  paid: boolean;
  points: number;
};

function BolaoPage() {
  const { profile } = useProfile();
  const qc = useQueryClient();
  const isAdmin = profile?.role === 'master' || profile?.role === 'project_manager';
  const [dateFilter, setDateFilter] = useState<string>('');

  const { data: matches = [] } = useQuery({
    queryKey: ['bolao_matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bolao_matches' as any)
        .select('*')
        .order('kickoff_at', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown) as Match[];
    },
  });

  const { data: bets = [] } = useQuery({
    queryKey: ['bolao_bets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bolao_bets' as any).select('*');
      if (error) throw error;
      return ((data ?? []) as unknown) as Bet[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles_min'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url');
      return (data ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[];
    },
  });

  const profileOf = (id: string) => profiles.find((p) => p.id === id);
  const nameOf = (id: string) => profileOf(id)?.full_name ?? 'Usuário';
  const initialsOf = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('');

  const myBets = useMemo(
    () => bets.filter((b) => b.user_id === profile?.id),
    [bets, profile?.id],
  );

  const ranking = useMemo(() => {
    const map = new Map<string, { user_id: string; total: number; bets: number }>();
    for (const b of bets) {
      const cur = map.get(b.user_id) ?? { user_id: b.user_id, total: 0, bets: 0 };
      cur.total += b.points;
      cur.bets += 1;
      map.set(b.user_id, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [bets]);

  

  const [betDialog, setBetDialog] = useState<{ match: Match; bet?: Bet } | null>(null);
  const [matchDialog, setMatchDialog] = useState<Match | 'new' | null>(null);
  const [scoreDialog, setScoreDialog] = useState<Match | null>(null);

  return (
    <MainLayout>
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Trophy className="h-7 w-7 text-yellow-500" /> Somus Bolão
          </h1>
          <p className="text-sm text-muted-foreground">
            Acertou o resultado (vitória/empate): <b>5 pts</b> · Placar exato: <b>10 pts</b> · 1º lugar ganha <b>300 pontos no sistema</b>
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={async () => {
              if (!confirm('Premiar o 1º colocado com 300 pontos no sistema?')) return;
              const { data, error } = await supabase.rpc('bolao_award_champion' as any);
              if (error) { toast.error(error.message); return; }
              const row = (data as any)?.[0];
              if (row?.message === 'ok') toast.success('Campeão premiado com 300 pontos!');
              else toast.info('Sem ranking disponível ainda.');
            }}>
              <Trophy className="mr-2 h-4 w-4" /> Premiar campeão (300 pts)
            </Button>
            <Button onClick={() => setMatchDialog('new')}>
              <Calendar className="mr-2 h-4 w-4" /> Novo jogo
            </Button>
          </div>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Trophy className="h-8 w-8 text-amber-500" />
            <div>
              <div className="text-xs text-muted-foreground">Prêmio do 1º colocado</div>
              <div className="text-xl font-bold">300 pontos</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <div>
              <div className="text-xs text-muted-foreground">Palpites registrados</div>
              <div className="text-xl font-bold">{bets.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar className="h-8 w-8 text-blue-500" />
            <div>
              <div className="text-xs text-muted-foreground">Jogos mapeados</div>
              <div className="text-xl font-bold">{matches.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="jogos">
        <TabsList>
          <TabsTrigger value="jogos">Jogos</TabsTrigger>
          <TabsTrigger value="minhas">Meus palpites</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
        </TabsList>

        <TabsContent value="jogos" className="space-y-3">
          <DateFilter matches={matches} value={dateFilter} onChange={setDateFilter} />
          {matches.filter((m) => !dateFilter || new Date(m.kickoff_at).toISOString().slice(0, 10) === dateFilter).map((m) => {
            const myBet = myBets.find((b) => b.match_id === m.id);
            const matchBets = bets.filter((b) => b.match_id === m.id);
            const open = new Date(m.kickoff_at) > new Date();
            return (
              <Card key={m.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{m.phase}</Badge>
                      {m.group_name && <Badge variant="secondary">Grupo {m.group_name}</Badge>}
                      <span>{new Date(m.kickoff_at).toLocaleString('pt-BR')}</span>
                      {m.venue && <span className="hidden sm:inline">· {m.venue}</span>}
                    </div>
                    <div className="flex gap-2">
                      {isAdmin && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setMatchDialog(m)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setScoreDialog(m)}>
                            Lançar placar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-4 py-2 text-lg font-bold">
                    <div className="flex flex-1 items-center justify-end gap-2">
                      <span className="text-right">{m.team_a}</span>
                      <TeamFlag name={m.team_a} size={36} />
                    </div>
                    <span className="rounded bg-muted px-3 py-1 text-2xl">
                      {m.score_a ?? '-'} : {m.score_b ?? '-'}
                    </span>
                    <div className="flex flex-1 items-center gap-2">
                      <TeamFlag name={m.team_b} size={36} />
                      <span className="text-left">{m.team_b}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                      <span>{matchBets.length} palpite(s)</span>
                      {matchBets.length > 0 && (
                        <div className="flex -space-x-2">
                          {matchBets.slice(0, 6).map((mb) => {
                            const p = profileOf(mb.user_id);
                            const name = p?.full_name ?? 'Usuário';
                            return (
                              <Avatar key={mb.id} className="h-6 w-6 border-2 border-background" title={name}>
                                {p?.avatar_url && <AvatarImage src={p.avatar_url} alt={name} />}
                                <AvatarFallback className="text-[9px] font-semibold bg-muted">
                                  {initialsOf(name)}
                                </AvatarFallback>
                              </Avatar>
                            );
                          })}
                          {matchBets.length > 6 && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-semibold">
                              +{matchBets.length - 6}
                            </div>
                          )}
                        </div>
                      )}
                      {myBet && (
                        <span>
                          · Seu palpite: <b>{myBet.guess_a} x {myBet.guess_b}</b>
                          {m.score_a !== null && (
                            <Badge className="ml-2" variant={myBet.points > 0 ? 'default' : 'secondary'}>
                              {myBet.points} pts
                            </Badge>
                          )}
                        </span>
                      )}
                    </div>
                    {open ? (
                      <Button size="sm" onClick={() => setBetDialog({ match: m, bet: myBet })}>
                        {myBet ? 'Editar palpite' : 'Dar palpite'}
                      </Button>
                    ) : (
                      <Badge variant="secondary">Palpites encerrados</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="minhas" className="space-y-2">
          {myBets.length === 0 && (
            <p className="text-sm text-muted-foreground">Você ainda não fez nenhum palpite.</p>
          )}
          {myBets.map((b) => {
            const m = matches.find((x) => x.id === b.match_id);
            if (!m) return null;
            return (
              <Card key={b.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <TeamFlag name={m.team_a} size={24} />
                      <span className="text-xs text-muted-foreground">x</span>
                      <TeamFlag name={m.team_b} size={24} />
                    </div>
                    <div>
                      <div className="font-semibold">{m.team_a} x {m.team_b}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(m.kickoff_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{b.guess_a} x {b.guess_b}</div>
                    <div className="text-xs">
                      {b.points} pts
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="ranking">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Jogador</th>
                    <th className="p-3 text-right">Palpites</th>
                    <th className="p-3 text-right">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r, i) => (
                    <tr key={r.user_id} className="border-t">
                      <td className="p-3 font-bold">
                        {i === 0 ? '🏆 1º' : `${i + 1}º`}
                      </td>
                      <td className="p-3">
                        {(() => {
                          const p = profileOf(r.user_id);
                          const name = p?.full_name ?? 'Usuário';
                          return (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8 border border-border/50">
                                {p?.avatar_url && <AvatarImage src={p.avatar_url} alt={name} />}
                                <AvatarFallback className="text-[10px] font-semibold bg-muted">{initialsOf(name)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{name}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-3 text-right">{r.bets}</td>
                      <td className="p-3 text-right font-bold">{r.total}</td>
                    </tr>
                  ))}
                  {ranking.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        Sem palpites ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {betDialog && (
        <BetDialog
          match={betDialog.match}
          bet={betDialog.bet}
          onClose={() => setBetDialog(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['bolao_bets'] });
            setBetDialog(null);
          }}
        />
      )}

      {matchDialog && (
        <MatchDialog
          match={matchDialog === 'new' ? null : matchDialog}
          onClose={() => setMatchDialog(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['bolao_matches'] });
            setMatchDialog(null);
          }}
        />
      )}

      {scoreDialog && (
        <ScoreDialog
          match={scoreDialog}
          onClose={() => setScoreDialog(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['bolao_matches'] });
            qc.invalidateQueries({ queryKey: ['bolao_bets'] });
            setScoreDialog(null);
          }}
        />
      )}
    </div>
    </MainLayout>
  );
}

function BetDialog({
  match, bet, onClose, onSaved,
}: { match: Match; bet?: Bet; onClose: () => void; onSaved: () => void }) {
  const { profile } = useProfile();
  const [a, setA] = useState(bet?.guess_a ?? 0);
  const [b, setB] = useState(bet?.guess_b ?? 0);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      if (bet) {
        const { error } = await supabase
          .from('bolao_bets' as any)
          .update({ guess_a: a, guess_b: b })
          .eq('id', bet.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('bolao_bets' as any).insert({
          match_id: match.id,
          user_id: profile.id,
          guess_a: a,
          guess_b: b,
        });
        if (error) throw error;
      }
      toast.success('Palpite salvo!');
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao salvar palpite');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{match.team_a} x {match.team_b}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="text-center">
            <Label className="text-xs">{match.team_a}</Label>
            <Input type="number" min={0} value={a} onChange={(e) => setA(parseInt(e.target.value) || 0)} className="w-20 text-center text-2xl" />
          </div>
          <span className="text-2xl">x</span>
          <div className="text-center">
            <Label className="text-xs">{match.team_b}</Label>
            <Input type="number" min={0} value={b} onChange={(e) => setB(parseInt(e.target.value) || 0)} className="w-20 text-center text-2xl" />
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Prêmio para o 1º colocado no ranking final: <b>300 pontos no sistema</b>
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {bet ? 'Atualizar' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MatchDialog({
  match, onClose, onSaved,
}: { match: Match | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    team_a: match?.team_a ?? '',
    team_b: match?.team_b ?? '',
    phase: match?.phase ?? 'grupos',
    group_name: match?.group_name ?? '',
    venue: match?.venue ?? '',
    kickoff_at: match?.kickoff_at ? match.kickoff_at.slice(0, 16) : '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        group_name: form.group_name || null,
        venue: form.venue || null,
        kickoff_at: new Date(form.kickoff_at).toISOString(),
      };
      if (match) {
        const { error } = await supabase.from('bolao_matches' as any).update(payload).eq('id', match.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('bolao_matches' as any).insert(payload);
        if (error) throw error;
      }
      toast.success('Jogo salvo!');
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{match ? 'Editar jogo' : 'Novo jogo'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Time A</Label>
              <Input value={form.team_a} onChange={(e) => setForm({ ...form, team_a: e.target.value })} />
            </div>
            <div>
              <Label>Time B</Label>
              <Input value={form.team_b} onChange={(e) => setForm({ ...form, team_b: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Fase</Label>
              <Input value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })} />
            </div>
            <div>
              <Label>Grupo</Label>
              <Input value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Data/hora</Label>
            <Input type="datetime-local" value={form.kickoff_at} onChange={(e) => setForm({ ...form, kickoff_at: e.target.value })} />
          </div>
          <div>
            <Label>Local</Label>
            <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScoreDialog({
  match, onClose, onSaved,
}: { match: Match; onClose: () => void; onSaved: () => void }) {
  const [a, setA] = useState(match.score_a ?? 0);
  const [b, setB] = useState(match.score_b ?? 0);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bolao_matches' as any)
        .update({ score_a: a, score_b: b, status: 'finished' })
        .eq('id', match.id);
      if (error) throw error;
      toast.success('Placar lançado! Pontuações recalculadas.');
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? 'Erro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Placar final · {match.team_a} x {match.team_b}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="text-center">
            <Label className="text-xs">{match.team_a}</Label>
            <Input type="number" min={0} value={a} onChange={(e) => setA(parseInt(e.target.value) || 0)} className="w-20 text-center text-2xl" />
          </div>
          <span className="text-2xl">x</span>
          <div className="text-center">
            <Label className="text-xs">{match.team_b}</Label>
            <Input type="number" min={0} value={b} onChange={(e) => setB(parseInt(e.target.value) || 0)} className="w-20 text-center text-2xl" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>Lançar placar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DateFilter({ matches, value, onChange }: { matches: Match[]; value: string; onChange: (v: string) => void }) {
  const dates = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) set.add(new Date(m.kickoff_at).toISOString().slice(0, 10));
    return Array.from(set).sort();
  }, [matches]);
  if (dates.length === 0) return null;
  const fmt = (iso: string) => {
    const [y, mo, d] = iso.split('-');
    return `${d}/${mo}`;
  };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
      <Calendar className="ml-1 h-4 w-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">Filtrar por data:</span>
      <Button size="sm" variant={value === '' ? 'default' : 'outline'} onClick={() => onChange('')}>Todos</Button>
      {dates.map((d) => (
        <Button key={d} size="sm" variant={value === d ? 'default' : 'outline'} onClick={() => onChange(d)}>
          {fmt(d)}
        </Button>
      ))}
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ml-auto h-8 w-auto"
      />
    </div>
  );
}
