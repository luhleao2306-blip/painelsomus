import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Eye, EyeOff, Copy, Trash2, Plus, Search, KeyRound, Shield, Lock,
  ChevronRight, Building2, Fingerprint,
} from 'lucide-react';
import { useOpStore, opStore, type OpSenha } from '@/lib/operacoes-store';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { OpPageHeader } from '@/components/operacoes/OpPageHeader';

export const Route = createFileRoute('/operacoes/senhas')({
  component: OperacoesSenhas,
});

type Vault = { clientName: string; entries: OpSenha[] };

function OperacoesSenhas() {
  const store = useOpStore();
  const [q, setQ] = useState('');
  const [openVault, setOpenVault] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [prefilledClient, setPrefilledClient] = useState<string | undefined>();

  const vaults = useMemo<Vault[]>(() => {
    const map = new Map<string, OpSenha[]>();
    for (const s of store.senhas) {
      const key = s.clientName || 'Sem cliente';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries())
      .map(([clientName, entries]) => ({ clientName, entries }))
      .sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [store.senhas]);

  const filteredVaults = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return vaults;
    return vaults
      .map(v => ({
        ...v,
        entries: v.entries.filter(
          e => v.clientName.toLowerCase().includes(term)
            || e.service.toLowerCase().includes(term)
            || (e.username ?? '').toLowerCase().includes(term),
        ),
      }))
      .filter(v => v.clientName.toLowerCase().includes(term) || v.entries.length > 0);
  }, [vaults, q]);

  const totalEntries = store.senhas.length;
  const activeVault = openVault ? vaults.find(v => v.clientName === openVault) : null;

  return (
    <div className="py-8">
      <OpPageHeader
        eyebrow="Cofre da alcateia"
        title="Cofre de Senhas"
        description="Um cofre por cliente — credenciais mascaradas por padrão, acesso restrito à liderança."
        icon={<Lock className="h-4 w-4" />}
        actions={
          <Button size="sm" onClick={() => { setPrefilledClient(undefined); setShowNew(true); }}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Nova credencial
          </Button>
        }
      />

      {/* Stats strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Cofres" value={vaults.length} icon={<Building2 className="h-3.5 w-3.5" />} />
        <StatTile label="Credenciais" value={totalEntries} icon={<KeyRound className="h-3.5 w-3.5" />} />
        <StatTile label="Criptografia" value="Local · MVP" icon={<Fingerprint className="h-3.5 w-3.5" />} muted />
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[12px] text-amber-300">
        <Shield className="h-4 w-4 shrink-0" />
        <span>Armazenamento local apenas para MVP. Migrar para o backend antes do uso em produção.</span>
      </div>

      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar cofre, serviço ou usuário..." className="pl-9" />
      </div>

      {/* Vault grid */}
      {filteredVaults.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 bg-card p-14 text-center text-sm text-muted-foreground">
          <Lock className="h-6 w-6 opacity-60" />
          Nenhum cofre encontrado. Cadastre uma credencial para criar o primeiro cofre.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVaults.map(v => (
            <VaultCard
              key={v.clientName}
              vault={v}
              onOpen={() => setOpenVault(v.clientName)}
              onAdd={() => { setPrefilledClient(v.clientName); setShowNew(true); }}
            />
          ))}
        </div>
      )}

      <VaultDialog
        vault={activeVault}
        onOpenChange={(o) => !o && setOpenVault(null)}
        onAdd={() => { if (activeVault) { setPrefilledClient(activeVault.clientName); setShowNew(true); } }}
      />

      <NewSenhaDialog
        open={showNew}
        onOpenChange={setShowNew}
        defaultClientName={prefilledClient}
      />
    </div>
  );
}

/* -------------------- Vault Card -------------------- */

