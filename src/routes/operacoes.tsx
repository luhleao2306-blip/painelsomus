import { createFileRoute, Link, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import {
  ArrowLeft, Workflow, LayoutDashboard, FolderKanban, LayoutTemplate,
  ClipboardList, TrendingUp, KeyRound,
} from 'lucide-react';
import somusLogoUrl from '@/assets/somus-logo.png';
import { cn } from '@/lib/utils';

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
  { to: '/operacoes/senhas',       label: 'Senhas',        icon: KeyRound },
] as const;

function OperacoesLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="op-scope flex min-h-screen w-full flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
          <button
            type="button"
            onClick={() => navigate({ to: '/dashboard' as any })}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 text-[12px] font-medium text-zinc-400 transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Portal
          </button>
          <div className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />
          <img src={somusLogoUrl} alt="Somus" className="h-6 w-auto object-contain invert" />
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_0_rgba(0,0,0,0.4)]">
              <Workflow className="h-3.5 w-3.5" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-[13px] font-semibold tracking-tight text-white">Operações</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">Alcateia · Interno</div>
            </div>
          </div>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Ao vivo
            </span>

          </div>
        </div>
        {/* Tabs */}
        <nav className="flex items-center gap-0.5 overflow-x-auto border-t border-white/5 px-2 lg:px-4">
          {NAV.map((item) => {
            const active = 'exact' in item && item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as any}
                data-op-tab-active={active}
                className={cn(
                  'group relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-[12.5px] font-medium transition-colors',
                  active ? 'text-white' : 'text-zinc-500 hover:text-zinc-200',
                )}
              >
                <Icon className={cn('h-3.5 w-3.5 transition-colors', active && 'text-cyan-300')} />
                {item.label}
                <span
                  className={cn(
                    'op-tab-underline absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-all',
                    active ? 'bg-cyan-400 opacity-100' : 'bg-white/0 opacity-0 group-hover:bg-white/20 group-hover:opacity-100',
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

