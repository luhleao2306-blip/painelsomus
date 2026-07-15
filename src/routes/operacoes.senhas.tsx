import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Eye, EyeOff, Copy, Trash2, Plus, Search, KeyRound, Shield } from 'lucide-react';
import { useOpStore, opStore, type OpSenha } from '@/lib/operacoes-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { OpPageHeader } from '@/components/operacoes/OpPageHeader';

export const Route = createFileRoute('/operacoes/senhas')({
  component: OperacoesSenhas,
});

function OperacoesSenhas() {
  const store = useOpStore();
  const [q, setQ] = useState('');
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    if (!term) return store.senhas;
    return store.senhas.filter(s =>
      s.clientName.toLowerCase().includes(term) || s.service.toLowerCase().includes(term),
    );
  }, [store.senhas, q]);

  const copy = async (id: string, pw: string) => {
    try {
      await navigator.clipboard.writeText(opStore.revealPassword(pw));
      toast.success('Senha copiada');
    } catch { toast.error('Falha ao copiar'); }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-10">
      <OpPageHeader
        eyebrow="Cofre da alcateia"
        title="Senhas"
        description="Credenciais dos clientes — mascaradas por padrão, acesso restrito à liderança."
        icon={<KeyRound className="h-4 w-4" />}
        actions={<Button size="sm" onClick={() => setShowNew(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Nova credencial</Button>}
      />

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[12px] text-amber-800 dark:text-amber-300">
        <Shield className="h-4 w-4 shrink-0" />
        <span>Armazenamento local apenas para MVP. Migrar para o backend antes do uso em produção.</span>
      </div>


      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por cliente ou serviço..." className="pl-9" />
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <KeyRound className="h-6 w-6 opacity-60" />
            Nenhuma credencial encontrada.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map(s => (
              <div key={s.id} className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-[minmax(200px,1.4fr)_1fr_1fr_1.5fr_auto] sm:items-center">
                <div>
                  <p className="text-[13px] font-medium">{s.clientName}</p>
                  <p className="text-[11px] text-muted-foreground">{s.service}</p>
                </div>
                <div>
                  <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Usuário</p>
                  <p className="text-[12.5px] font-mono">{s.username || '—'}</p>
                </div>
                <div>
                  <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Senha</p>
                  <p className="text-[12.5px] font-mono">
                    {reveal[s.id] ? opStore.revealPassword(s.password) : '••••••••••'}
                  </p>
                </div>
                <div className="text-[11.5px] text-muted-foreground line-clamp-2">{s.notes ?? ''}</div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setReveal(r => ({ ...r, [s.id]: !r[s.id] }))} title={reveal[s.id] ? 'Ocultar' : 'Revelar'}>
                    {reveal[s.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => copy(s.id, s.password)} title="Copiar">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                    if (confirm(`Excluir credencial "${s.clientName} / ${s.service}"?`)) opStore.removeSenha(s.id);
                  }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NewSenhaDialog open={showNew} onOpenChange={setShowNew} />
    </div>
  );
}

function NewSenhaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const [form, setForm] = useState<Omit<OpSenha, 'id'>>({
    clientName: '', service: '', username: '', password: '', notes: '',
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova credencial</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</label>
            <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Serviço / Plataforma</label>
            <Input value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))} placeholder="Ex: Meta Ads, Kommo, Hospedagem..." />
          </div>
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Usuário / Login</label>
            <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Senha</label>
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Notas</label>
            <Textarea value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!form.clientName.trim() || !form.service.trim() || !form.password}
            onClick={() => {
              opStore.addSenha(form);
              onOpenChange(false);
              setForm({ clientName: '', service: '', username: '', password: '', notes: '' });
            }}
          >Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
