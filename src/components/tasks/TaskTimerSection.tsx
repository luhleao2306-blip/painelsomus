import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/use-profile';
import { useData, Task } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, Clock, Trash2, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';

export interface TimeSession {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  is_manual: boolean;
  note: string | null;
}

export function formatHM(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}min`;
  return `${h}h ${m.toString().padStart(2, '0')}min`;
}

export function useTaskSessions(taskId: string | null | undefined) {
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!taskId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('task_time_sessions')
      .select('*')
      .eq('task_id', taskId)
      .order('started_at', { ascending: false });
    if (!error) setSessions((data ?? []) as TimeSession[]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    if (!taskId) return;
    const ch = supabase
      .channel(`task-sessions-${taskId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_time_sessions', filter: `task_id=eq.${taskId}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  return { sessions, loading, refresh };
}

interface Props {
  task: Task;
}

export function TaskTimerSection({ task }: Props) {
  const { profile, role } = useProfile();
  const { updateTask } = useData();
  const { sessions, refresh } = useTaskSessions(task.id);
  const [tick, setTick] = useState(0);
  const isAdmin = role === 'master' || role === 'project_manager';
  const canControlOwn =
    isAdmin ||
    task.assignee === profile?.id ||
    task.assignee === profile?.full_name;

  // Find open session for current user
  const myOpen = useMemo(
    () => sessions.find(s => !s.ended_at && s.user_id === profile?.id),
    [sessions, profile?.id]
  );
  const anyOpen = useMemo(() => sessions.find(s => !s.ended_at), [sessions]);

  useEffect(() => {
    if (!anyOpen) return;
    const i = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(i);
  }, [anyOpen]);

  const liveSeconds = useMemo(() => {
    let total = sessions.reduce((s, x) => s + (x.duration_seconds || 0), 0);
    if (anyOpen) {
      total += Math.floor((Date.now() - new Date(anyOpen.started_at).getTime()) / 1000);
    }
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, anyOpen, tick]);

  const handlePlay = async () => {
    if (!profile?.id) return;
    if (myOpen) return;
    const { error } = await supabase.from('task_time_sessions').insert({
      task_id: task.id,
      user_id: profile.id,
      started_at: new Date().toISOString(),
    });
    if (error) { toast.error('Não foi possível iniciar o timer'); return; }
    if (task.status !== 'Em andamento' && task.status !== 'Concluído') {
      await updateTask(task.id, { status: 'Em andamento' });
    }
    toast.success('Timer iniciado');
    refresh();
  };

  const handlePause = async (sessionId?: string) => {
    const target = sessionId
      ? sessions.find(s => s.id === sessionId)
      : myOpen;
    if (!target) return;
    const end = new Date();
    const duration = Math.max(
      0,
      Math.floor((end.getTime() - new Date(target.started_at).getTime()) / 1000),
    );
    const { error } = await supabase
      .from('task_time_sessions')
      .update({ ended_at: end.toISOString(), duration_seconds: duration })
      .eq('id', target.id);
    if (error) { toast.error('Erro ao pausar'); return; }
    toast.success(`Sessão registrada: ${formatHM(duration)}`);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Excluir esta sessão?')) return;
    const { error } = await supabase.from('task_time_sessions').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    refresh();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border/50 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg grid place-items-center bg-primary/10 text-primary">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Tempo investido</p>
            <p className="text-2xl font-black tabular-nums">{formatHM(liveSeconds)}</p>
          </div>
          {anyOpen && (
            <Badge className="ml-2 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 animate-pulse">
              Timer ativo
            </Badge>
          )}
          {!anyOpen && sessions.length > 0 && (
            <Badge variant="secondary" className="ml-2">Pausado</Badge>
          )}
          {sessions.length === 0 && (
            <Badge variant="outline" className="ml-2 text-muted-foreground">Sem tempo registrado</Badge>
          )}
        </div>

        {canControlOwn && (
          <div className="flex items-center gap-2">
            {myOpen ? (
              <Button onClick={() => handlePause()} variant="secondary" className="gap-2">
                <Pause className="h-4 w-4" /> Pause
              </Button>
            ) : (
              <Button onClick={handlePlay} className="gap-2">
                <Play className="h-4 w-4" /> Play
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Manual adjust (admins) */}
      {isAdmin && <ManualAdjust taskId={task.id} onDone={refresh} />}

      {/* History */}
      <div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
          Histórico de sessões ({sessions.length})
        </p>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma sessão registrada.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <SessionRow
                key={s.id}
                session={s}
                onPause={() => handlePause(s.id)}
                onDelete={() => handleDelete(s.id)}
                isAdmin={isAdmin}
                isMine={s.user_id === profile?.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionRow({
  session, onPause, onDelete, isAdmin, isMine,
}: { session: TimeSession; onPause: () => void; onDelete: () => void; isAdmin: boolean; isMine: boolean }) {
  const [userName, setUserName] = useState<string>('');
  useEffect(() => {
    let active = true;
    supabase.from('profiles').select('full_name').eq('id', session.user_id).maybeSingle()
      .then(({ data }) => { if (active) setUserName(data?.full_name ?? 'Usuário'); });
    return () => { active = false; };
  }, [session.user_id]);

  const open = !session.ended_at;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/40">
      <div className={`h-2.5 w-2.5 rounded-full ${open ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {userName}
          {session.is_manual && <Badge variant="outline" className="ml-2 text-[9px]">Manual</Badge>}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(session.started_at).toLocaleString()} →{' '}
          {session.ended_at ? new Date(session.ended_at).toLocaleString() : 'em andamento'}
        </p>
      </div>
      <div className="text-sm font-bold tabular-nums">{formatHM(session.duration_seconds)}</div>
      {open && (isMine || isAdmin) && (
        <Button size="sm" variant="ghost" onClick={onPause}><Pause className="h-3.5 w-3.5" /></Button>
      )}
      {isAdmin && (
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function ManualAdjust({ taskId, onDone }: { taskId: string; onDone: () => void }) {
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('0');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!profile?.id) return;
    const total = (parseInt(hours || '0', 10) * 3600) + (parseInt(minutes || '0', 10) * 60);
    if (total <= 0) { toast.error('Informe um tempo válido'); return; }
    setSaving(true);
    const now = new Date();
    const start = new Date(now.getTime() - total * 1000);
    const { error } = await supabase.from('task_time_sessions').insert({
      task_id: taskId,
      user_id: profile.id,
      started_at: start.toISOString(),
      ended_at: now.toISOString(),
      duration_seconds: total,
      is_manual: true,
      note: note || null,
    });
    setSaving(false);
    if (error) { toast.error('Erro ao registrar ajuste'); return; }
    toast.success('Ajuste manual registrado');
    setHours('0'); setMinutes('0'); setNote(''); setOpen(false);
    onDone();
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-3.5 w-3.5" /> Ajuste manual de tempo
      </Button>
    );
  }
  return (
    <div className="p-4 rounded-xl border border-dashed border-border/60 space-y-3 bg-muted/20">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ajuste manual</p>
      <div className="grid grid-cols-3 gap-2">
        <div><Label className="text-xs">Horas</Label><Input type="number" min="0" value={hours} onChange={e => setHours(e.target.value)} /></div>
        <div><Label className="text-xs">Minutos</Label><Input type="number" min="0" max="59" value={minutes} onChange={e => setMinutes(e.target.value)} /></div>
        <div><Label className="text-xs">Observação</Label><Input value={note} onChange={e => setNote(e.target.value)} placeholder="Opcional" /></div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}><Save className="h-3.5 w-3.5 mr-1" /> Salvar</Button>
      </div>
    </div>
  );
}
