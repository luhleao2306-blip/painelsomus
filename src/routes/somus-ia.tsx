import { createFileRoute, Outlet, Link, useNavigate, useParams } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  listSomusConversations,
  deleteSomusConversation,
} from '@/lib/somus-ia.functions';
import { Plus, Trash2, Settings2, Radio, CircuitBoard } from 'lucide-react';
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
      toast.success('Sessão terminada');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao excluir'),
  });

  return (
    <MainLayout>
      <div className="relative h-[calc(100vh-8rem)] -mx-4 -my-6 md:-mx-6 md:-my-8 flex overflow-hidden bg-background text-foreground border-t border-border">
        {/* Holographic grid + aurora */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
              maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
            }}
          />
          <div className="absolute -top-40 left-1/3 h-[520px] w-[520px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-primary/5 blur-[120px]" />
        </div>

        {/* Left rail — session nodes */}
        <aside className="relative z-10 w-[240px] shrink-0 flex flex-col border-r border-border/60 bg-background/50 backdrop-blur-2xl">
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="relative h-8 w-8">
                <div className="absolute inset-0 rounded-md bg-primary/20 blur-md" />
                <div className="relative h-8 w-8 rounded-md border border-primary/50 bg-background flex items-center justify-center">
                  <CircuitBoard className="h-4 w-4 text-primary" strokeWidth={2} />
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[11px] tracking-[0.2em] text-primary/80">SOMUS//IA</p>
                <p className="font-mono text-[9px] text-muted-foreground tracking-wider">v.NEURAL-01</p>
              </div>
            </div>

            <button
              onClick={() => navigate({ to: '/somus-ia' })}
              className="group relative w-full flex items-center gap-2 rounded-md border border-primary/30 bg-primary/[0.06] hover:bg-primary/10 hover:border-primary/50 px-3 py-2.5 text-[12px] font-mono uppercase tracking-[0.14em] text-foreground transition-all"
            >
              <Plus className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
              <span>Nova sessão</span>
              <span className="ml-auto font-mono text-[9px] text-muted-foreground">⌘N</span>
            </button>
          </div>

          <div className="px-4 pb-2 flex items-center gap-2">
            <Radio className="h-2.5 w-2.5 text-primary animate-pulse" />
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              Log de sessões
            </span>
            <span className="ml-auto font-mono text-[9px] text-muted-foreground/60">
              {String(conversations.length).padStart(3, '0')}
            </span>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-2 pb-3 space-y-px">
              {conversations.length === 0 && (
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 px-3 py-8 text-center">
                  ∅ Nenhum registro
                </p>
              )}
              {conversations.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() =>
                    navigate({ to: '/somus-ia/$conversationId', params: { conversationId: c.id } })
                  }
                  className={cn(
                    'group relative flex items-center gap-2 px-3 py-2 cursor-pointer transition-all border-l-2',
                    activeId === c.id
                      ? 'border-primary bg-primary/[0.08] text-foreground'
                      : 'border-transparent hover:border-primary/30 hover:bg-primary/[0.03] text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="font-mono text-[9px] text-muted-foreground/60 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 truncate text-[12px]">{c.title}</span>
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Terminar esta sessão?')) del.mutate(c.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>

          {role === 'master' && (
            <div className="p-3 border-t border-border/60">
              <Link
                to="/somus-ia/agentes"
                className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground hover:text-primary transition"
              >
                <Settings2 className="h-3 w-3" /> Config · Agentes
              </Link>
            </div>
          )}

          <div className="px-4 py-2 border-t border-border/60 font-mono text-[9px] text-muted-foreground/70 tracking-wider flex items-center justify-between">
            <span>OPENAI · ONLINE</span>
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          </div>
        </aside>

        <main className="relative z-10 flex-1 min-w-0 flex flex-col">
          <Outlet />
        </main>
      </div>
    </MainLayout>
  );
}
