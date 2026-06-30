import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Crosshair, Target, Plus, Hand, CheckCircle2, X, Trash2, Calendar as CalendarIcon, Pencil } from 'lucide-react';
import {
  useMissions,
  useCreateMission,
  useMissionSubtasks,
  useClaimSubtask,
  useReleaseSubtask,
  useCompleteSubtask,
  useAddSubtask,
  useUpdateSubtask,
  useUpdateMission,
  useDeleteMission,
  useGamificationProfiles,
  canUserAward,
} from '@/lib/gamificacao-store';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/integrations/supabase/client';
import { InlineText } from '@/components/shared/InlineEdit';


export const Route = createFileRoute('/missoes')({
  component: MissoesPage,
});

function MissoesPage() {
  const { profile, role } = useProfile();
  const { data: missions = [] } = useMissions();
  const { data: subtasks = [] } = useMissionSubtasks();
  const { data: people = [] } = useGamificationProfiles();
  const isMaster = canUserAward(profile?.email, role);

  const peopleMap = useMemo(() => {
    const m = new Map<string, { full_name: string; avatar_url?: string | null }>();
    for (const p of people) m.set(p.user_id, { full_name: p.full_name, avatar_url: (p as any).avatar_url });
    return m;
  }, [people]);

  const subsByMission = useMemo(() => {
    const m = new Map<string, typeof subtasks>();
    for (const s of subtasks) {
      if (!m.has(s.mission_id)) m.set(s.mission_id, [] as any);
      m.get(s.mission_id)!.push(s);
    }
    return m;
  }, [subtasks]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Crosshair className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight">Missões</h1>
            <p className="text-sm text-muted-foreground">
              Toda a alcateia vê as missões. Puxe uma subtarefa, coloque seu nome e ganhe <b>+100 pontos</b> ao concluir.
            </p>
          </div>
          <div className="shrink-0">{isMaster && <NewMission />}</div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{missions.length} missões cadastradas</p>
        </div>

        <div className="grid min-w-0 gap-4">
          {missions.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma missão criada ainda. Crie a primeira para mobilizar a alcateia.
            </Card>
          )}
          {missions.map((m) => (
            <MissionCard
              key={m.id}
              mission={m}
              subtasks={subsByMission.get(m.id) ?? []}
              peopleMap={peopleMap}
              currentUserId={profile?.id}
              isMaster={isMaster}
            />
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

function MissionCard({
  mission,
  subtasks,
  peopleMap,
  currentUserId,
  isMaster,
}: {
  mission: any;
  subtasks: any[];
  peopleMap: Map<string, { full_name: string; avatar_url?: string | null }>;
  currentUserId?: string;
  isMaster: boolean;
}) {
  const claim = useClaimSubtask();
  const release = useReleaseSubtask();
  const complete = useCompleteSubtask();
  const addSub = useAddSubtask();
  const updateSub = useUpdateSubtask();
  const updateMission = useUpdateMission();
  const deleteMission = useDeleteMission();
  const [newSub, setNewSub] = useState('');
  const [newSubDue, setNewSubDue] = useState('');

  const total = subtasks.length;
  const done = subtasks.filter((s) => s.status === 'completed').length;

  const today = new Date(); today.setHours(0,0,0,0);

  return (
    <Card className="min-w-0 overflow-hidden p-4 sm:p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Target className="h-5 w-5 text-primary shrink-0" />
          <h3 className="min-w-0 flex-1 font-semibold leading-snug break-words">
            {isMaster ? (
              <InlineText wrap value={mission.name} onSave={(v) => updateMission.mutateAsync({ id: mission.id, name: v })} />
            ) : <span className="break-words">{mission.name}</span>}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={mission.status === 'active' ? 'default' : 'secondary'}>{mission.status}</Badge>
          {isMaster && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive h-7 w-7 p-0"
              onClick={() => {
                if (confirm('Remover esta missão e suas subtarefas?')) deleteMission.mutate(mission.id);
              }}
              title="Remover missão"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      {(mission.description || isMaster) && (
        <div className="mt-2 flex items-start gap-2">
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground break-words [overflow-wrap:anywhere] whitespace-pre-wrap">
            {mission.description || <span className="italic opacity-60">Sem descrição</span>}
          </p>
          {isMaster && (
            <EditDescriptionDialog
              missionId={mission.id}
              current={mission.description ?? ''}
              onSave={(v) => updateMission.mutateAsync({ id: mission.id, description: v })}
            />
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="min-w-0 text-muted-foreground break-words">
          {isMaster ? (
            <InlineText
              wrap
              value={mission.category ?? ''}
              placeholder="Categoria"
              onSave={(v) => updateMission.mutateAsync({ id: mission.id, category: v })}
            />
          ) : (mission.category ?? 'Geral')}
        </span>
        <span className="shrink-0 font-semibold text-primary">+100 pts por subtarefa puxada</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <CalendarIcon className="h-3 w-3" /> Prazo da missão:
        {isMaster ? (
          <input
            type="date"
            value={mission.deadline ?? ''}
            onChange={(e) => updateMission.mutate({ id: mission.id, deadline: e.target.value || null })}
            className="bg-transparent border border-transparent hover:border-input rounded px-1 text-xs"
          />
        ) : mission.deadline ? (
          <span>{new Date(mission.deadline).toLocaleDateString('pt-BR')}</span>
        ) : (
          <span>sem prazo</span>
        )}
      </div>

      <div className="mt-4 border-t pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Subtarefas</span>
          <span className="text-xs text-muted-foreground">{done}/{total} concluídas</span>
        </div>
        {subtasks.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma subtarefa adicionada ainda.</p>
        )}
        <ul className="min-w-0 space-y-2">
          {subtasks.map((s) => {
            const claimer = s.claimed_by ? peopleMap.get(s.claimed_by) : null;
            const mine = s.claimed_by && s.claimed_by === currentUserId;
            const canEditTitle = isMaster || mine;
            const due = s.due_date ? new Date(s.due_date + 'T00:00:00') : null;
            const overdue = due && due < today && s.status !== 'completed';
            return (
              <li key={s.id} className="grid min-w-0 grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className={`text-sm break-words ${s.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {canEditTitle ? (
                      <InlineText wrap value={s.title} onSave={(v) => updateSub.mutateAsync({ id: s.id, title: v })} />
                    ) : <span className="break-words">{s.title}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    {claimer && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Avatar className="h-4 w-4 shrink-0">
                          {claimer.avatar_url && <AvatarImage src={claimer.avatar_url} />}
                          <AvatarFallback className="text-[8px]">{initials(claimer.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 break-words">Puxada por <b>{claimer.full_name}</b></span>
                      </div>
                    )}
                    <div className={`flex items-center gap-1 ${overdue ? 'text-destructive font-medium' : ''}`}>
                      <CalendarIcon className="h-3 w-3 shrink-0" />
                      {canEditTitle ? (
                        <input
                          type="date"
                          value={s.due_date ?? ''}
                          onChange={(e) => updateSub.mutate({ id: s.id, due_date: e.target.value || null })}
                          className="bg-transparent border border-transparent hover:border-input rounded px-1 text-[11px] w-[130px]"
                        />
                      ) : due ? (
                        <span>{due.toLocaleDateString('pt-BR')}</span>
                      ) : (
                        <span>sem prazo</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:ml-auto">
                  {s.status === 'completed' ? (
                    <Badge variant="secondary" className="text-emerald-700 bg-emerald-500/15 border-emerald-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Concluída
                    </Badge>
                  ) : !s.claimed_by ? (
                    <Button size="sm" variant="outline" onClick={() => claim.mutate(s.id)} disabled={claim.isPending}>
                      <Hand className="h-3.5 w-3.5 mr-1" /> Puxar
                    </Button>
                  ) : mine ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => release.mutate(s.id)} title="Liberar">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" onClick={() => complete.mutate(s.id)} disabled={complete.isPending}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Concluir
                      </Button>
                    </>
                  ) : isMaster ? (
                    <Button size="sm" variant="ghost" onClick={() => release.mutate(s.id)} title="Liberar">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                  {isMaster && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={async () => {
                        await (supabase as any).from('gamification_mission_subtasks').delete().eq('id', s.id);
                      }}
                      title="Apagar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </li>

            );
          })}
        </ul>
        {isMaster && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
            <Input
              placeholder="Nova subtarefa…"
              value={newSub}
              className="min-w-0"
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSub.trim()) {
                  addSub.mutate({ mission_id: mission.id, title: newSub.trim(), due_date: newSubDue || null });
                  setNewSub(''); setNewSubDue('');
                }
              }}
            />
            <Input
              type="date"
              value={newSubDue}
              onChange={(e) => setNewSubDue(e.target.value)}
              className="w-full"
              title="Prazo (opcional)"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={!newSub.trim() || addSub.isPending}
              onClick={() => {
                addSub.mutate({ mission_id: mission.id, title: newSub.trim(), due_date: newSubDue || null });
                setNewSub(''); setNewSubDue('');
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}


function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('');
}

function NewMission() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    stars_reward: 100,
    deadline: '',
    criteria: '',
  });
  const [subtasks, setSubtasks] = useState<string[]>(['']);
  const create = useCreateMission();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" /> Nova missão
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar missão</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div>
              <Label>Prazo</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Critério</Label>
            <Textarea
              value={form.criteria}
              onChange={(e) => setForm({ ...form, criteria: e.target.value })}
            />
          </div>

          <div>
            <Label>Subtarefas (cada uma vale 100 pts para quem puxar)</Label>
            <div className="space-y-2 mt-1">
              {subtasks.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Subtarefa ${i + 1}`}
                    value={s}
                    onChange={(e) => {
                      const next = [...subtasks];
                      next[i] = e.target.value;
                      setSubtasks(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSubtasks(subtasks.filter((_, j) => j !== i))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setSubtasks([...subtasks, ''])}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar subtarefa
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!form.name || create.isPending}
            onClick={async () => {
              await create.mutateAsync({
                ...form,
                deadline: form.deadline || undefined,
                subtasks: subtasks.filter(s => s.trim()),
              });
              setOpen(false);
              setForm({
                name: '',
                description: '',
                category: '',
                stars_reward: 100,
                deadline: '',
                criteria: '',
              });
              setSubtasks(['']);
            }}
          >
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDescriptionDialog({
  current,
  onSave,
}: {
  missionId: string;
  current: string;
  onSave: (v: string) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setValue(current);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 shrink-0 p-0" title="Editar descrição">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar descrição da missão</DialogTitle>
        </DialogHeader>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          placeholder="Descreva a missão..."
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(value);
                setOpen(false);
              } finally {
                setSaving(false);
              }
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
