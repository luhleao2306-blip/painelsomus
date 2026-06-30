import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  LucideIcon, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  User,
  MoreVertical,
  FileText,
  Download,
  Eye,
  File,
  FileSpreadsheet,
  FileImage,
  Plus,
  Edit,
  ListChecks,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  TaskStatus, 
  Priority, 
  Project as ProjectType, 
  Task as TaskType, 
  Document as DocumentType,
  ProjectStage
} from '@/contexts/DataContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

/**
 * 1. MetricCard
 */
export function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  description,
  variant = "default",
  accent,
}: { 
  title: string; 
  value: string | number; 
  icon: LucideIcon; 
  trend?: 'up' | 'down'; 
  trendValue?: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "warning";
  accent?: "blue" | "amber" | "violet" | "emerald" | "rose" | "sky" | "indigo";
}) {
  const variantStyles = {
    default: "text-primary bg-primary/10",
    destructive: "text-destructive bg-destructive/10",
    success: "text-emerald-600 bg-emerald-100",
    warning: "text-amber-600 bg-amber-100",
  };

  const accentStyles: Record<string, { card: string; icon: string; title: string; value: string; desc: string }> = {
    blue:    { card: "bg-gradient-to-br from-sky-500 to-blue-600 border-blue-700/30",      icon: "bg-white/20 text-white",   title: "text-white/80",  value: "text-white",        desc: "text-white/80" },
    amber:   { card: "bg-gradient-to-br from-amber-400 to-orange-500 border-orange-600/30", icon: "bg-white/20 text-white",   title: "text-white/90",  value: "text-white",        desc: "text-white/90" },
    violet:  { card: "bg-gradient-to-br from-violet-500 to-purple-600 border-purple-700/30",icon: "bg-white/20 text-white",   title: "text-white/80",  value: "text-white",        desc: "text-white/80" },
    emerald: { card: "bg-gradient-to-br from-emerald-500 to-teal-600 border-teal-700/30",   icon: "bg-white/20 text-white",   title: "text-white/80",  value: "text-white",        desc: "text-white/80" },
    rose:    { card: "bg-gradient-to-br from-rose-500 to-pink-600 border-pink-700/30",      icon: "bg-white/20 text-white",   title: "text-white/80",  value: "text-white",        desc: "text-white/80" },
    sky:     { card: "bg-gradient-to-br from-cyan-400 to-sky-600 border-sky-700/30",        icon: "bg-white/20 text-white",   title: "text-white/80",  value: "text-white",        desc: "text-white/80" },
    indigo:  { card: "bg-gradient-to-br from-indigo-500 to-blue-700 border-blue-800/30",    icon: "bg-white/20 text-white",   title: "text-white/80",  value: "text-white",        desc: "text-white/80" },
  };

  const a = accent ? accentStyles[accent] : null;

  return (
    <Card className={cn(
      "h-full border shadow-sm hover:shadow-lg transition-all duration-300",
      a ? cn(a.card, "text-white") : "border-border/50 bg-card/80 backdrop-blur-sm"
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className={cn("text-xs font-bold uppercase tracking-wider", a ? a.title : "text-muted-foreground")}>{title}</CardTitle>
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", a ? a.icon : variantStyles[variant])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-black tracking-tight", a ? a.value : undefined)}>{value}</div>
        {(trend || description) && (
          <div className="text-[11px] mt-1 flex items-center gap-1 font-medium">
            {trend && (
              <span className={trend === 'up' ? (a ? 'text-white' : 'text-emerald-500') : (a ? 'text-white' : 'text-rose-500')}>
                {trend === 'up' ? <TrendingUp className="inline h-3 w-3 mr-0.5" /> : <TrendingDown className="inline h-3 w-3 mr-0.5" />}
                {trendValue}
              </span>
            )}
            <span className={a ? a.desc : "text-muted-foreground"}>{description || "vs mês anterior"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


/**
 * 2 & 3. Status & Priority Badges
 */
export function StatusBadge({ status }: { status: string | TaskStatus }) {
  const styles: Record<string, string> = {
    'Ativo': 'bg-emerald-500/10 text-emerald-600',
    'Pendente': 'bg-amber-500/10 text-amber-600',
    'Concluído': 'bg-emerald-500/10 text-emerald-600',
    'Em andamento': 'bg-primary/10 text-primary',
    'Em Pausa': 'bg-rose-500/10 text-rose-600',
    'Finalizando': 'bg-emerald-500/10 text-emerald-600',
    'Planejamento': 'bg-amber-500/10 text-amber-600',
    'Backlog': 'bg-muted text-muted-foreground',
    'A fazer': 'bg-muted text-muted-foreground',
    'Aguardando cliente': 'bg-amber-500/10 text-amber-600',
    'Aguardando time': 'bg-muted text-muted-foreground',
    'Em revisão': 'bg-muted text-muted-foreground',
    'Aprovado': 'bg-emerald-500/10 text-emerald-600',
    'Cancelado': 'bg-rose-500/10 text-rose-600',
  };

  return (
    <Badge variant="secondary" className={cn("text-[10px] font-bold uppercase tracking-wider border-none", styles[status] || 'bg-muted text-muted-foreground')}>
      {status}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const styles: Record<Priority, string> = {
    'Crítica': 'text-rose-600 border-rose-200 bg-rose-50',
    'Alta': 'text-amber-600 border-amber-200 bg-amber-50',
    'Média': 'text-primary border-primary/20 bg-primary/5',
    'Baixa': 'text-muted-foreground border-border bg-muted/20',
  };

  return (
    <Badge variant="outline" className={cn("text-[9px] font-bold uppercase tracking-widest", styles[priority])}>
      {priority}
    </Badge>
  );
}

/**
 * 5. ProjectCard
 */
export function ProjectCard({
  project,
  clientName,
  onView,
  onEdit,
  onViewTasks,
  onViewDocuments,
  onDelete,
}: {
  project: ProjectType;
  clientName?: string;
  onView?: () => void;
  onEdit?: () => void;
  onViewTasks?: () => void;
  onViewDocuments?: () => void;
  onDelete?: () => void;
}) {
  const hasAnyAction = !!(onView || onEdit || onViewTasks || onViewDocuments || onDelete);
  return (
    <Card className="border-border/50 hover:shadow-xl transition-all duration-300 group flex flex-col bg-card/80 backdrop-blur-sm cursor-pointer" onClick={onView}>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px] uppercase font-bold tracking-wider">
            {clientName || "Cliente"}
          </Badge>
          <CardTitle
            className="text-lg font-bold group-hover:text-primary transition-colors cursor-pointer"
            onClick={onView}
          >
            {project.name}
          </CardTitle>
        </div>
        {hasAnyAction && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground relative z-10"
                onClick={(e) => e.stopPropagation()}
                aria-label="Ações do projeto"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50 w-48">
              {onView && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                  <Eye className="h-4 w-4 mr-2" /> Visualizar projeto
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Edit className="h-4 w-4 mr-2" /> Editar projeto
                </DropdownMenuItem>
              )}
              {onViewTasks && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewTasks(); }}>
                  <ListChecks className="h-4 w-4 mr-2" /> Ver tarefas
                </DropdownMenuItem>
              )}
              {onViewDocuments && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDocuments(); }}>
                  <FileText className="h-4 w-4 mr-2" /> Ver documentos
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir projeto
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <TimelineStages stages={project.stages} currentStageIndex={project.currentStageIndex} progress={project.progress} />
        
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary/60" />
              {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <User className="h-3.5 w-3.5 text-primary/60" />
              {project.team}
            </div>
          </div>
          <StatusBadge status={project.status} />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 8. TimelineStages
 */
export function TimelineStages({ stages, currentStageIndex, progress }: { stages: ProjectStage[], currentStageIndex: number, progress: number }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>Progresso</span>
        <span>{progress}%</span>
      </div>
      <div className="flex gap-1 h-1.5">
        {stages.map((stage, idx) => (
          <div 
            key={stage.id} 
            className={cn(
              "flex-1 rounded-full transition-all duration-500",
              idx <= currentStageIndex ? "bg-primary" : "bg-muted"
            )}
            title={stage.name}
          />
        ))}
      </div>
      <div className="text-[10px] font-bold text-primary uppercase text-center">
        Fase: {stages[currentStageIndex]?.name || 'N/A'}
      </div>
    </div>
  );
}

/**
 * 6. TaskCard (Kanban style)
 */
export function TaskCard({ task, onStatusChange }: { task: TaskType, onStatusChange?: (id: string, s: TaskStatus) => void }) {
  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer bg-card overflow-hidden">
      <div className={cn(
        "h-1.5 w-full",
        task.priority === 'Crítica' ? 'bg-rose-600' :
        task.priority === 'Alta' ? 'bg-amber-500' :
        'bg-primary/40'
      )} />
      <CardContent className="p-4 space-y-3">
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-primary uppercase tracking-widest">{task.type}</div>
          <h4 className="text-sm font-bold leading-tight group-hover:text-primary transition-colors">{task.title}</h4>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
            <Clock className="h-3 w-3" />
            {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'}
          </div>
          <Avatar className="h-6 w-6 border border-border">
            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">US</AvatarFallback>
          </Avatar>
        </div>
        <div className="flex items-center gap-2">
           <PriorityBadge priority={task.priority} />
           {task.subtasks.length > 0 && (
             <span className="text-[10px] font-bold text-muted-foreground uppercase">{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} sub</span>
           )}
        </div>
        {task.delayReason && (
           <div className="text-[10px] p-2 bg-rose-50 text-rose-600 rounded border border-rose-100 font-medium">
             <AlertCircle className="inline h-3 w-3 mr-1" />
             {task.delayReason}
           </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 7. DocumentCard
 */
export function DocumentCard({ doc, onDownload }: { doc: DocumentType, onDownload?: () => void }) {
  const getFileIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'PDF': return <FileText className="h-5 w-5 text-rose-500" />;
      case 'XLSX': return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
      case 'IMAGE': return <FileImage className="h-5 w-5 text-blue-500" />;
      default: return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="group flex items-center justify-between p-4 bg-background border border-border/50 rounded-xl hover:bg-muted/30 transition-all">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-background border border-border/50 flex items-center justify-center shadow-sm">
          {getFileIcon(doc.type)}
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm truncate max-w-[180px]">{doc.name}</span>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
            <span>{doc.size}</span>
            <span>•</span>
            <span>{new Date(doc.date).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
          if (doc.externalLink) window.open(doc.externalLink, '_blank');
          else onDownload?.();
        }}>
          {doc.externalLink ? <Eye className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

/**
 * 12. VisualUploadFake
 */
export function VisualUploadFake({ onUpload }: { onUpload?: () => void }) {
  return (
    <div 
      className="border-2 border-dashed border-border/60 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-muted/20 hover:bg-primary/5 hover:border-primary/40 transition-all cursor-pointer group"
      onClick={onUpload}
    >
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
        <Plus className="h-6 w-6" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-bold">Arraste arquivos ou clique para upload</p>
        <p className="text-[10px] text-muted-foreground uppercase font-bold">PDF, XLSX, PNG (MAX. 10MB)</p>
      </div>
    </div>
  );
}

/**
 * 13. EmptyState
 */
export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon, title: string, description: string, action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4 animate-in fade-in duration-700">
      <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground/60">
        <Icon className="h-10 w-10" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

/**
 * 14. LoadingState
 */
export function LoadingState() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="h-8 bg-muted rounded-md w-1/4" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
      <div className="h-64 bg-muted rounded-xl w-full" />
    </div>
  );
}
