import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Copy, Link as LinkIcon, Plus, Loader2, Search, Ban, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  listRegistrations, listInvites, createInvite, invalidateInvite, deleteRegistration,
} from '@/lib/onboarding.functions';

export const Route = createFileRoute('/registrations')({
  component: () => <Outlet />,
});

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_analise: 'Em Análise',
  aguardando_correcao: 'Aguardando Correção',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pendente: 'secondary',
  em_analise: 'outline',
  aguardando_correcao: 'outline',
  aprovado: 'default',
  reprovado: 'destructive',
};

export function RegistrationsListPage() {
  const [newClientOpen, setNewClientOpen] = useState(false);

  return (
    <MainLayout>
      <div className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">Formulário de Clientes</h1>
            <p className="text-xs text-muted-foreground">Gere um link de onboarding e acompanhe as fichas recebidas.</p>
          </div>
          <Button onClick={() => setNewClientOpen(true)} size="sm" className="rounded-full">
            <Plus className="h-4 w-4 mr-1" /> Novo Cliente
          </Button>
        </header>
        <Tabs defaultValue="registrations">
          <TabsList className="h-9">
            <TabsTrigger value="registrations" className="text-xs">Cadastros</TabsTrigger>
            <TabsTrigger value="invites" className="text-xs">Convites</TabsTrigger>
            <TabsTrigger value="visao" className="text-xs">Visão de Clientes</TabsTrigger>
          </TabsList>
          <TabsContent value="registrations" className="mt-3"><RegistrationsTab /></TabsContent>
          <TabsContent value="invites" className="mt-3"><InvitesTab /></TabsContent>
          <TabsContent value="visao" className="mt-3"><VisaoClientesPanel embedded /></TabsContent>
        </Tabs>
        <NewClientDialog open={newClientOpen} onOpenChange={setNewClientOpen} />
      </div>
    </MainLayout>
  );
}

function NewClientDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createInvite);
  const [form, setForm] = useState({ contact_name: '', contact_email: '', company_hint: '' });
  const createMut = useMutation({
    mutationFn: () => createFn({ data: form }),
    onSuccess: (row: any) => {
      const url = `${window.location.origin}/onboarding/${row.token}`;
      navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Convite criado! Link copiado.', { description: url });
      onOpenChange(false);
      setForm({ contact_name: '', contact_email: '', company_hint: '' });
      qc.invalidateQueries({ queryKey: ['onboarding-invites'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao criar convite'),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Convite de Onboarding</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Empresa (opcional)</Label>
            <Input value={form.company_hint} onChange={(e) => setForm({ ...form, company_hint: e.target.value })} />
          </div>
          <div>
            <Label>Nome do contato (opcional)</Label>
            <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
          </div>
          <div>
            <Label>E-mail (opcional)</Label>
            <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          </div>
          <p className="text-xs text-muted-foreground">O link expira em 72h e só pode ser usado uma vez.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            {createMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <LinkIcon className="h-4 w-4 mr-1.5" /> Gerar Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RegistrationsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listRegistrations);
  const deleteFn = useServerFn(deleteRegistration);
  const { data = [], isLoading } = useQuery({
    queryKey: ['client-registrations'],
    queryFn: () => listFn({}),
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'old' | 'az' | 'za'>('recent');
  const [toDelete, setToDelete] = useState<any | null>(null);

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success('Cadastro excluído');
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ['client-registrations'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao excluir'),
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: data.length };
    for (const k of Object.keys(STATUS_LABELS)) c[k] = 0;
    data.forEach((r: any) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [data]);

  const filtered = useMemo(() => {
    let arr = [...data];
    if (statusFilter !== 'all') arr = arr.filter((r: any) => r.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter((r: any) =>
        [r.trade_name, r.legal_name, r.cnpj, r.email, r.contact_name].some((f) => (f || '').toLowerCase().includes(q)),
      );
    }
    arr.sort((a: any, b: any) => {
      if (sort === 'recent') return +new Date(b.submitted_at) - +new Date(a.submitted_at);
      if (sort === 'old') return +new Date(a.submitted_at) - +new Date(b.submitted_at);
      if (sort === 'az') return (a.trade_name || '').localeCompare(b.trade_name || '');
      return (b.trade_name || '').localeCompare(a.trade_name || '');
    });
    return arr;
  }, [data, statusFilter, search, sort]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <StatCard label="Total" value={counts.total} tone="neutral" />
        <StatCard label="Pendentes" value={counts.pendente} tone="amber" />
        <StatCard label="Em Análise" value={counts.em_analise} tone="blue" />
        <StatCard label="Aguard. Correção" value={counts.aguardando_correcao} tone="orange" />
        <StatCard label="Aprovados" value={counts.aprovado} tone="green" />
        <StatCard label="Reprovados" value={counts.reprovado} tone="red" />
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, CNPJ, e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v: any) => setSort(v)}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="old">Mais antigos</SelectItem>
                <SelectItem value="az">Nome A-Z</SelectItem>
                <SelectItem value="za">Nome Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm border border-dashed rounded-lg">
              <div className="text-3xl mb-1">📭</div>
              Nenhum cadastro encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Enviado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.trade_name}</TableCell>
                    <TableCell className="font-mono text-xs">{r.cnpj}</TableCell>
                    <TableCell>{r.contact_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.email}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.submitted_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/registrations/$id" params={{ id: r.id }}>Abrir</Link>
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setToDelete(r)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cadastro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cadastro de <strong>{toDelete?.trade_name}</strong> e todo o seu histórico serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); if (toDelete) deleteMut.mutate(toDelete.id); }}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const TONE_STYLES: Record<string, string> = {
  neutral: 'bg-muted/40 text-foreground',
  amber: 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  blue: 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
  orange: 'bg-orange-50 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200',
  green: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  red: 'bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
};

function StatCard({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: string }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${TONE_STYLES[tone]}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-70 leading-tight">{label}</div>
      <div className="text-xl font-semibold font-display leading-tight mt-0.5">{value ?? 0}</div>
    </div>
  );
}

function InvitesTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listInvites);
  const createFn = useServerFn(createInvite);
  const invalidateFn = useServerFn(invalidateInvite);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ contact_name: '', contact_email: '', company_hint: '' });

  const { data = [], isLoading } = useQuery({ queryKey: ['onboarding-invites'], queryFn: () => listFn({}) });

  const createMut = useMutation({
    mutationFn: () => createFn({ data: form }),
    onSuccess: (row: any) => {
      const url = `${window.location.origin}/onboarding/${row.token}`;
      navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Convite criado! Link copiado.', { description: url });
      setOpen(false);
      setForm({ contact_name: '', contact_email: '', company_hint: '' });
      qc.invalidateQueries({ queryKey: ['onboarding-invites'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao criar convite'),
  });

  const invMut = useMutation({
    mutationFn: (id: string) => invalidateFn({ data: { id } }),
    onSuccess: () => { toast.success('Convite invalidado'); qc.invalidateQueries({ queryKey: ['onboarding-invites'] }); },
  });

  function copyLink(token: string) {
    const url = `${window.location.origin}/onboarding/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Convites Enviados</h3>
          <Button onClick={() => setOpen(true)} size="sm"><Plus className="h-4 w-4 mr-1.5" /> Novo Convite</Button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Nenhum convite ainda.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Gerado por</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.company_hint || '—'}</TableCell>
                  <TableCell className="text-sm">{inv.contact_name || '—'}<div className="text-xs text-muted-foreground">{inv.contact_email}</div></TableCell>
                  <TableCell className="text-sm">{inv.created_by_name || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(inv.expires_at).toLocaleString('pt-BR')}</TableCell>
                  <TableCell><Badge variant={inv.status === 'active' ? 'default' : 'secondary'}>{inv.status}</Badge></TableCell>
                  <TableCell className="space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => copyLink(inv.token)}><Copy className="h-3.5 w-3.5" /></Button>
                    {inv.status === 'active' && (
                      <Button size="sm" variant="ghost" onClick={() => invMut.mutate(inv.id)}><Ban className="h-3.5 w-3.5" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Convite de Onboarding</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Empresa (opcional)</Label>
              <Input value={form.company_hint} onChange={(e) => setForm({ ...form, company_hint: e.target.value })} />
            </div>
            <div>
              <Label>Nome do contato (opcional)</Label>
              <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div>
              <Label>E-mail (opcional)</Label>
              <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">O link expira em 72h e só pode ser usado uma vez.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <LinkIcon className="h-4 w-4 mr-1.5" /> Gerar Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
