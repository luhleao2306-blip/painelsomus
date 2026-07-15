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
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
          <button
            type="button"
            onClick={() => navigate({ to: '/dashboard' as any })}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Portal
          </button>
          <div className="mx-1 hidden h-4 w-px bg-border sm:block" />
          <img src={somusLogoUrl} alt="Somus" className="h-6 w-auto object-contain dark:invert" />
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background">
              <Workflow className="h-3.5 w-3.5" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-[13px] font-semibold tracking-tight">Operações</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Alcateia · Interno</div>
            </div>
          </div>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Ao vivo
            </span>
          </div>
        </div>
        {/* Tabs */}
        <nav className="flex items-center gap-0.5 overflow-x-auto border-t border-border/60 px-2 lg:px-4">
          {NAV.map((item) => {
            const active = 'exact' in item && item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as any}
                className={cn(
                  'group relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-[12.5px] font-medium transition-colors',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
                <span
                  className={cn(
                    'absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-all',
                    active ? 'bg-foreground opacity-100' : 'bg-foreground/0 opacity-0 group-hover:opacity-30',
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
