import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AttachmentsPanel } from '@/components/shared/AttachmentsPanel';
import { StatusBadge, PriorityBadge } from '@/components/design-system/DesignSystem';
import { useData, Project } from '@/contexts/DataContext';
import { useNavigate } from '@tanstack/react-router';
import { Calendar, User, Briefcase, FileText, CheckSquare, Package, FileSignature, Users, Edit, Trash2, ArrowRight } from 'lucide-react';

interface ProjectDetailDrawerProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage?: boolean;
  canDelete?: boolean;
  onEdit?: (p: Project) => void;
  onDelete?: (p: Project) => void;
}

export function ProjectDetailDrawer({
  project, open, onOpenChange, canManage, canDelete, onEdit, onDelete,
}: ProjectDetailDrawerProps) {
  const navigate = useNavigate();
  const { clients, tasks, documents, deliverables, contracts, minutes } = useData();

  if (!project) return null;

  const client = clients.find(c => c.id === project.clientId);
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const projectDocs = documents.filter(d => d.projectId === project.id);
  const projectDeliverables = deliverables.filter(d => d.projectId === project.id);
  const projectContracts = contracts.filter(c => c.projectId === project.id);
  const projectMinutes = minutes.filter(m => m.projectId === project.id);

  const goTo = (path: string) => {
    onOpenChange(false);
    navigate({ to: path });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[640px] w-full overflow-hidden p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Briefcase className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-xl text-left truncate">{project.name}</SheetTitle>
              <SheetDescription className="text-left flex items-center gap-2 mt-1 flex-wrap">
                <StatusBadge status={project.status} />
                <PriorityBadge priority={project.priority} />
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Overview */}
            <section className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Info label="Cliente" icon={User} value={client?.name || 'Sem cliente'} />
                <Info label="Consultor" icon={Users} value={project.managerName || project.consultantId || 'N/A'} />
                <Info label="Prazo" icon={Calendar} value={project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'} />
                <Info label="Início" icon={Calendar} value={project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'} />
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold uppercase mb-1 text-muted-foreground">
                  <span>Progresso</span>
                  <span>{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
              </div>
              {project.description && (
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Descrição</p>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{project.description}</p>
                </div>
              )}
            </section>

            <Separator />

            {/* Tabs com itens vinculados */}
            <Tabs defaultValue="tasks" className="w-full">
              <TabsList className="grid grid-cols-6 w-full">
                <TabsTrigger value="tasks">Tarefas ({projectTasks.length})</TabsTrigger>
                <TabsTrigger value="docs">Docs ({projectDocs.length})</TabsTrigger>
                <TabsTrigger value="deliverables">Entregas ({projectDeliverables.length})</TabsTrigger>
                <TabsTrigger value="contracts">Contratos ({projectContracts.length})</TabsTrigger>
                <TabsTrigger value="meetings">Reuniões ({projectMinutes.length})</TabsTrigger>
                <TabsTrigger value="attachments">Anexos</TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="mt-4">
                <ItemList
                  items={projectTasks.map(t => ({ id: t.id, title: t.title, sub: t.status }))}
                  emptyIcon={CheckSquare} emptyLabel="Sem tarefas"
                />
              </TabsContent>
              <TabsContent value="docs" className="mt-4">
                <ItemList
                  items={projectDocs.map(d => ({ id: d.id, title: d.name, sub: d.category }))}
                  emptyIcon={FileText} emptyLabel="Sem documentos"
                />
              </TabsContent>
              <TabsContent value="deliverables" className="mt-4">
                <ItemList
                  items={projectDeliverables.map(d => ({ id: d.id, title: d.name, sub: d.status }))}
                  emptyIcon={Package} emptyLabel="Sem entregáveis"
                />
              </TabsContent>
              <TabsContent value="contracts" className="mt-4">
                <ItemList
                  items={projectContracts.map(c => ({ id: c.id, title: c.name, sub: c.status }))}
                  emptyIcon={FileSignature} emptyLabel="Sem contratos"
                />
              </TabsContent>
              <TabsContent value="meetings" className="mt-4">
                <ItemList
                  items={projectMinutes.map(m => ({ id: m.id, title: m.title, sub: m.date ? new Date(m.date).toLocaleDateString() : '' }))}
                  emptyIcon={Calendar} emptyLabel="Sem reuniões"
                />
              </TabsContent>
              <TabsContent value="attachments" className="mt-4">
                <AttachmentsPanel entityType="project" entityId={project.id} />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        {/* Ações */}
        <div className="border-t p-4 flex flex-wrap gap-2 justify-end bg-card">
          <Button variant="outline" size="sm" onClick={() => goTo('/tasks')}>
            <CheckSquare className="h-4 w-4 mr-1" /> Tarefas
          </Button>
          <Button variant="outline" size="sm" onClick={() => goTo('/documents')}>
            <FileText className="h-4 w-4 mr-1" /> Documentos
          </Button>
          <Button variant="outline" size="sm" onClick={() => goTo('/meetings')}>
            <Calendar className="h-4 w-4 mr-1" /> Reuniões
          </Button>
          <Button variant="secondary" size="sm" onClick={() => goTo(`/projects/${project.id}`)}>
            Página completa <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          {canManage && onEdit && (
            <Button size="sm" onClick={() => { onOpenChange(false); onEdit(project); }}>
              <Edit className="h-4 w-4 mr-1" /> Editar
            </Button>
          )}
          {canDelete && onDelete && (
            <Button variant="destructive" size="sm" onClick={() => { onOpenChange(false); onDelete(project); }}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, icon: Icon, value }: { label: string; icon: any; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function ItemList({ items, emptyIcon: Icon, emptyLabel }: { items: { id: string; title: string; sub?: string }[]; emptyIcon: any; emptyLabel: string }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
        <Icon className="h-8 w-8 opacity-40" />
        <span>{emptyLabel}</span>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map(i => (
        <div key={i.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50">
          <span className="text-sm font-medium truncate">{i.title}</span>
          {i.sub && <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">{i.sub}</Badge>}
        </div>
      ))}
    </div>
  );
}
