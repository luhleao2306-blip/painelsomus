import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Copy, Link as LinkIcon, Plus, Power, PowerOff, Loader2 } from 'lucide-react';

type InviteRole = 'master' | 'project_manager' | 'consultant' | 'client';

interface Invite {
  id: string;
  token: string;
  role: string;
  expires_at: string;
  max_uses: number;
  uses_count: number;
  active: boolean;
  note: string | null;
  created_at: string;
}

export function InviteLinksDialog({ open, onOpenChange, defaultRole = 'master' }: { open: boolean; onOpenChange: (o: boolean) => void; defaultRole?: InviteRole }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ max_uses: number; days: number; note: string; role: InviteRole }>({
    max_uses: 5, days: 7, note: '', role: defaultRole,
  });

  useEffect(() => {
    setForm((f) => ({ ...f, role: defaultRole }));
  }, [defaultRole, open]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('collaborator_invites')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setInvites((data || []) as Invite[]);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const create = async () => {
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Sessão expirada'); setCreating(false); return; }
    const expires_at = new Date(Date.now() + form.days * 86400_000).toISOString();
    const { error } = await supabase.from('collaborator_invites').insert({
      created_by: user.id,
      role: form.role,
      expires_at,
      max_uses: form.max_uses,
      note: form.note || null,
    });
    if (error) toast.error(error.message);
    else { toast.success('Link criado'); setForm({ max_uses: 5, days: 7, note: '', role: defaultRole }); load(); }
    setCreating(false);
  };

  const toggle = async (inv: Invite) => {
    const { error } = await supabase.from('collaborator_invites').update({ active: !inv.active }).eq('id', inv.id);
    if (error) toast.error(error.message); else load();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const roleLabels: Record<InviteRole, string> = {
    master: 'Administrador',
    project_manager: 'Gerente de Projetos',
    consultant: 'Consultor',
    client: 'Cliente',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5" /> Links de convite</DialogTitle>
          <DialogDescription>
            Gere links seguros para cadastrar colaboradores ou clientes. Defina tipo, validade e número de usos.
          </DialogDescription>
        </DialogHeader>

        <Card className="border-dashed">
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="role">Tipo de cadastro</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as InviteRole })}>
                <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Cliente (acesso ao portal)</SelectItem>
                  <SelectItem value="master">Colaborador · Administrador</SelectItem>
                  <SelectItem value="project_manager">Colaborador · Gerente de Projetos</SelectItem>
                  <SelectItem value="consultant">Colaborador · Consultor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="days">Validade (dias)</Label>
                <Input id="days" type="number" min={1} max={365} value={form.days}
                  onChange={(e) => setForm({ ...form, days: Math.max(1, Number(e.target.value) || 1) })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="uses">Máx. cadastros</Label>
                <Input id="uses" type="number" min={1} max={100} value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: Math.max(1, Number(e.target.value) || 1) })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="note">Observação (opcional)</Label>
              <Input id="note" maxLength={200} placeholder={form.role === 'client' ? 'Ex: Cliente Studio Grell' : 'Ex: time de design'} value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <Button onClick={create} disabled={creating} className="w-full">
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Gerar novo link
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-2 mt-2">
          <h3 className="text-sm font-medium text-muted-foreground">Links existentes</h3>
          {loading ? (
            <div className="text-center py-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
          ) : invites.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum link gerado ainda.</p>
          ) : invites.map((inv) => {
            const expired = new Date(inv.expires_at) < new Date();
            const exhausted = inv.uses_count >= inv.max_uses;
            const usable = inv.active && !expired && !exhausted;
            return (
              <Card key={inv.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={usable ? 'default' : 'secondary'}>
                          {!inv.active ? 'Desativado' : expired ? 'Expirado' : exhausted ? 'Esgotado' : 'Ativo'}
                        </Badge>
                        <Badge variant="outline">{roleLabels[inv.role as InviteRole] ?? inv.role}</Badge>
                        {inv.note && <span className="text-xs text-muted-foreground truncate">{inv.note}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Usos: {inv.uses_count}/{inv.max_uses} · Expira: {new Date(inv.expires_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => copyLink(inv.token)} disabled={!usable}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggle(inv)}>
                        {inv.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
