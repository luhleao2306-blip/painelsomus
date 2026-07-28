import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/operacoes/formularios')({
  beforeLoad: () => {
    throw redirect({ to: '/formularios' as any });
  },
  component: () => null,
});
