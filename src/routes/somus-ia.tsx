import { createFileRoute, Outlet, Link, useNavigate, useParams } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  listSomusConversations,
  deleteSomusConversation,
} from '@/lib/somus-ia.functions';
import { Plus, Trash2, Settings2 } from 'lucide-react';
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
      toast.success('Edição arquivada');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro'),
  });

  return (
    <MainLayout>
      <div className="relative h-[calc(100vh-8rem)] -mx-4 -my-6 md:-mx-6 md:-my-8 flex overflow-hidden bg-background text-foreground border-t border-border">
        {/* Left: masthead + archive */}
        <aside className="relative w-[260px] shrink-0 flex flex-col border-r border-border bg-card/30">
          <div className="px-6 pt-6 pb-4 border-b border-border">
            <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
              Edição N.º {String(conversations.length + 1).padStart(3, '0')}
            </p>
            <h2 className="mt-2 font-serif text-3xl leading-none italic text-foreground">
              Somus<span className="text-primary">.</span>
            </h2>
            <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Inteligência editorial
            </p>
          </div>

          <div className="p-4">
            <button
              onClick={() => navigate({ to: '/somus-ia' })}
              className="w-full flex items-center justify-between border border-foreground/80 bg-foreground text-background hover:bg-foreground/90 px-4 py-3 text-[11px] uppercase tracking-[0.22em] transition"
            >
              <span className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5" /> Nova pauta
              </span>
            </button>
          </div>

          <div className="px-6 pt-2 pb-2 flex items-baseline justify-between border-b border-border/60">
            <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Arquivo
            </span>
            <span className="font-serif italic text-xs text-muted-foreground">
              {conversations.length} peças
            </span>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-2 py-2">
              {conversations.length === 0 && (
                <p className="px-4 py-10 text-center font-serif italic text-sm text-muted-foreground">
                  Sem edições anteriores
                </p>
              )}
              {conversations.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() =>
                    navigate({ to: '/somus-ia/$conversationId', params: { conversationId: c.id } })
                  }
                  className={cn(
                    'group relative px-4 py-3 cursor-pointer transition border-l-2',
                    activeId === c.id
                      ? 'border-primary bg-primary/[0.05]'
                      : 'border-transparent hover:border-foreground/30 hover:bg-muted/30',
                  )}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif italic text-[11px] text-muted-foreground tabular-nums">
                      №{String(conversations.length - i).padStart(2, '0')}
                    </span>
                    <p
                      className={cn(
                        'flex-1 text-[13px] leading-snug line-clamp-2',
                        activeId === c.id ? 'text-foreground font-medium' : 'text-foreground/80',
                      )}
                    >
                      {c.title}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Arquivar esta peça?')) del.mutate(c.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>

          {role === 'master' && (
            <div className="p-4 border-t border-border">
              <Link
                to="/somus-ia/agentes"
                className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition"
              >
                <Settings2 className="h-3 w-3" /> Corpo editorial
              </Link>
            </div>
          )}
        </aside>

        <main className="relative flex-1 min-w-0 flex flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </MainLayout>
  );
}
