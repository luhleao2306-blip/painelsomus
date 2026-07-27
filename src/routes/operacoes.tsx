import { createFileRoute, Link, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import {
  LayoutDashboard, FolderKanban, LayoutTemplate,
  ClipboardList, TrendingUp, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/use-profile-wrapper';
import { useOpStore } from '@/lib/operacoes-store';
import { MainLayout } from '@/components/layout/MainLayout';
import { useTheme } from '@/components/theme/theme-provider';

export const Route = createFileRoute('/operacoes')({
  component: OperacoesLayout,
  head: () => ({
    meta: [
      { title: 'Operações — Somus' },
      { name: 'description', content: 'Central de operações da Somus — Asana interno da alcateia.' },
    ],
  }),
});

const NAV = [
  { to: '/operacoes',              label: 'Visão Geral',   icon: LayoutDashboard, exact: true },
  { to: '/operacoes/projetos',     label: 'Projetos',      icon: FolderKanban },
  { to: '/operacoes/modelos',      label: 'Modelos',       icon: LayoutTemplate },
  { to: '/operacoes/formularios',  label: 'Formulários',   icon: ClipboardList },
  { to: '/operacoes/performance',  label: 'Performance',   icon: TrendingUp },
] as const;

function OperacoesLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { profile, loading } = useProfile();
  const opStoreState = useOpStore();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Bloqueia acesso: apenas usuários internos (master, project_manager, consultant)
  useEffect(() => {
    if (loading) return;
    const role = profile?.role;
    const allowed = role === 'master' || role === 'project_manager' || role === 'consultant';
    if (!allowed) navigate({ to: '/dashboard' as any, replace: true });
  }, [loading, profile?.role, navigate]);

  if (loading || !profile) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] w-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }
  const role = profile.role;
  if (role !== 'master' && role !== 'project_manager' && role !== 'consultant') {
    return null;
  }

  return (
    <MainLayout>
      <div className="op-scope op-light flex min-h-full w-full flex-col bg-background text-foreground">
        <div className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-2 lg:px-6">
            <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto">
              {NAV.map((item) => {
                const active = 'exact' in item && item.exact ? pathname === item.to : pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    data-op-tab-active={active}
                    className={cn(
                      'group relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[11.5px] font-medium uppercase tracking-[0.14em] transition-colors',
                      active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                    <span
                      className={cn(
                        'op-tab-underline absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-all',
                        active
                          ? 'bg-foreground opacity-100'
                          : 'bg-foreground/0 opacity-0 group-hover:bg-foreground/30 group-hover:opacity-100',
                      )}
                    />
                  </Link>
                );
              })}
            </nav>

            <span
              className={cn(
                'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] md:inline-flex',
                opStoreState._lastSyncError
                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                  : 'border-border bg-muted/40 text-muted-foreground',
              )}
              title={opStoreState._lastSyncError ?? undefined}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 animate-pulse rounded-full',
                  opStoreState._lastSyncError ? 'bg-destructive' : 'bg-foreground',
                )}
              />
              {opStoreState._lastSyncError ? 'Erro ao salvar' : opStoreState._syncing ? 'Salvando' : 'Ao vivo'}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </MainLayout>
  );
}
