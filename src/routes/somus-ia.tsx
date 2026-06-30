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
import { Plus, MessageSquare, Trash2, Sparkles, Settings2 } from 'lucide-react';
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
      <div className="h-[calc(100vh-8rem)] -mx-4 -my-6 md:-mx-6 md:-my-8 flex bg-background border border-border/40 rounded-xl overflow-hidden">
        {/* Conversations sidebar */}
        <aside className="w-72 shrink-0 border-r border-border/40 bg-muted/30 flex flex-col">
          <div className="p-3 border-b border-border/40 space-y-2">
            <div className="flex items-center gap-2 px-1">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold leading-none">SOMUS IA</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Powered by OpenAI</p>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full justify-start gap-2 bg-foreground text-background hover:bg-foreground/90"
              onClick={() => navigate({ to: '/somus-ia' })}
            >
              <Plus className="h-4 w-4" /> Nova conversa
            </Button>
            {role === 'master' && (
              <Button
                size="sm"
                variant="ghost"
                className="w-full justify-start gap-2 text-xs"
                asChild
              >
                <Link to="/somus-ia/agentes">
                  <Settings2 className="h-3.5 w-3.5" /> Gerenciar agentes
                </Link>
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {conversations.length === 0 && (
                <p className="text-xs text-muted-foreground px-3 py-6 text-center">
                  Sem conversas ainda.
                </p>
              )}
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    'group flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer transition-colors',
                    activeId === c.id ? 'bg-accent' : 'hover:bg-accent/50',
                  )}
                  onClick={() =>
                    navigate({ to: '/somus-ia/$conversationId', params: { conversationId: c.id } })
                  }
                >
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
        </aside>

        <main className="flex-1 min-w-0 flex flex-col bg-background">
          <Outlet />
        </main>
      </div>
    </MainLayout>
  );
}
