import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/use-profile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { KeyRound, Plus, Search, Eye, EyeOff, Copy, Pencil, Trash2, ExternalLink, Lock, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/passwords')({
  component: PasswordsPage,
});

interface Entry {
  id: string;
  title: string;
  username: string | null;
  password: string;
  url: string | null;
  category: string | null;
  notes: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

function PasswordsPage() {
  const { role, profile, loading: profileLoading } = useProfile();
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ title: '', username: '', password: '', url: '', category: '', notes: '' });

  // Liberado para todos os colaboradores internos (não-clientes).
  const isMaster = role === 'master' || role === 'project_manager' || role === 'consultant';

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('password_entries').select('*').order('title');
    if (error) toast.error(error.message);
    else setItems((data || []) as Entry[]);
    setLoading(false);
  };

  useEffect(() => { if (isMaster) load(); }, [isMaster]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return items;
    return items.filter(i =>
      i.title.toLowerCase().includes(s) ||
      i.username?.toLowerCase().includes(s) ||
      i.category?.toLowerCase().includes(s) ||
      i.url?.toLowerCase().includes(s)
    );
  }, [items, search]);

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', username: '', password: '', url: '', category: '', notes: '' });
    setOpen(true);
  };

  const openEdit = (e: Entry) => {
    setEditing(e);
    setForm({
      title: e.title, username: e.username || '', password: e.password,
      url: e.url || '', category: e.category || '', notes: e.notes || '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.password) { toast.error('Título e senha são obrigatórios'); return; }
    if (editing) {
      const { error } = await supabase.from('password_entries').update({
        title: form.title.trim(),
        username: form.username || null,
        password: form.password,
        url: form.url || null,
        category: form.category || null,
        notes: form.notes || null,
      }).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Atualizado');
    } else {
      if (!profile?.id) { toast.error('Sessão inválida'); return; }
      const { error } = await supabase.from('password_entries').insert({
        title: form.title.trim(),
        username: form.username || null,
        password: form.password,
        url: form.url || null,
        category: form.category || null,
        notes: form.notes || null,
        owner_id: profile.id,
      });
      if (error) { toast.error(error.message); return; }
      toast.success('Senha salva');
    }
    setOpen(false);
    load();
  };

  const remove = async (e: Entry) => {
    if (!confirm(`Excluir "${e.title}"?`)) return;
    const { error } = await supabase.from('password_entries').delete().eq('id', e.id);
    if (error) toast.error(error.message);
    else { toast.success('Excluído'); load(); }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  if (profileLoading) {
    return <MainLayout><div className="p-8 text-muted-foreground">Carregando…</div></MainLayout>;
  }

  if (!isMaster) {
    return (
      <MainLayout>
        <Card className="max-w-md mx-auto mt-12">
          <CardHeader className="text-center">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>Este módulo é exclusivo para Super Admin.</CardDescription>
          </CardHeader>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <KeyRound className="h-7 w-7 text-primary" /> Senhas
            </h1>
            <p className="text-muted-foreground text-sm">Cofre interno de credenciais — acesso restrito a Super Admin.</p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nova senha</Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por título, usuário, categoria…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Carregando…</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{items.length === 0 ? 'Nenhuma senha cadastrada.' : 'Nenhum resultado.'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(e => {
              const show = revealed[e.id];
              return (
                <Card key={e.id} className="hover:border-primary/40 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate">{e.title}</CardTitle>
                        {e.category && <Badge variant="outline" className="mt-1 text-xs">{e.category}</Badge>}
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(e)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0 text-sm">
                    {e.username && (
                      <div className="flex items-center justify-between gap-2 group">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Usuário</p>
                          <p className="truncate font-mono text-xs">{e.username}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => copy(e.username!, 'Usuário')}><Copy className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 group">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Senha</p>
                        <p className="truncate font-mono text-xs">{show ? e.password : '•'.repeat(Math.min(12, e.password.length))}</p>
                      </div>
                      <div className="flex gap-0.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setRevealed(r => ({ ...r, [e.id]: !r[e.id] }))}>
                          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(e.password, 'Senha')}><Copy className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    {e.url && (
                      <a href={e.url.startsWith('http') ? e.url : `https://${e.url}`} target="_blank" rel="noopener noreferrer"
                         className="flex items-center gap-1 text-xs text-primary hover:underline truncate">
                        <ExternalLink className="h-3 w-3 shrink-0" /> {e.url}
                      </a>
                    )}
                    {e.notes && <p className="text-xs text-muted-foreground line-clamp-2">{e.notes}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar senha' : 'Nova senha'}</DialogTitle>
            <DialogDescription>Dados ficam visíveis apenas para Super Admin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label>Título *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Gmail da empresa" maxLength={120} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Categoria</Label>
                <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ex: E-mail, Redes sociais" maxLength={60} />
              </div>
              <div className="grid gap-1.5">
                <Label>URL</Label>
                <Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." maxLength={300} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Usuário / Email</Label>
              <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} maxLength={200} />
            </div>
            <div className="grid gap-1.5">
              <Label>Senha *</Label>
              <Input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="font-mono" maxLength={500} />
            </div>
            <div className="grid gap-1.5">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} maxLength={2000} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? 'Salvar' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
