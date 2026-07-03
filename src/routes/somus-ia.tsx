import { createFileRoute, Outlet, Link, useNavigate, useParams } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  listSomusConversations,
  deleteSomusConversation,
} from '@/lib/somus-ia.functions';
import { Plus, X, Settings2, PanelLeft } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/use-profile';
import { toast } from 'sonner';

export const Route = createFileRoute('/somus-ia')({
  component: SomusIaLayout,
});

function SomusIaLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { role, profile, authReady } = useProfile();
  const params = useParams({ strict: false }) as { conversationId?: string };
  const activeId = params.conversationId;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const listFn = useServerFn(listSomusConversations);
  const deleteFn = useServerFn(deleteSomusConversation);

  const { data: conversations = [] } = useQuery({
    queryKey: ['somus-ia', 'conversations'],
    queryFn: () => listFn({}),
    enabled: authReady && !!profile,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['somus-ia', 'conversations'] });
      if (activeId === id) navigate({ to: '/somus-ia' });
      toast.success('Board removido');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro'),
  });

  return (
    <MainLayout>
      <div className="relative h-[calc(100vh-8rem)] -mx-4 -my-6 md:-mx-6 md:-my-8 flex overflow-hidden bg-white text-neutral-900">
        {/* Top rail */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-2 px-4 h-12 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            className={cn(
              'h-8 w-8 flex items-center justify-center rounded-md hover:bg-neutral-100 transition',
              drawerOpen && 'bg-neutral-100',
            )}
            aria-label="Boards"
          >
            <PanelLeft className="h-4 w-4 text-neutral-700" />
          </button>

          <div className="flex items-center gap-2 pl-1">
            <div className="h-5 w-5 rounded-sm bg-neutral-900" />
            <p className="text-[13px] font-medium tracking-tight">SOMUS IA</p>
            <span className="text-[11px] text-neutral-400">·</span>
            <span className="text-[11px] text-neutral-500">Canvas</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => navigate({ to: '/somus-ia' })}
              className="flex items-center gap-1.5 text-[12px] px-3 h-8 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Novo board
            </button>
            {role === 'master' && (
              <Link
                to="/somus-ia/agentes"
                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-neutral-100 transition"
                aria-label="Agentes"
              >
                <Settings2 className="h-4 w-4 text-neutral-700" />
              </Link>
            )}
          </div>
        </div>

        {/* Drawer */}
        {drawerOpen && (
          <>
            <div
              className="absolute inset-0 z-20 bg-neutral-900/10"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="absolute top-12 left-0 bottom-0 z-30 w-[280px] bg-white border-r border-neutral-200 flex flex-col shadow-xl">
              <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500 font-medium">
                  Boards
                </p>
                <span className="text-[11px] text-neutral-400 tabular-nums">
                  {conversations.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {conversations.length === 0 && (
                  <p className="px-3 py-8 text-center text-[12px] text-neutral-400">
                    Nenhum board ainda
                  </p>
                )}
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      navigate({
                        to: '/somus-ia/$conversationId',
                        params: { conversationId: c.id },
                      });
                      setDrawerOpen(false);
                    }}
                    className={cn(
                      'group relative px-3 py-2.5 rounded-md cursor-pointer transition',
                      activeId === c.id
                        ? 'bg-neutral-100'
                        : 'hover:bg-neutral-50',
                    )}
                  >
                    <p className="text-[13px] text-neutral-800 truncate pr-6">
                      {c.title}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      {new Date(c.last_message_at ?? c.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Remover este board?')) del.mutate(c.id);
                      }}
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded hover:bg-neutral-200 transition"
                    >
                      <X className="h-3 w-3 text-neutral-500" />
                    </button>
                  </div>
                ))}
              </div>
            </aside>
          </>
        )}

        <main className="relative flex-1 min-w-0 flex flex-col pt-12">
          <Outlet />
        </main>
      </div>
    </MainLayout>
  );
}
