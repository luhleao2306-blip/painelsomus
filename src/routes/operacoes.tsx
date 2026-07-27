import { createFileRoute, Link, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import {
  ArrowLeft, Workflow, LayoutDashboard, FolderKanban, LayoutTemplate,
  ClipboardList, TrendingUp, KeyRound, Sun, Moon, Loader2,
} from 'lucide-react';
import somusLogoUrl from '@/assets/somus-logo.png';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/use-profile-wrapper';
import { useOpStore } from '@/lib/operacoes-store';

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

type Theme = 'dark' | 'light';
const THEME_KEY = 'op-theme';

function OperacoesLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { profile, loading } = useProfile();
  const opStoreState = useOpStore();
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY) as Theme | null;
      if (stored === 'light' || stored === 'dark') setTheme(stored);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }, [theme]);

  // Bloqueia acesso: apenas usuários internos (master, project_manager, consultant)
  useEffect(() => {
    if (loading) return;
    const role = profile?.role;
    const allowed = role === 'master' || role === 'project_manager' || role === 'consultant';
    if (!allowed) navigate({ to: '/dashboard' as any, replace: true });
  }, [loading, profile?.role, navigate]);

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  const role = profile.role;
  if (role !== 'master' && role !== 'project_manager' && role !== 'consultant') {
    return null;
  }

  const isLight = theme === 'light';
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <div
      className={cn(
        'op-scope flex min-h-screen w-full flex-col bg-background text-foreground',
        isLight && 'op-light',
      )}
    >
      <header
        className={cn(
          'sticky top-0 z-30 backdrop-blur-xl',
          isLight
            ? 'border-b border-black/10 bg-white/80'
            : 'border-b border-white/10 bg-[#0a0a0a]/80',
        )}
      >
        {/* Editorial masthead — somus.group inspired */}
        <div className="flex h-16 items-center gap-4 px-4 lg:px-8">
          <button
            type="button"
            onClick={() => navigate({ to: '/dashboard' as any })}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors',
              isLight
                ? 'border border-black/10 bg-black/[0.02] text-zinc-600 hover:border-black/25 hover:bg-black/[0.05] hover:text-black'
                : 'border border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-white',
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Portal
          </button>

          <div className={cn('mx-1 hidden h-6 w-px sm:block', isLight ? 'bg-black/10' : 'bg-white/10')} />

          <img
            src={somusLogoUrl}
            alt="Somus"
            className={cn('h-6 w-auto object-contain transition', isLight ? '' : 'invert')}
          />

          <div className="ml-4 hidden items-center gap-3 sm:flex">
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md',
                isLight
                  ? 'bg-zinc-950 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_0_rgba(0,0,0,0.1)]'
                  : 'bg-white text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_0_rgba(0,0,0,0.4)]',
              )}
            >
              <Workflow className="h-3.5 w-3.5" />
            </div>
            <div className="leading-tight">
              <div
                className="font-display text-[15px] font-semibold tracking-[-0.01em]"
                style={{ fontFamily: '"Instrument Serif", "Cormorant Garamond", Georgia, serif' }}
              >
                Operações
              </div>
              <div
                className={cn(
                  'font-mono text-[9px] uppercase tracking-[0.22em]',
                  isLight ? 'text-zinc-500' : 'text-zinc-500',
                )}
              >
                Alcateia · Interno
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span
              className={cn(
                'hidden items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] md:inline-flex',
                opStoreState._lastSyncError
                  ? 'border border-destructive/30 bg-destructive/10 text-destructive'
                  : isLight
                    ? 'border border-black/10 bg-black/[0.02] text-zinc-600'
                    : 'border border-white/15 bg-white/[0.04] text-zinc-300',
              )}
              title={opStoreState._lastSyncError ?? undefined}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 animate-pulse rounded-full',
                  opStoreState._lastSyncError ? 'bg-destructive' : isLight ? 'bg-zinc-900' : 'bg-white',
                )}
              />
              {opStoreState._lastSyncError ? 'Erro ao salvar' : opStoreState._syncing ? 'Salvando' : 'Ao vivo'}
            </span>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isLight ? 'Ativar modo noite' : 'Ativar modo dia'}
              title={isLight ? 'Modo noite' : 'Modo dia'}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                isLight
                  ? 'border border-black/10 bg-white text-zinc-700 hover:border-black/30 hover:text-black'
                  : 'border border-white/10 bg-white/[0.04] text-zinc-300 hover:border-white/25 hover:text-white',
              )}
            >
              {isLight ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <nav
          className={cn(
            'flex items-center gap-0.5 overflow-x-auto px-2 lg:px-6',
            isLight ? 'border-t border-black/5' : 'border-t border-white/5',
          )}
        >
          {NAV.map((item) => {
            const active = 'exact' in item && item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as any}
                data-op-tab-active={active}
                className={cn(
                  'group relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-[11.5px] font-medium uppercase tracking-[0.14em] transition-colors',
                  active
                    ? isLight ? 'text-black' : 'text-white'
                    : isLight ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-500 hover:text-zinc-200',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
                <span
                  className={cn(
                    'op-tab-underline absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-all',
                    active
                      ? isLight ? 'bg-zinc-900 opacity-100' : 'bg-white opacity-100'
                      : isLight
                        ? 'bg-black/0 opacity-0 group-hover:bg-black/20 group-hover:opacity-100'
                        : 'bg-white/0 opacity-0 group-hover:bg-white/20 group-hover:opacity-100',
                  )}
                />
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
