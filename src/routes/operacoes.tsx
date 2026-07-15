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
  { to: '/operacoes',              label: 'Visão Geral',        icon: LayoutDashboard, exact: true },
  { to: '/operacoes/projetos',     label: 'Pastas & Projetos',  icon: FolderKanban },
  { to: '/operacoes/modelos',      label: 'Modelos',            icon: LayoutTemplate },
  { to: '/operacoes/formularios',  label: 'Formulários',        icon: ClipboardList },
  { to: '/operacoes/performance',  label: 'Performance do Time',icon: TrendingUp },
  { to: '/operacoes/senhas',       label: 'Senhas',             icon: KeyRound },
] as const;

function OperacoesLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 lg:px-6">
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
          <Workflow className="h-4 w-4 text-primary" />
          <span className="font-display text-sm font-semibold tracking-tight">Operações</span>
        </div>
        <span className="ml-2 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-widest text-primary">
          Interno · Alcateia
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border/60 bg-muted/20 md:flex">
          <nav className="p-3">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to as any}
                  className={cn(
                    'mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
