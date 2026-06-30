import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Trophy, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile, type UserRole } from '@/hooks/use-profile';

const ALLOWED_ROLES: UserRole[] = ['master', 'project_manager', 'consultant'];

export const Route = createFileRoute('/gamificacao')({
  component: GamificacaoLayout,
});

function GamificacaoLayout() {
  const { role, loading, authReady } = useProfile();
  const { pathname } = useLocation();

  if (!authReady || loading) {
    return (
      <MainLayout>
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Carregando...</div>
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
            O módulo de Gamificação é interno e não está disponível para clientes.
          </p>
        </div>
      </MainLayout>
    );
  }

  const tabs = [
    { to: '/gamificacao', label: 'Dashboard', exact: true },
    { to: '/gamificacao/galeria-do-lobo', label: 'Galeria do Lobo' },
    { to: '/gamificacao/pins', label: 'Pins & Conquistas' },
    { to: '/gamificacao/habitos', label: 'Hábitos Saudáveis' },
    { to: '/gamificacao/loja', label: 'Loja da Alcateia' },
    { to: '/gamificacao/resgates', label: 'Resgates' },
    { to: '/gamificacao/estrela-do-lider', label: 'Reconhecimentos' },
  ] as const;

  const isActive = (to: string, exact?: boolean) => (exact ? pathname === to : pathname.startsWith(to));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Carreira</h1>
            <p className="text-sm text-muted-foreground">Trilha do Lobo — cultura, performance e reconhecimento</p>
          </div>
        </div>

        <div className="border-b border-border overflow-x-auto">
          <nav className="flex gap-1 min-w-max">
            {tabs.map((t) => {
              const active = isActive(t.to, (t as any).exact);
              return (
                <Link
                  key={t.to}
                  to={t.to as any}
                  className={cn(
                    'relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.label}
                  {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />}
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
