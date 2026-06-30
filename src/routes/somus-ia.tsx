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
import { Plus, MessageSquare, Trash2, Settings2, Sparkles } from 'lucide-react';
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
      <div className="relative h-[calc(100vh-8rem)] -mx-4 -my-6 md:-mx-6 md:-my-8 flex overflow-hidden bg-background border-t border-border">
        {/* Ambient aurora background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 right-0 h-[480px] w-[480px] rounded-full bg-primary/[0.07] blur-3xl" />
        </div>

        {/* Sidebar */}
        <aside className="relative z-10 w-[270px] shrink-0 flex flex-col bg-sidebar/70 backdrop-blur-xl text-sidebar-foreground border-r border-sidebar-border">
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
                <Sparkles className="h-4.5 w-4.5" strokeWidth={2.25} />
                <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold leading-none tracking-tight">SOMUS IA</p>
                <p className="text-[10px] text-muted-foreground mt-1.5 tracking-wide">Powered by OpenAI</p>
              </div>
            </div>

            <button
              onClick={() => navigate({ to: '/somus-ia' })}
              className="group w-full flex items-center justify-between rounded-xl border border-border/60 bg-card/60 hover:bg-card hover:border-border px-3 py-2.5 text-[13px] font-medium transition-all hover:shadow-sm"
            >
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nova conversa
              </span>
              <kbd className="hidden sm:inline-flex h-5 items-center rounded-md border border-border/60 bg-muted px-1.5 text-[10px] text-muted-foreground">⌘N</kbd>
            </button>
          </div>

          <div className="px-4 pb-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
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
                    'group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-all',
                    activeId === c.id
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                      : 'hover:bg-sidebar-accent/50',
                  )}
                  onClick={() =>
                    navigate({ to: '/somus-ia/$conversationId', params: { conversationId: c.id } })
                  }
                >
                  <MessageSquare className={cn('h-3.5 w-3.5 shrink-0', activeId === c.id ? 'opacity-80' : 'opacity-50')} />
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

        <main className="relative z-10 flex-1 min-w-0 flex flex-col">
          <Outlet />
        </main>
      </div>
    </MainLayout>
  );
}
