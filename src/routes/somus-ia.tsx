import { createFileRoute, Outlet, Link, useNavigate, useParams } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  listSomusConversations,
  deleteSomusConversation,
} from '@/lib/somus-ia.functions';
import { Plus, MessageSquare, Trash2, Settings2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/use-profile';
import { toast } from 'sonner';

export const Route = createFileRoute('/somus-ia')({
  component: SomusIaLayout,
});

function SomusIaLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { role } = useProfile();
  const params = useParams({ strict: false }) as { conversationId?: string };
  const activeId = params.conversationId;

  const listFn = useServerFn(listSomusConversations);
  const deleteFn = useServerFn(deleteSomusConversation);

  const { data: conversations = [] } = useQuery({
    queryKey: ['somus-ia', 'conversations'],
    queryFn: () => listFn({}),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['somus-ia', 'conversations'] });
      if (activeId === id) navigate({ to: '/somus-ia' });
      toast.success('Conversa excluída');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao excluir'),
  });

  return (
    <MainLayout>
      <div className="h-[calc(100vh-8rem)] -mx-4 -my-6 md:-mx-6 md:-my-8 flex overflow-hidden bg-background border-t border-border">
        {/* Sidebar */}
        <aside className="w-[260px] shrink-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2.5 px-2 py-2">
              <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-none tracking-tight">SOMUS IA</p>
                <p className="text-[10px] text-muted-foreground mt-1">Powered by OpenAI</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/somus-ia' })}
              className="w-full justify-start gap-2"
            >
              <Plus className="h-4 w-4" /> Nova conversa
            </Button>
          </div>

          <div className="px-4 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Histórico
          </div>

          <ScrollArea className="flex-1">
            <div className="px-2 pb-2 space-y-0.5">
              {conversations.length === 0 && (
                <p className="text-xs text-muted-foreground px-3 py-6 text-center">
                  Sem conversas ainda
                </p>
              )}
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    'group flex items-center gap-2 rounded-md px-2.5 py-2 text-sm cursor-pointer transition-colors',
                    activeId === c.id
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'hover:bg-sidebar-accent/60',
                  )}
                  onClick={() =>
                    navigate({ to: '/somus-ia/$conversationId', params: { conversationId: c.id } })
                  }
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  <span className="flex-1 truncate text-[13px]">{c.title}</span>
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Excluir esta conversa?')) del.mutate(c.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>

          {role === 'master' && (
            <div className="p-2 border-t border-sidebar-border">
              <Button
                size="sm"
                variant="ghost"
                asChild
                className="w-full justify-start gap-2 text-xs"
              >
                <Link to="/somus-ia/agentes">
                  <Settings2 className="h-3.5 w-3.5" /> Gerenciar agentes
                </Link>
              </Button>
            </div>
          )}
        </aside>

        <main className="flex-1 min-w-0 flex flex-col bg-background">
          <Outlet />
        </main>
      </div>
    </MainLayout>
  );
}
