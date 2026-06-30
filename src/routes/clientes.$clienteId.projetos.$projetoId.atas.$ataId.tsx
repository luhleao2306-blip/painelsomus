import { createFileRoute } from '@tanstack/react-router';
import { AtaPage } from './atas.$ataId';

export const Route = createFileRoute('/clientes/$clienteId/projetos/$projetoId/atas/$ataId')({
  component: function NestedAtaRoute() {
    const { ataId } = Route.useParams();
    return <AtaPage ataId={ataId} />;
  },
});
