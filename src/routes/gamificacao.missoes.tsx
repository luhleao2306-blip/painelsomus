import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Target, Plus } from 'lucide-react';
import { useMissions, useCreateMission, canUserAward } from '@/lib/gamificacao-store';
import { useProfile } from '@/hooks/use-profile';

export const Route = createFileRoute('/gamificacao/missoes')({
  component: Missoes,
});

function Missoes() {
  const { profile, role } = useProfile();
  const { data: missions = [] } = useMissions();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{missions.length} missões cadastradas</p>
        {canUserAward(profile?.email, role) && <NewMission />}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {missions.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground md:col-span-2">
            Nenhuma missão criada ainda. Crie a primeira para mobilizar a alcateia.
          </Card>
        )}
        {missions.map(m => (
          <Card key={m.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{m.name}</h3>
              </div>
              <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>{m.status}</Badge>
            </div>
            {m.description && <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>}
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{m.category ?? 'Geral'}</span>
              <span className="font-semibold text-primary">+{m.stars_reward} ⭐</span>
            </div>
            {m.deadline && <p className="mt-1 text-xs text-muted-foreground">Prazo: {new Date(m.deadline).toLocaleDateString('pt-BR')}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}

function NewMission() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: '', stars_reward: 10, deadline: '', criteria: '' });
  const create = useCreateMission();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Nova missão</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Criar missão</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Categoria</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Estrelas</Label><Input type="number" value={form.stars_reward} onChange={e => setForm({ ...form, stars_reward: Number(e.target.value) })} /></div>
          </div>
          <div><Label>Prazo</Label><Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
          <div><Label>Critério</Label><Textarea value={form.criteria} onChange={e => setForm({ ...form, criteria: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!form.name || create.isPending} onClick={async () => {
            await create.mutateAsync({ ...form, deadline: form.deadline || undefined });
            setOpen(false);
            setForm({ name: '', description: '', category: '', stars_reward: 10, deadline: '', criteria: '' });
          }}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
