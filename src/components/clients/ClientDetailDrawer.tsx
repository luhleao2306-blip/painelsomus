import { useNavigate } from '@tanstack/react-router';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  User,
  Mail,
  Briefcase,
  FileText,
  FileBadge,
  UsersRound,
  ListChecks,
  Edit,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useData, Client } from '@/contexts/DataContext';
import { useProfile } from '@/hooks/use-profile';
import { StatusBadge } from '@/components/design-system/DesignSystem';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useState, type ComponentType, type ReactNode } from 'react';

interface ClientDetailDrawerProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (client: Client) => void;
}

export function ClientDetailDrawer({ client, open, onOpenChange, onEdit }: ClientDetailDrawerProps) {
  const navigate = useNavigate();
  const { role } = useProfile();
  const { projects, tasks, documents, contracts, minutes, deleteClient } = useData();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!client) return null;

  const canManage = role === 'master' || role === 'project_manager';
  const canDelete = role === 'master';

  const clientProjects = projects.filter((p) => p.clientId === client.id);
  const clientTasks = tasks.filter((t) => t.clientId === client.id);
  const clientDocs = documents.filter((d) => d.clientId === client.id);
  const clientContracts = contracts.filter((c) => c.clientId === client.id);
  const clientMinutes = minutes.filter((m) => m.clientId === client.id);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteClient(client.id);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const goTo = (path: string) => {
    onOpenChange(false);
    navigate({ to: path });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-5 border-b border-border/50 bg-muted/20">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-bold truncate">{client.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <StatusBadge status={client.status || 'Ativo'} />
                {client.industry && (
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    {client.industry}
                  </span>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-6">
            {/* Dados principais */}
            <section className="space-y-3">
              <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                Informações
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <InfoRow icon={Building2} label="Empresa" value={client.name} />
                <InfoRow icon={Mail} label="E-mail" value={client.email || 'N/A'} />
                <InfoRow icon={User} label="Responsável" value={client.responsible_name || 'N/A'} />
                <InfoRow
                  icon={User}
                  label="Gerente"
                  value={
                    client.manager_name ? (
                      <Badge variant="outline" className="text-[10px] border-indigo-200 bg-indigo-50 text-indigo-600">
                        {client.manager_name}
                      </Badge>
                    ) : (
                      'N/A'
                    )
                  }
                />
              </div>
            </section>

            <Separator />

            {/* Vínculos */}
            <section className="space-y-3">
              <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                Vínculos
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <LinkStat icon={Briefcase} label="Projetos" count={clientProjects.length} />
                <LinkStat icon={ListChecks} label="Tarefas" count={clientTasks.length} />
                <LinkStat icon={FileText} label="Documentos" count={clientDocs.length} />
                <LinkStat icon={FileBadge} label="Contratos" count={clientContracts.length} />
                <LinkStat icon={UsersRound} label="Reuniões" count={clientMinutes.length} />
              </div>
            </section>
          </div>
        </ScrollArea>

        {/* Ações */}
        <div className="border-t border-border/50 px-6 py-4 bg-muted/20 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => goTo(`/clients/${client.id}`)}
            >
              <ExternalLink className="h-4 w-4" />
              Página completa
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => goTo('/projects')}>
              <Briefcase className="h-4 w-4" />
              Ver projetos
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => goTo('/documents')}>
              <FileText className="h-4 w-4" />
              Ver documentos
            </Button>
            {canManage && (
              <Button
                className="gap-2"
                onClick={() => {
                  onOpenChange(false);
                  onEdit?.(client);
                }}
              >
                <Edit className="h-4 w-4" />
                Editar cliente
              </Button>
            )}
          </div>

          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full gap-2" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4" />
                  Excluir cliente
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir {client.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todos os vínculos do cliente continuarão existindo, mas o registro
                    do cliente será removido.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? 'Excluindo...' : 'Excluir'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{label}</span>
        <span className="text-sm font-semibold truncate">{value}</span>
      </div>
    </div>
  );
}

function LinkStat({
  icon: Icon,
  label,
  count,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3">
      <div className="h-9 w-9 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-none">{count}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</span>
      </div>
    </div>
  );
}