function VaultCard({ vault, onOpen, onAdd }: { vault: Vault; onOpen: () => void; onAdd: () => void }) {
  const initials = vault.clientName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <button
      onClick={onOpen}
      className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-b from-card to-card/40 p-4 text-left transition-all hover:border-foreground/30 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.2)]"
    >
      <div className="pointer-events-none absolute -top-24 -right-16 h-40 w-40 rounded-full bg-foreground/[0.04] blur-2xl" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-border/60 bg-foreground/[0.05] text-[13px] font-semibold">
            {initials || <Lock className="h-4 w-4" />}
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-border/60 bg-background">
              <Lock className="h-2.5 w-2.5 text-foreground/70" />
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{vault.clientName}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Cofre do cliente
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="font-display text-[22px] font-semibold leading-none tabular-nums">
            {vault.entries.length}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {vault.entries.length === 1 ? 'credencial' : 'credenciais'}
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onAdd(); } }}
          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/40 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3 w-3" /> Adicionar
        </div>
      </div>

      {vault.entries.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {vault.entries.slice(0, 4).map(e => (
            <span
              key={e.id}
              className="rounded-md border border-border/50 bg-foreground/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {e.service}
            </span>
          ))}
          {vault.entries.length > 4 && (
            <span className="rounded-md border border-border/50 bg-foreground/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              +{vault.entries.length - 4}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

/* -------------------- Vault Dialog -------------------- */

function VaultDialog({
  vault, onOpenChange, onAdd,
}: { vault: Vault | null | undefined; onOpenChange: (o: boolean) => void; onAdd: () => void }) {
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  const copy = async (pw: string) => {
    try {
      await navigator.clipboard.writeText(opStore.revealPassword(pw));
      toast.success('Senha copiada');
    } catch { toast.error('Falha ao copiar'); }
  };

  return (
    <Dialog open={!!vault} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-foreground/[0.05]">
              <Lock className="h-3.5 w-3.5" />
            </div>
            <div>
              <DialogTitle className="text-base">{vault?.clientName}</DialogTitle>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {vault?.entries.length ?? 0} credenciais
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border/60">
          {!vault || vault.entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Cofre vazio.</div>
          ) : (
            <div className="divide-y divide-border/60">
              {vault.entries.map(s => (
                <div key={s.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">{s.service}</p>
                      {s.notes && <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted-foreground">{s.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setReveal(r => ({ ...r, [s.id]: !r[s.id] }))}>
                        {reveal[s.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => copy(s.password)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => { if (confirm(`Excluir "${s.service}"?`)) opStore.removeSenha(s.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <FieldReadout label="Usuário" value={s.username || '—'} />
                    <FieldReadout
                      label="Senha"
                      value={reveal[s.id] ? opStore.revealPassword(s.password) : '••••••••••'}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={onAdd}><Plus className="mr-1 h-3.5 w-3.5" /> Nova credencial</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldReadout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/50 bg-background/40 px-2 py-1.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-mono text-[12px]">{value}</p>
    </div>
  );
}

function StatTile({
  label, value, icon, muted,
}: { label: string; value: string | number; icon: React.ReactNode; muted?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-b from-card to-card/40 p-3.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <div className="flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-foreground/[0.05]">{icon}</div>
      </div>
      <div className={`mt-2 font-display font-semibold leading-none tabular-nums ${muted ? 'text-[15px] text-muted-foreground' : 'text-[22px]'}`}>
        {value}
      </div>
    </div>
  );
}

/* -------------------- New Credential -------------------- */

function NewSenhaDialog({
  open, onOpenChange, defaultClientName,
}: { open: boolean; onOpenChange: (b: boolean) => void; defaultClientName?: string }) {
  const { clients } = useData();
  const [form, setForm] = useState<Omit<OpSenha, 'id'>>({
    clientName: '', service: '', username: '', password: '', notes: '',
  });

  // Prefill when opening
  useEffect(() => {
    if (open) setForm(f => ({ ...f, clientName: defaultClientName ?? f.clientName }));
  }, [open, defaultClientName]);

  const clientOptions = useMemo(() => {
    const names = new Set<string>();
    clients.forEach(c => { if (c.name) names.add(c.name); });
    if (form.clientName) names.add(form.clientName);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [clients, form.clientName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova credencial</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</label>
            <Select
              value={form.clientName || undefined}
              onValueChange={(v) => setForm(f => ({ ...f, clientName: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={clientOptions.length ? 'Selecione um cliente' : 'Nenhum cliente cadastrado'} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {clientOptions.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Cadastre um cliente primeiro
                  </div>
                ) : clientOptions.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              toast.success('Credencial adicionada ao cofre');
            }}
          >Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
