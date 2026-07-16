import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Filter, MoreHorizontal, Building2, User, Mail, Phone, Calendar, ArrowRight, Edit, Trash2, Clock, Users, Link as LinkIcon } from 'lucide-react';
import { InviteLinksDialog } from '@/components/collaborators/InviteLinksDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useData, Client } from '@/contexts/DataContext';
import { useProfile } from '@/hooks/use-profile';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, type FormEvent } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { createClientLogin, createClientWithLogin } from '@/lib/clients.functions';
import { toast } from 'sonner';
import { StatusBadge, MetricCard, EmptyState } from '@/components/design-system/DesignSystem';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ClientDetailDrawer } from '@/components/clients/ClientDetailDrawer';

export const Route = createFileRoute('/clients')({
  component: ClientsPage,
});

function ClientsPage() {
  const navigate = useNavigate();
  const { role, profile } = useProfile();
  const { filteredClients, addClient, updateClient, deleteClient, loading, refreshClients } = useData();
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refreshClients();
      toast.success('Lista atualizada');
    } catch (e: any) {
      toast.error('Erro ao atualizar', { description: e?.message });
    } finally {
      setIsRefreshing(false);
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [consultantFilter, setConsultantFilter] = useState('Todos');
  const [managerFilter, setManagerFilter] = useState('Todos');
  const [contractFilter, setContractFilter] = useState<'todos' | 'ativo' | 'vencido' | 'sem'>('todos');
  const [quickFilter, setQuickFilter] = useState<'todos' | 'ativos' | 'pausados'>('todos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [clientPassword, setClientPassword] = useState('');
  const createLoginFn = useServerFn(createClientLogin);
  const createClientWithLoginFn = useServerFn(createClientWithLogin);

  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    status: 'Ativo' as 'Ativo' | 'Pendente' | 'Em Pausa',
    responsible_name: '',
    email: '',
    phone: '',
    manager_name: '',
    contract_start: new Date().toISOString().split('T')[0],
    contract_end: '',
    is_ongoing: false,
    birthday: '',
    observations: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      industry: '',
      status: 'Ativo',
      responsible_name: '',
      email: '',
      phone: '',
      manager_name: '',
      contract_start: new Date().toISOString().split('T')[0],
      contract_end: '',
      is_ongoing: false,
      birthday: '',
      observations: ''
    });
    setEditingClient(null);
  };

  const handleCreateOrUpdateClient = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (clientPassword && clientPassword.length < 8) {
        toast.error('A senha deve ter no mínimo 8 caracteres');
        return;
      }
      let targetClientId: string | undefined;
      const payload = {
        ...formData,
        contract_end: formData.is_ongoing ? null : (formData.contract_end || null),
        birthday: formData.birthday || null,
      };
      if (editingClient) {
        await updateClient(editingClient.id, payload as any);
        targetClientId = editingClient.id;
      } else {
        const created = await createClientWithLoginFn({
          data: {
            ...(payload as any),
            manager_id: profile?.id || null,
            client_password: clientPassword,
          },
        });
        targetClientId = created.client?.id;
        setClientsToast(created.loginCreated ? 'Cliente cadastrado e acesso criado!' : 'Cliente cadastrado!');
      }
      if (editingClient && clientPassword && targetClientId) {
        try {
          await createLoginFn({
            data: {
              client_id: targetClientId,
              email: formData.email,
              password: clientPassword,
              full_name: formData.responsible_name || formData.name,
            },
          });
          toast.success('Acesso do cliente criado/vinculado!');
        } catch (err) {
          toast.error(`Falhou ao criar acesso: ${err instanceof Error ? err.message : 'erro'}`);
        }
      }
      await refreshClients();
      setIsDialogOpen(false);
      setClientPassword('');
      resetForm();
    } catch (err) {
      // toast.error handled in Context
    }
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      industry: client.industry || '',
      status: client.status || 'Ativo',
      responsible_name: client.responsible_name || '',
      email: client.email || '',
      phone: client.phone || '',
      manager_name: client.manager_name || '',
      contract_start: client.contract_start || '',
      contract_end: client.contract_end || '',
      is_ongoing: !!client.is_ongoing,
      birthday: client.birthday || '',
      observations: client.observations || ''
    });
    setIsDialogOpen(true);
  };

  const today = new Date(); today.setHours(0,0,0,0);
  const filteredBySearchAndStatus = filteredClients.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.industry?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;
    const matchesConsultant = consultantFilter === 'Todos' || c.responsible_name === consultantFilter;
    const matchesManager = managerFilter === 'Todos' || (c.manager_name || c.manager_id) === managerFilter;
    const hasContract = !!c.contract_end || !!c.is_ongoing;
    const contractActive = !!c.is_ongoing || (!!c.contract_end && new Date(c.contract_end!) >= today);
    let matchesContract = true;
    if (contractFilter === 'ativo') matchesContract = contractActive;
    else if (contractFilter === 'vencido') matchesContract = !!c.contract_end && !c.is_ongoing && new Date(c.contract_end!) < today;
    else if (contractFilter === 'sem') matchesContract = !hasContract;
    let matchesQuick = true;
    if (quickFilter === 'ativos') matchesQuick = c.status === 'Ativo';
    else if (quickFilter === 'pausados') matchesQuick = c.status === 'Em Pausa';
    return matchesSearch && matchesStatus && matchesConsultant && matchesManager && matchesContract && matchesQuick;
  });

  const uniqueConsultants = Array.from(new Set(filteredClients.map(c => c.responsible_name).filter(Boolean) as string[]));
  const uniqueManagers = Array.from(new Set(filteredClients.map(c => c.manager_name || c.manager_id).filter(Boolean) as string[]));
  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'Todos' || consultantFilter !== 'Todos'
    || managerFilter !== 'Todos' || contractFilter !== 'todos' || quickFilter !== 'todos';
  const clearFilters = () => {
    setSearchTerm(''); setStatusFilter('Todos'); setConsultantFilter('Todos');
    setManagerFilter('Todos'); setContractFilter('todos'); setQuickFilter('todos');
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Clientes</h1>
            <p className="text-muted-foreground">Gerencie sua base de clientes e parceiros estratégicos.</p>
          </div>
          
          {(role === 'master' || role === 'project_manager') && (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-10">
                {isRefreshing ? 'Atualizando...' : 'Atualizar Lista'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsInviteOpen(true)} className="h-10 gap-2">
                <LinkIcon className="h-4 w-4" />
                Gerar link de cliente
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="gap-2 shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4" />
                    Novo Cliente
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</DialogTitle>
                  <DialogDescription>
                    {editingClient ? 'Atualize as informações do cliente selecionado.' : 'Adicione um novo cliente à base do portal.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateOrUpdateClient} className="space-y-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome da Empresa</Label>
                      <Input 
                        id="name" 
                        value={formData.name} 
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Indústria</Label>
                      <Input 
                        id="industry" 
                        value={formData.industry} 
                        onChange={e => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="responsible_name">Responsável Principal</Label>
                      <Input 
                        id="responsible_name" 
                        value={formData.responsible_name} 
                        onChange={e => setFormData(prev => ({ ...prev, responsible_name: e.target.value }))}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input 
                        id="email" 
                        type="email"
                        value={formData.email} 
                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        required 
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="client_password">{editingClient ? 'Criar/atualizar acesso do cliente' : 'Senha de acesso do cliente'}</Label>
                      <Input
                        id="client_password"
                        type="password"
                        minLength={8}
                        maxLength={72}
                        placeholder="Mínimo 8 caracteres (deixe em branco para não alterar)"
                        value={clientPassword}
                        onChange={e => setClientPassword(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {editingClient
                          ? 'Preencha para criar o acesso deste cliente (caso ainda não exista) usando o e-mail acima.'
                          : 'Se preenchida, será criada uma conta de acesso para o cliente com este e-mail e senha.'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input 
                        id="phone" 
                        value={formData.phone} 
                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(val: any) => setFormData(prev => ({ ...prev, status: val }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ativo">Ativo</SelectItem>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Em Pausa">Em Pausa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manager_name">Gerente Responsável</Label>
                      <Input 
                        id="manager_name" 
                        value={formData.manager_name} 
                        onChange={e => setFormData(prev => ({ ...prev, manager_name: e.target.value }))}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contract_start">Início do Contrato</Label>
                      <Input 
                        id="contract_start" 
                        type="date"
                        value={formData.contract_start} 
                        onChange={e => setFormData(prev => ({ ...prev, contract_start: e.target.value }))}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contract_end">Término do Contrato</Label>
                      <Input 
                        id="contract_end" 
                        type="date"
                        value={formData.contract_end} 
                        onChange={e => setFormData(prev => ({ ...prev, contract_end: e.target.value }))}
                        disabled={formData.is_ongoing}
                        required={!formData.is_ongoing}
                      />
                      <label className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <input
                          type="checkbox"
                          checked={formData.is_ongoing}
                          onChange={e => setFormData(prev => ({ ...prev, is_ongoing: e.target.checked, contract_end: e.target.checked ? '' : prev.contract_end }))}
                        />
                        Contrato sem prazo (ongoing)
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="birthday">Aniversário do Cliente</Label>
                      <Input
                        id="birthday"
                        type="date"
                        value={formData.birthday}
                        onChange={e => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="observations">Observações Internas</Label>
                    <Textarea 
                      id="observations" 
                      value={formData.observations} 
                      onChange={e => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit">{editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard 
            title="Clientes Ativos" 
            value={filteredClients.filter(c => c.status === 'Ativo').length} 
            icon={Building2} 
            variant="success"
          />
          <MetricCard 
            title="Em Pausa" 
            value={filteredClients.filter(c => c.status === 'Em Pausa').length} 
            icon={Clock} 
            variant="warning"
          />
          <MetricCard 
            title="Total sob Gestão" 
            value={filteredClients.length} 
            icon={Users} 
            variant="default"
          />
        </div>

        <Card className="border-border/50 shadow-sm overflow-hidden bg-card/80 backdrop-blur-sm">
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou indústria..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={quickFilter === 'todos' ? 'secondary' : 'outline'} onClick={() => setQuickFilter('todos')}>Todos</Button>
                  <Button size="sm" variant={quickFilter === 'ativos' ? 'secondary' : 'outline'} onClick={() => setQuickFilter('ativos')}>Ativos</Button>
                  <Button size="sm" variant={quickFilter === 'pausados' ? 'secondary' : 'outline'} onClick={() => setQuickFilter('pausados')}>Pausados</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos Status</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Em Pausa">Em Pausa</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={consultantFilter} onValueChange={setConsultantFilter}>
                  <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Consultor responsável" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos Consultores</SelectItem>
                    {uniqueConsultants.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={managerFilter} onValueChange={setManagerFilter}>
                  <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Gerente responsável" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos Gerentes</SelectItem>
                    {uniqueManagers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={contractFilter} onValueChange={(v) => setContractFilter(v as any)}>
                  <SelectTrigger className="bg-background h-10"><SelectValue placeholder="Contrato" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Qualquer contrato</SelectItem>
                    <SelectItem value="ativo">Contrato ativo</SelectItem>
                    <SelectItem value="vencido">Contrato vencido</SelectItem>
                    <SelectItem value="sem">Sem contrato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/10">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Cliente</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Responsável</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Gerente</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredBySearchAndStatus.map((client) => (
                    <tr key={client.id} className="group hover:bg-muted/40 transition-all duration-200">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3.5">
                          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/10 flex items-center justify-center text-primary group-hover:from-primary/20 group-hover:to-primary/10 group-hover:ring-primary/20 transition-all">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-base text-foreground leading-tight tracking-tight">{client.name}</span>
                            <span className="text-xs text-muted-foreground mt-0.5">{client.industry}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground flex items-center gap-1.5"><User className="h-3 w-3 text-muted-foreground" /> {client.responsible_name}</span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Mail className="h-3 w-3" /> {client.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={client.status} />
                      </td>
                      <td className="px-6 py-5">
                        <Badge variant="outline" className="text-[10px] font-medium border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900">{client.manager_name}</Badge>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  onClick={() => { setViewingClient(client); setIsDrawerOpen(true); }}
                                  aria-label="Visualizar Cliente"
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Visualizar Cliente</TooltipContent>
                            </Tooltip>
                            {(role === 'master' || role === 'project_manager') && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                      onClick={() => openEditDialog(client)}
                                      aria-label="Editar Cliente"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar Cliente</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => setClientToDelete(client)}
                                      aria-label="Excluir Cliente"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Excluir Cliente</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredBySearchAndStatus.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="py-20">
                        <EmptyState 
                          icon={Users} 
                          title="Nenhum cliente" 
                          description="Não encontramos nenhum cliente com os filtros aplicados."
                        />
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-muted-foreground">Carregando clientes...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <InviteLinksDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} defaultRole="client" />

      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{clientToDelete?.name}</strong>? Esta ação não pode ser desfeita e removerá também os dados vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (!clientToDelete) return;
                setIsDeleting(true);
                try {
                  await deleteClient(clientToDelete.id);
                  setClientToDelete(null);
                } catch {
                  /* toast handled in context */
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ClientDetailDrawer
        client={viewingClient}
        open={isDrawerOpen}
        onOpenChange={(open) => { setIsDrawerOpen(open); if (!open) setViewingClient(null); }}
        onEdit={(c) => openEditDialog(c)}
      />
    </MainLayout>
  );
}
