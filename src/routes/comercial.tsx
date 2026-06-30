import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Briefcase, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile, type UserRole } from '@/hooks/use-profile';

const ALLOWED_ROLES: UserRole[] = ['master', 'project_manager'];

export const Route = createFileRoute('/comercial')({
  component: ComercialLayout,
});

function ComercialLayout() {
  const { role, loading, authReady } = useProfile();
  const { pathname } = useLocation();

  if (!authReady || loading) {
    return (
      <MainLayout>
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Carregando...
        </div>
      </MainLayout>
    );
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você não tem permissão para acessar o módulo Comercial.
          </p>
        </div>
      </MainLayout>
    );
  }

  const tabs = [
    { to: '/comercial', label: 'Dashboard', exact: true },
    { to: '/comercial/prospeccoes', label: 'Funil Comercial', exact: false },
  ] as const;

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Comercial</h1>
            <p className="text-sm text-muted-foreground">
              Gestão de prospecções e desempenho comercial
            </p>
          </div>
        </div>

        <div className="border-b border-border">
          <nav className="flex gap-1">
            {tabs.map((tab) => {
              const active = isActive(tab.to, tab.exact);
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    'relative px-4 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                  {active && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <Outlet />
      </div>
    </MainLayout>
  );
}
