import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { ContractExpirationAlerts } from '@/components/financial/ContractExpirationAlerts';
import { ClientBirthdaysCard } from '@/components/clients/ClientBirthdaysCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSignature, Plus, Search, Eye, EyeOff, Edit, Trash2, Calendar, Download, FileText } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useData, Contract, ContractStatus } from '@/contexts/DataContext';
import { useProfile } from '@/hooks/use-profile';
import { EmptyState } from '@/components/design-system/DesignSystem';
import { toast } from 'sonner';

export const Route = createFileRoute('/contracts/')({
  component: ContractsPage,
});

const STATUS_OPTIONS: ContractStatus[] = ['Ativo', 'Em Renovação', 'Encerrado', 'Cancelado', 'Suspenso'];

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'Ativo': 'default',
  'Vigente': 'default',
  'Em Renovação': 'secondary',
  'Encerrado': 'outline',
  'Cancelado': 'destructive',
  'Suspenso': 'destructive',
};

const formatMoney = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface FormState {
  name: string;
  clientId: string;
  projectId: string;
  segment: string;
  product: string;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  termMonths: string;
  monthlyValue: string;
  totalValue: string;
  sellerId: string;
  externalLink: string;
  internalNotes: string;
  visibleToClient: boolean;
  downloadEnabled: boolean;
}

const emptyForm: FormState = {
  name: '', clientId: '', projectId: '', segment: '', product: '',
  status: 'Ativo', startDate: '', endDate: '', termMonths: '',
  monthlyValue: '', totalValue: '', sellerId: '',
  externalLink: '', internalNotes: '',
  visibleToClient: true, downloadEnabled: true,
};

