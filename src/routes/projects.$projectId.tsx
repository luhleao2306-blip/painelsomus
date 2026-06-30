import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { 
  Briefcase, 
  Calendar, 
  User, 
  FileText, 
  CheckSquare, 
  UsersRound, 
  Clock, 
  ArrowLeft,
  LayoutGrid,
  List as ListIcon,
  Plus,
  ArrowUpRight,
  TrendingUp,
  FileBadge,
  AlertCircle,
  ExternalLink,
  Eye,
  Box,
  Edit,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge, PriorityBadge, TimelineStages, EmptyState, DocumentCard, TaskCard } from '@/components/design-system/DesignSystem';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/use-profile';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { QuickTaskDialog } from '@/components/shared/QuickTaskDialog';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';


export const Route = createFileRoute('/projects/$projectId')({
  validateSearch: (search: Record<string, unknown>): { taskId?: string } => ({
    taskId: typeof search.taskId === 'string' ? search.taskId : undefined,
  }),
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { role } = useProfile();
  const is_manager = role === 'master' || role === 'project_manager';

  const { projectId } = Route.useParams();
  const { 
    projects, 
    clients, 
    tasks, 
    documents, 
    deliverables, 
    minutes, 
    updateTask, 
    updateSubtask,
    addDeliverable,
    deleteProject
  } = useData();
  const navigate = useNavigate();
  
  const [isDelOpen, setIsDelOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const search = Route.useSearch();
  const [openedTaskId, setOpenedTaskId] = useState<string | null>(search.taskId ?? null);
  const openedTask = tasks.find(t => t.id === openedTaskId) || null;
  // Sincroniza com o parâmetro de busca (ex.: link de notificação)
  useEffect(() => {
    if (search.taskId && tasks.some(t => t.id === search.taskId)) {
      setOpenedTaskId(search.taskId);
    }
  }, [search.taskId, tasks]);


  const [delFormData, setDelFormData] = useState({
    name: '',
    type: 'Documento',
    externalLink: '',
    status: 'Pendente' as any,
    forecastDate: new Date().toISOString().split('T')[0],
    visibleToClient: true,
    downloadEnabled: true
  });
  
  const project = projects.find(p => p.id === projectId);
  const client = project ? (clients.find(c => c.id === project.clientId) || clients.find(c => c.id === (project as any).clientId)) : null;

  if (!project) {
    return (
      <MainLayout>
        <EmptyState 
          icon={Briefcase} 
          title="Projeto não encontrado" 
          description="O projeto solicitado não existe ou foi removido." 
          action={<Button asChild><Link to="/projects">Voltar para Projetos</Link></Button>}
        />
      </MainLayout>
    );
  }

  const projectTasks = tasks.filter(t => t.projectId === projectId);
  const projectDocs = documents.filter(d => d.projectId === projectId);
  const projectDeliverables = deliverables.filter(d => d.projectId === projectId);
  const projectMinutes = minutes.filter(m => m.projectId === projectId);
  const overdueTasks = projectTasks.filter(t => t.delayType);

  const handleToggleSubtask = async (subId: string, completed: boolean) => {
    await updateSubtask(subId, { completed });
    toast.success('Subtarefa atualizada.');
  };

  const handleStatusChange = async (taskId: string, status: any) => {
    await updateTask(taskId, { status });
    toast.success('Status da tarefa atualizado.');
  };

  const handleAddDeliverable = async () => {
    if (!delFormData.name) {
      toast.error("O nome é obrigatório");
      return;
    }
    
    await addDeliverable({
      ...delFormData,
      projectId,
      clientId: project.clientId
    });
    
    setIsDelOpen(false);
    setDelFormData({
      name: '',
      type: 'Documento',
      externalLink: '',
      status: 'Pendente',
      forecastDate: new Date().toISOString().split('T')[0],
      visibleToClient: true,
      downloadEnabled: true
    });
  };
  
  const handleDeleteProject = async () => {
    setIsDeleting(true);
    try {
      await deleteProject(projectId);
      navigate({ to: '/projects' });
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleOpenLink = (name: string, link?: string) => {
    if (link) {
      window.open(link, '_blank');
      toast.success(`Abrindo "${name}"...`);
    } else {
      toast.error("Link não disponível.");
    }
  };

  const openProjectTasks = () => {
    setQuickTaskOpen(true);
  };


  const openProjectDocuments = () => {
    navigate({ to: '/documents', hash: 'deliverables' });
    toast.info('Abrindo a central de entregáveis do portal.');
  };

  return (
    <MainLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header com Navegação */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-9 w-9 border border-border/50">
            <Link to="/projects"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px] uppercase font-bold tracking-wider">
                      {client?.name || "Cliente"}
                    </Badge>
                    <StatusBadge status={project.status} />
                  </div>
                </div>
             </div>
             <div className="flex items-center gap-2">
                {is_manager && (
                  <>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-9 w-9 border-border/50 text-destructive hover:bg-destructive/10"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button variant="outline" className="gap-2 border-border/50" onClick={openProjectTasks}>
                  <Plus className="h-4 w-4" />
                  Nova Tarefa
                </Button>
                <Button className="gap-2 shadow-lg shadow-primary/20" onClick={openProjectDocuments}>
                  <ArrowUpRight className="h-4 w-4" />
                  Ver Entregáveis
                </Button>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Lateral: Resumo e Cronograma */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Resumo Executivo</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <TimelineStages stages={project.stages} currentStageIndex={project.currentStageIndex} progress={project.progress} />
                
                <div className="pt-6 border-t border-border/30 space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Prioridade</span>
                      <PriorityBadge priority={project.priority} />
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Início</span>
                      <span className="text-sm font-semibold">{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Prazo Final</span>
                      <span className={cn("text-sm font-semibold", new Date(project.deadline || '') < new Date() && project.status !== 'Concluído' ? "text-rose-600" : "")}>
                        {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}
                      </span>
                   </div>
                </div>

                <div className="pt-6 border-t border-border/30 space-y-3">
                   <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Equipe Responsável</span>
                   <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border/30">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{project.managerName || 'Não atribuído'}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Consultor Responsável</span>
                      </div>
                   </div>
                </div>
              </CardContent>
            </Card>

            {overdueTasks.length > 0 && (
              <Card className="border-rose-200 bg-rose-50/50 shadow-sm">
                 <CardHeader className="pb-2">
                    <CardTitle className="text-rose-600 text-sm font-bold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Atrasos Detectados
                    </CardTitle>
                 </CardHeader>
                 <CardContent>
                    <p className="text-xs text-rose-600/70 font-medium">Existem {overdueTasks.length} tarefas pendentes fora do prazo neste projeto.</p>
                 </CardContent>
              </Card>
            )}
          </div>

          {/* Coluna Principal: Conteúdo Dinâmico */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="tasks" className="space-y-6">
              <TabsList className="bg-muted/50 p-1 border border-border/50">
                <TabsTrigger value="tasks" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
                  <CheckSquare className="h-4 w-4" />
                  Tarefas ({projectTasks.length})
                </TabsTrigger>
                <TabsTrigger value="deliverables" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
                  <Box className="h-4 w-4" />
                  Entregáveis ({projectDeliverables.length})
                </TabsTrigger>
                <TabsTrigger value="docs" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
                  <FileText className="h-4 w-4" />
                  Docs ({projectDocs.length})
                </TabsTrigger>
                <TabsTrigger value="meetings" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
                  <UsersRound className="h-4 w-4" />
                  Reuniões ({projectMinutes.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="space-y-6">
                <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg border border-border/50">
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="h-8 px-4 font-bold text-xs" disabled><ListIcon className="h-3 w-3 mr-2" /> LISTA</Button>
                    <Button variant="ghost" size="sm" className="h-8 px-4 font-bold text-xs" disabled><LayoutGrid className="h-3 w-3 mr-2" /> KANBAN</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projectTasks.map(t => (
                    <div key={t.id} className="relative group">
                       <TaskCard task={t} />
                       {t.subtasks.length > 0 && (
                          <div className="px-4 pb-4 bg-card border-x border-b border-border/50 rounded-b-xl -mt-2 space-y-2">
                             {t.subtasks.map(s => (
                                <div key={s.id} className="flex items-center gap-2 text-[10px]">
                                   <input 
                                     type="checkbox" 
                                     checked={s.completed} 
                                     onChange={(e) => handleToggleSubtask(s.id, e.target.checked)}
                                     className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary"
                                   />
                                   <span className={s.completed ? 'line-through text-muted-foreground' : 'font-medium'}>{s.title}</span>
                                </div>
                             ))}
                          </div>
                       )}
                    </div>
                  ))}
                  {projectTasks.length === 0 && (
                    <div className="col-span-full">
                       <EmptyState icon={CheckSquare} title="Sem tarefas" description="Nenhuma tarefa vinculada a este projeto ainda." />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="deliverables" className="space-y-4">
                 <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg border border-border/50">
                    <p className="text-sm font-bold ml-2">Lista de Entregáveis</p>
                    {is_manager && (
                      <Dialog open={isDelOpen} onOpenChange={setIsDelOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="gap-2 font-bold"><Plus className="h-4 w-4" /> NOVO ENTREGÁVEL</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Novo Entregável</DialogTitle>
                            <DialogDescription>Adicione um novo item de entrega para este projeto.</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="del-name">Nome do Entregável</Label>
                              <Input id="del-name" value={delFormData.name} onChange={e => setDelFormData({...delFormData, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label>Tipo</Label>
                                <Select value={delFormData.type} onValueChange={v => setDelFormData({...delFormData, type: v})}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Documento">Documento</SelectItem>
                                    <SelectItem value="Design">Design</SelectItem>
                                    <SelectItem value="Código">Código</SelectItem>
                                    <SelectItem value="Relatório">Relatório</SelectItem>
                                    <SelectItem value="Apresentação">Apresentação</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Status</Label>
                                <Select value={delFormData.status} onValueChange={v => setDelFormData({...delFormData, status: v})}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Pendente">Pendente</SelectItem>
                                    <SelectItem value="Entregue">Entregue</SelectItem>
                                    <SelectItem value="Aprovado">Aprovado</SelectItem>
                                    <SelectItem value="Atrasado">Atrasado</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <Label>Link Externo</Label>
                              <Input value={delFormData.externalLink} onChange={e => setDelFormData({...delFormData, externalLink: e.target.value})} placeholder="https://..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label>Previsão</Label>
                                <Input type="date" value={delFormData.forecastDate} onChange={e => setDelFormData({...delFormData, forecastDate: e.target.value})} />
                              </div>
                              <div className="flex flex-col gap-4 justify-center">
                                <div className="flex items-center gap-2">
                                  <Switch checked={delFormData.visibleToClient} onCheckedChange={v => setDelFormData({...delFormData, visibleToClient: v})} />
                                  <Label className="text-xs">Visível ao Cliente</Label>
                                </div>
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsDelOpen(false)}>Cancelar</Button>
                            <Button onClick={handleAddDeliverable}>Salvar</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projectDeliverables.map(del => (
                       <Card key={del.id} className="border-border/50 bg-card/80 overflow-hidden group">
                          <CardHeader className="pb-2">
                             <div className="flex justify-between items-start">
                                <Badge variant="secondary" className="text-[9px] font-black uppercase bg-primary/5 text-primary border-none">{del.type}</Badge>
                                <StatusBadge status={del.status} />
                             </div>
                             <CardTitle className="text-base font-bold mt-2">{del.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                             <div className="flex justify-between text-[11px] font-medium border-t border-border/30 pt-4">
                                <span className="text-muted-foreground">Previsão:</span>
                                <span className="font-bold">{new Date(del.forecastDate).toLocaleDateString()}</span>
                             </div>
                             <Button 
                               variant="outline" 
                               className="w-full h-9 gap-2 text-xs font-bold uppercase"
                               onClick={() => handleOpenLink(del.name, del.externalLink)}
                             >
                               <ExternalLink className="h-3.5 w-3.5" />
                               Ver Entregável
                             </Button>
                          </CardContent>
                       </Card>
                    ))}
                    {projectDeliverables.length === 0 && (
                       <div className="col-span-full">
                          <EmptyState icon={Box} title="Sem entregáveis" description="Nenhum entregável cadastrado para este projeto." />
                       </div>
                    )}
                 </div>
              </TabsContent>

              <TabsContent value="docs" className="space-y-4">
                 <div className="grid gap-4">
                   {projectDocs.map(doc => (
                     <DocumentCard key={doc.id} doc={doc} onDownload={() => handleOpenLink(doc.name, doc.externalLink)} />
                   ))}
                   {projectDocs.length === 0 && (
                     <EmptyState icon={FileText} title="Sem documentos" description="Nenhum arquivo anexado a este projeto." />
                   )}
                 </div>
              </TabsContent>

              <TabsContent value="meetings" className="space-y-4">
                 <div className="grid gap-4">
                    {projectMinutes.map(minute => (
                       <Card key={minute.id} className="border-border/50 hover:shadow-md transition-all group overflow-hidden bg-card/80">
                          <CardContent className="p-4 flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                   <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                   <p className="text-sm font-bold">{minute.title}</p>
                                   <p className="text-[10px] text-muted-foreground font-bold uppercase">{new Date(minute.date).toLocaleDateString()} • {minute.attendees?.length || 0} participantes</p>
                                </div>
                             </div>
                              <div className="flex items-center gap-2">
                                 <Button variant="ghost" size="sm" asChild className="h-8 gap-1">
                                   <Link to="/atas/$ataId" params={{ ataId: minute.id }}>
                                     <Eye className="h-4 w-4" /> Abrir
                                   </Link>
                                 </Button>
                              </div>
                          </CardContent>
                       </Card>
                    ))}
                    {projectMinutes.length === 0 && (
                       <EmptyState icon={UsersRound} title="Sem reuniões" description="Não há registros de reuniões para este projeto." />
                    )}
                 </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Projeto</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o projeto <strong>{project.name}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuickTaskDialog
        open={quickTaskOpen}
        onOpenChange={setQuickTaskOpen}
        clientId={project.clientId}
        projectId={projectId}
        lockClient
        lockProject
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

