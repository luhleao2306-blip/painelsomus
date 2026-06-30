import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/comercial/funil')({
  beforeLoad: () => {
    throw redirect({ to: '/comercial/prospeccoes' });
  },
  component: () => null,
});