function ContractsPage() {
  const { role } = useProfile();
  const { filteredContracts, clients, projects, addContract, updateContract, deleteContract } = useData();
  const navigate = useNavigate();

  const canManage = role === 'master' || role === 'project_manager';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [clientFilter, setClientFilter] = useState<string>('Todos');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hiddenValueIds, setHiddenValueIds] = useState<Set<string>>(() => new Set());
  const [toDelete, setToDelete] = useState<Contract | null>(null);

  const contracts = useMemo(() => {
    return filteredContracts.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'Todos' && c.status !== statusFilter) return false;
      if (clientFilter !== 'Todos' && c.clientId !== clientFilter) return false;
      return true;
    });
  }, [filteredContracts, search, statusFilter, clientFilter]);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || '—';

  const areAllValuesHidden = contracts.length > 0 && contracts.every(c => hiddenValueIds.has(c.id));

  const toggleAllValues = () => {
    setHiddenValueIds(current => {
      const allVisibleRowsAreHidden = contracts.length > 0 && contracts.every(c => current.has(c.id));
      return allVisibleRowsAreHidden ? new Set() : new Set(contracts.map(c => c.id));
    });
  };

  const toggleContractValues = (contractId: string) => {
    setHiddenValueIds(current => {
      const next = new Set(current);
      if (next.has(contractId)) next.delete(contractId);
      else next.add(contractId);
      return next;
    });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setDialogOpen(true);
  };

  const openEdit = (c: Contract) => {
    setEditing(c);
    setForm({
      name: c.name,
      clientId: c.clientId,
      projectId: c.projectId ?? '',
      segment: c.segment ?? '',
      product: c.product ?? '',
      status: c.status,
      startDate: c.startDate ?? '',
      endDate: c.endDate ?? '',
      termMonths: c.termMonths != null ? String(c.termMonths) : '',
      monthlyValue: c.monthlyValue != null ? String(c.monthlyValue) : '',
      totalValue: c.totalValue != null ? String(c.totalValue) : '',
      sellerId: c.sellerId ?? '',
      externalLink: c.externalLink ?? '',
      internalNotes: c.internalNotes ?? '',
      visibleToClient: c.visibleToClient,
      downloadEnabled: c.downloadEnabled,
    });
    setFile(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Informe o nome do contrato.'); return; }
    if (!form.clientId) { toast.error('Selecione o cliente.'); return; }
    if (form.name.length > 200) { toast.error('Nome muito longo.'); return; }
    if (form.internalNotes.length > 5000) { toast.error('Observações muito longas.'); return; }
    if (form.externalLink && form.externalLink.length > 500) { toast.error('Link externo muito longo.'); return; }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        projectId: form.projectId || null,
        sellerId: form.sellerId || null,
        termMonths: form.termMonths === '' ? null : Number(form.termMonths),
        monthlyValue: form.monthlyValue === '' ? null : Number(form.monthlyValue),
        totalValue: form.totalValue === '' ? null : Number(form.totalValue),
      };
      if (editing) {
        await updateContract(editing.id, payload);
      } else {
        await addContract(payload, file ?? undefined);
      }
      setDialogOpen(false);
    } catch {} finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteContract(toDelete.id);
      setToDelete(null);
    } catch {}
  };

  const projectsForClient = projects.filter(p => p.clientId === form.clientId);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
            <p className="text-sm text-muted-foreground">Gestão contratual centralizada do Portal Modulor.</p>
          </div>
          {canManage && (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Contrato
            </Button>
          )}
        </div>

        <ContractExpirationAlerts />
        <ClientBirthdaysCard />



        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={e => setSearch(e.target.value.slice(0, 100))}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os status</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {canManage && (
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos os clientes</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {contracts.length === 0 ? (
              <div className="p-10">
                <EmptyState
                  icon={FileSignature}
                  title="Nenhum contrato"
                  description="Cadastre o primeiro contrato para começar a centralizar a gestão contratual."
                  action={canManage ? <Button size="sm" onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Novo Contrato</Button> : undefined}
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Término</TableHead>
                    {canManage && (
                      <TableHead className="text-right">
                        <button
                          type="button"
                          onClick={toggleAllValues}
                          className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                          title={areAllValuesHidden ? 'Mostrar valores' : 'Ocultar valores'}
                        >
                          Valor mensal
                          {areAllValuesHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </TableHead>
                    )}
                    {canManage && <TableHead className="text-right">Valor único</TableHead>}
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map(c => {
                    const valuesHidden = hiddenValueIds.has(c.id);
                    return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <Link to="/contracts/$contractId" params={{ contractId: c.id }} className="hover:text-primary hover:underline underline-offset-4">
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell>{clientName(c.clientId)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[c.status] || 'secondary'}>{c.status}</Badge>
                      </TableCell>
                      <TableCell>{c.startDate ? new Date(c.startDate).toLocaleDateString('pt-BR') : '—'}</TableCell>
                      <TableCell>{c.endDate ? new Date(c.endDate).toLocaleDateString('pt-BR') : '—'}</TableCell>
                      {canManage && <TableCell className="text-right tabular-nums">{valuesHidden ? '••••••' : formatMoney(c.monthlyValue)}</TableCell>}
                      {canManage && <TableCell className="text-right tabular-nums">{valuesHidden ? '••••••' : formatMoney(c.totalValue)}</TableCell>}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Abrir contrato">
                            <Link to="/contracts/$contractId" params={{ contractId: c.id }}>
                              <FileText className="h-4 w-4" />
                            </Link>
                          </Button>
                          {canManage && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => toggleContractValues(c.id)}
                                title={valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}
                                aria-pressed={valuesHidden}
                              >
                                {valuesHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(c)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar contrato' : 'Novo contrato'}</DialogTitle>
            <DialogDescription>Preencha os dados do contrato. Campos financeiros são visíveis apenas para administradores.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label>Nome do contrato *</Label>
                <Input value={form.name} maxLength={200} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={form.clientId} onValueChange={v => setForm({ ...form, clientId: v, projectId: '' })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Projeto vinculado</Label>
                <Select value={form.projectId || 'none'} onValueChange={v => setForm({ ...form, projectId: v === 'none' ? '' : v })} disabled={!form.clientId}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {projectsForClient.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Segmento</Label>
                <Input value={form.segment} maxLength={100} onChange={e => setForm({ ...form, segment: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Produto / Serviço</Label>
                <Input value={form.product} maxLength={200} onChange={e => setForm({ ...form, product: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as ContractStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prazo (meses)</Label>
                <Input type="number" min={0} max={600} value={form.termMonths} onChange={e => setForm({ ...form, termMonths: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data de início</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data de término</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Valor mensal (R$)</Label>
                <Input type="number" step="0.01" min={0} value={form.monthlyValue} onChange={e => setForm({ ...form, monthlyValue: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Valor único do projeto (R$)</Label>
                <Input type="number" step="0.01" min={0} value={form.totalValue} onChange={e => setForm({ ...form, totalValue: e.target.value })} placeholder="Para projetos pontuais" />
              </div>
              <div className="space-y-2">
                <Label>Vendedor responsável</Label>
                <Input placeholder="ID do usuário interno (opcional)" maxLength={100} value={form.sellerId} onChange={e => setForm({ ...form, sellerId: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Link externo (opcional)</Label>
                <Input type="url" maxLength={500} value={form.externalLink} onChange={e => setForm({ ...form, externalLink: e.target.value })} placeholder="https://..." />
              </div>
              {!editing && (
                <div className="md:col-span-2 space-y-2">
                  <Label>Arquivo PDF</Label>
                  <Input type="file" accept="application/pdf,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </div>
              )}
              <div className="md:col-span-2 space-y-2">
                <Label>Observações internas</Label>
                <Textarea rows={3} maxLength={5000} value={form.internalNotes} onChange={e => setForm({ ...form, internalNotes: e.target.value })} placeholder="Visível apenas para administradores" />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <Label className="text-sm">Visível ao cliente</Label>
                  <p className="text-xs text-muted-foreground">Permite que o cliente veja este contrato.</p>
                </div>
                <Switch checked={form.visibleToClient} onCheckedChange={v => setForm({ ...form, visibleToClient: v })} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <Label className="text-sm">Download habilitado</Label>
                  <p className="text-xs text-muted-foreground">Permite baixar o PDF do contrato.</p>
                </div>
                <Switch checked={form.downloadEnabled} onCheckedChange={v => setForm({ ...form, downloadEnabled: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Salvando…' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O contrato "{toDelete?.name}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
