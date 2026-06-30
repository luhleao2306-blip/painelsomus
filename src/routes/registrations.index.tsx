import { createFileRoute } from '@tanstack/react-router';
import { RegistrationsListPage } from './registrations';

export const Route = createFileRoute('/registrations/')({
  component: RegistrationsListPage,
});