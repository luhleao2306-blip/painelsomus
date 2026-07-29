import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Briefcase, 
  FileText, 
  UsersRound, 
  Clock,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  FileBadge,
  Eye,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { StatusBadge, ProjectCard, DocumentCard, EmptyState, TimelineStages } from '@/components/design-system/DesignSystem';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MeetingsPanel } from '@/routes/meetings';
import { ClientDocumentsPanel } from '@/components/clients/ClientDocumentsPanel';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/use-profile';
import { useState } from 'react';
import { Plus, Zap } from 'lucide-react';
import { QuickProjectDialog } from '@/components/shared/QuickProjectDialog';
import { QuickTaskDialog } from '@/components/shared/QuickTaskDialog';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';


export const Route = createFileRoute('/clients/$clientId')({
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const navigate = useNavigate();
  const { clientId } = Route.useParams();
  const { role } = useProfile();
  const { clients, projects, documents, tasks, contracts, minutes } = useData();
  const canManageContracts = role === 'master' || role === 'project_manager';
  const canCreate = role === 'master' || role === 'project_manager' || role === 'consultant';

  const [quickProjectOpen, setQuickProjectOpen] = useState(false);
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const [openedTaskId, setOpenedTaskId] = useState<string | null>(null);
  const openedTask = tasks.find(t => t.id === openedTaskId) || null;

  const client = clients.find(c => c.id === clientId);

  if (!client) {
    return (

      <MainLayout>
        <EmptyState 
          icon={Building2} 
          title="Cliente não encontrado" 
          description="O cliente solicitado não existe em nossa base." 
          action={<Button asChild><Link to="/clients">Voltar para Lista</Link></Button>}
        />
      </MainLayout>
    );
  }

  const clientProjects = projects.filter(p => p.clientId === clientId);
  const clientDocs = documents.filter(d => d.clientId === clientId);
   const clientContracts = contracts.filter(c => c.clientId === clientId);
  const clientMinutes = minutes.filter(m => m.clientId === clientId);

  const handleOpenLink = (name: string, link?: string) => {
    if (link) {
      window.open(link, '_blank');
      toast.success(`Abrindo "${name}"...`);
    } else {
      toast.error("Link não disponível.");
    }
  };

  const handleContact = () => {
    if (client.email) {
      window.open(`mailto:${client.email}`, '_blank', 'noopener,noreferrer');
      return;
    }

    if (client.phone) {
      const digits = client.phone.replace(/\D/g, '');
      if (digits) {
        window.open(`https://wa.me/${digits}`, '_blank', 'noopener,noreferrer');
        return;
      }
    }

    toast.error('Este cliente não possui e-mail ou telefone cadastrado.');
  };

  return (
    <MainLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-9 w-9 border border-border/50">
            <Link to="/clients"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={client.status || 'Ativo'} />
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{client.industry}</span>
                  </div>
                </div>
             </div>
             <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="gap-2 border-border/50" onClick={handleContact}>
                  <MessageSquare className="h-4 w-4" />
                  Contato
                </Button>
                {canCreate && (
                  <>
                    <Button
                      variant="outline"
                      className="gap-2 border-border/50"
                      onClick={() => setQuickProjectOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Novo Projeto
                    </Button>
                    <Button
                      className="gap-2 shadow-lg shadow-primary/20"
                      onClick={() => setQuickTaskOpen(true)}
                    >
                      <Zap className="h-4 w-4" />
                      Nova Tarefa
                    </Button>
                  </>
                )}
             </div>

          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Dados Principais */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Dados Principais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-primary mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Responsável</span>
                      <span className="text-sm font-semibold">{client.responsible_name || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-primary mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">E-mail</span>
                      <span className="text-sm font-semibold">{client.email || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-primary mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Telefone</span>
                      <span className="text-sm font-semibold">{client.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border/30 space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Gerente Responsável</span>
                      <Badge variant="outline" className="text-[10px] border-indigo-200 bg-indigo-50 text-indigo-600">{client.manager_name || 'N/A'}</Badge>
                   </div>
                </div>

                <div className="pt-6 border-t border-border/30 grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Início Contrato</span>
                    <span className="text-sm font-semibold flex items-center gap-1.5 mt-1">
                      <Calendar className="h-3.5 w-3.5 text-primary/60" />
                      {client.contract_start ? new Date(client.contract_start).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Término Contrato</span>
                    <span className="text-sm font-semibold flex items-center gap-1.5 mt-1">
                      <Clock className="h-3.5 w-3.5 text-rose-500/60" />
                      {client.contract_end ? new Date(client.contract_end).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {client.observations && (
                  <div className="pt-6 border-t border-border/30 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Observações</span>
                    <p className="text-xs text-muted-foreground leading-relaxed italic">"{client.observations}"</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm bg-primary text-primary-foreground p-6 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 transition-transform group-hover:scale-[1.7]">
                  <FileBadge className="h-32 w-32" />
                </div>
                <div className="space-y-4 relative z-10">
                   <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                     <FileBadge className="h-6 w-6" />
                   </div>
                   <div className="space-y-1">
                     <h4 className="font-bold text-lg">Contrato Digital</h4>
                     <p className="text-xs text-white/70">Status: {clientContracts[0]?.status || 'Consultar'}</p>
                 </div>
                     <Button 
                     variant="secondary" 
                     className="w-full font-bold h-10 gap-2"
                     disabled={clientContracts.length === 0}
                      onClick={() => navigate({ to: '/contracts/$contractId', params: { contractId: clientContracts[0]?.id ?? '' } })}
                   >
                     <Eye className="h-4 w-4" />
                     Ver Contrato
                   </Button>
                </div>
            </Card>
          </div>

          {/* Conteúdo Dinâmico */}
          <div className="lg:col-span-2 space-y-8">
            <Tabs defaultValue="projects" className="space-y-6">
              <TabsList className="bg-muted/50 p-1 border border-border/50">
                <TabsTrigger value="projects" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
                  <Briefcase className="h-4 w-4" />
                  Projetos ({clientProjects.length})
                </TabsTrigger>
                <TabsTrigger value="docs" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
                  <FileText className="h-4 w-4" />
                  Documentos ({clientDocs.length})
                </TabsTrigger>
                <TabsTrigger value="contracts" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
                  <FileBadge className="h-4 w-4" />
                  Contratos ({clientContracts.length})
                </TabsTrigger>
                <TabsTrigger value="meetings" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
                  <UsersRound className="h-4 w-4" />
                  Atas ({clientMinutes.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="projects" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {clientProjects.map(p => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      onView={() => navigate({
                        to: '/clientes/$clienteId/projetos/$projetoId',
                        params: { clienteId: clientId, projetoId: p.id },
                      })}
                    />
                  ))}
                  {clientProjects.length === 0 && (
                    <div className="col-span-full">
                      <EmptyState 
                        icon={Briefcase} 
                        title="Nenhum projeto" 
                        description="Este cliente ainda não possui projetos cadastrados." 
                         action={<Button size="sm" onClick={() => setQuickProjectOpen(true)}>Novo Projeto</Button>}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="docs" className="space-y-4">
                <ClientDocumentsPanel clientId={clientId} />
              </TabsContent>





              <TabsContent value="meetings" className="space-y-4">
                 <MeetingsPanel clientId={clientId} embedded />
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </div>

      <QuickProjectDialog
        open={quickProjectOpen}
        onOpenChange={setQuickProjectOpen}
        clientId={clientId}
        lockClient
      />
      <QuickTaskDialog
        open={quickTaskOpen}
        onOpenChange={setQuickTaskOpen}
        clientId={clientId}
        lockClient
        onCreated={(id) => setOpenedTaskId(id)}
      />
      <TaskDetailDialog
        task={openedTask}
        open={!!openedTask}
        onOpenChange={(o) => { if (!o) setOpenedTaskId(null); }}
      />
    </MainLayout>
  );
}

