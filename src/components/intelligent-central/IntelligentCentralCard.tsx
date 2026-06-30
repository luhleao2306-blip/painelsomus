import React from 'react';
import { 
  ExternalLink, 
  MoreVertical, 
  Star, 
  Edit, 
  Trash2, 
  MessageSquare, 
  LayoutDashboard, 
  Link as LinkIcon, 
  FileSpreadsheet, 
  Wrench, 
  FileText, 
  HelpCircle 
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { IntelligentCentralItem } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';

interface IntelligentCentralCardProps {
  item: IntelligentCentralItem;
  onEdit: (item: IntelligentCentralItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  canManage: boolean;
}

const typeIcons: Record<string, any> = {
  'Agente GPT': MessageSquare,
  'Dashboard': LayoutDashboard,
  'Lovable': LinkIcon,
  'Planilha': FileSpreadsheet,
  'Ferramenta': Wrench,
  'Documento': FileText,
  'Site': LinkIcon,
  'Outro': HelpCircle,
};

const audienceLabels: Record<string, { label: string; className: string }> = {
  self: { label: 'Somente eu', className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' },
  all_clients: { label: 'Todos os clientes', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  specific_clients: { label: 'Clientes específicos', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
};

function AudienceBadge({ audience }: { audience?: string }) {
  const meta = audienceLabels[audience ?? 'self'] ?? audienceLabels.self;
  return (
    <Badge variant="outline" className={cn('text-[10px] font-semibold', meta.className)}>
      {meta.label}
    </Badge>
  );
}

export function IntelligentCentralCard({ 
  item, 
  onEdit, 
  onDelete, 
  onToggleFavorite,
  canManage 
}: IntelligentCentralCardProps) {
  const Icon = typeIcons[item.type] || HelpCircle;

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-md border-border/50">
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "h-8 w-8 text-muted-foreground hover:text-yellow-500",
                item.isFavorite && "text-yellow-500 fill-yellow-500"
              )}
              onClick={() => onToggleFavorite(item.id, item.isFavorite)}
            >
              <Star className="h-4 w-4" />
            </Button>
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(item.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
              {item.type}
            </Badge>
            <AudienceBadge audience={item.audience} />
          </div>
          <CardTitle className="text-base font-bold line-clamp-1">{item.name}</CardTitle>
          {item.category && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mt-1">
              {item.category}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <CardDescription className="text-xs line-clamp-2 h-8">
          {item.description || "Nenhuma descrição fornecida."}
        </CardDescription>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          variant="outline" 
          className="w-full h-9 text-xs font-semibold gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          asChild
        >
          <a href={item.linkUrl} target="_blank" rel="noopener noreferrer">
            Abrir Link
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
