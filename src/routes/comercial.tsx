import { createFileRoute } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Lock } from 'lucide-react';
import { InDevelopmentNotice } from '@/components/common/InDevelopmentNotice';
import { useProfile, type UserRole } from '@/hooks/use-profile';

const ALLOWED_ROLES: UserRole[] = ['master', 'project_manager'];

export const Route = createFileRoute('/comercial')({
  component: ComercialLayout,
});

function ComercialLayout() {
  const { role, loading, authReady } = useProfile();

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

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Comercial</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de prospecções e desempenho comercial
          </p>
        </div>

        <InDevelopmentNotice module="Comercial" />
      </div>
    </MainLayout>
  );
}
