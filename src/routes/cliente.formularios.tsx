import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText } from 'lucide-react';
import { formPublicUrl, type ClientFormRequest } from '@/lib/client-forms';

export const Route = createFileRoute('/cliente/formularios')({
  component: ClientFormsPage,
  head: () => ({
    meta: [
      { title: 'Meus Formulários | Somus Group' },
      {
        name: 'description',
        content:
          'Acompanhe os formulários estratégicos enviados pela Somus: veja o que está pendente, continue de onde parou e consulte o que já foi respondido.',
      },
      { property: 'og:title', content: 'Meus Formulários | Somus Group' },
      {
        property: 'og:description',
        content: 'Formulários pendentes e respondidos do seu escritório no portal da Somus.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
});

function ClientFormsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['my-client-forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_form_requests' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ClientFormRequest[];
    },
  });

  const pending = data.filter(r => r.status !== 'submitted');
  const done = data.filter(r => r.status === 'submitted');

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Somus</p>
        <h1 className="mt-1 font-display text-3xl">Meus Formulários</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Formulários enviados pela consultoria. Você pode salvar e continuar depois.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {!isLoading && data.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhum formulário disponível no momento.
        </Card>
      )}

      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl">Pendentes</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {pending.map(r => (
              <Card key={r.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{r.template_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Enviado em {new Date(r.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant="secondary">{r.progress}%</Badge>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${r.progress}%` }} />
                </div>
                <Button asChild className="mt-4 w-full">
                  <a href={formPublicUrl(r.token)} target="_blank" rel="noreferrer">
                    {r.progress > 0 ? 'Continuar preenchimento' : 'Preencher agora'}
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl">Respondidos</h2>
          <Card className="divide-y">
            {done.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-4">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.template_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Enviado em{' '}
                    {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('pt-BR') : '—'}
                  </p>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">
                  Respondido
                </Badge>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
