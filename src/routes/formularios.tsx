import { createFileRoute } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileDown, Eye, Search } from 'lucide-react';
import {
  usePublicSubmissions,
  submissionFields,
  submissionRespondent,
  exportSubmissionPDF,
  type PublicSubmission,
} from '@/lib/client-forms';

export const Route = createFileRoute('/formularios')({
  component: FormulariosPage,
  head: () => ({
    meta: [
      { title: 'Visão de Clientes | Somus Group' },
      {
        name: 'description',
        content:
          'Acompanhe as respostas dos formulários preenchidos pelos clientes direto no painel.',
      },
      { property: 'og:title', content: 'Visão de Clientes | Somus Group' },
      {
        property: 'og:description',
        content: 'Gestão dos formulários preenchidos pelos clientes: visualização e exportação em PDF.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
});

function FormulariosPage() {
  const [q, setQ] = useState('');
  const { data: submissions = [], isLoading: loadingSubs } = usePublicSubmissions();
  const [viewingSub, setViewingSub] = useState<PublicSubmission | null>(null);

  return (
    <MainLayout>

    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Relacionamento
          </p>
          <h1 className="mt-1 font-display text-3xl">Visão de Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualize as respostas recebidas através dos links de formulários públicos.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar resposta..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <Badge variant="secondary">{submissions.length} respostas</Badge>
      </div>

      <Card className="divide-y">
        {loadingSubs && <p className="p-6 text-sm text-muted-foreground">Carregando…</p>}
        {!loadingSubs && submissions.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-sm font-medium">Nenhuma resposta recebida ainda.</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              Assim que um cliente preencher um formulário pelo link público gerado no portal, a
              resposta aparece aqui automaticamente.
            </p>
          </div>
        )}

        {submissions
          .filter(s => {
            if (!q) return true;
            const respondent = submissionRespondent(s).toLowerCase();
            const formName = (s.form_name ?? '').toLowerCase();
            const term = q.toLowerCase();
            return respondent.includes(term) || formName.includes(term);
          })
          .map(s => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{submissionRespondent(s)}</p>
                  <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">
                    Respondido
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {s.form_name ?? 'Formulário'} · enviado em{' '}
                  {new Date(s.submitted_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => setViewingSub(s)} title="Ver respostas">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => exportSubmissionPDF(s)} title="Exportar PDF">
                  <FileDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
      </Card>

      <Dialog open={!!viewingSub} onOpenChange={o => !o && setViewingSub(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingSub ? submissionRespondent(viewingSub) : ''}</DialogTitle>
            <DialogDescription>{viewingSub?.form_name ?? 'Formulário'}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-2">
              {viewingSub &&
                submissionFields(viewingSub).map((f, i) => (
                  <Field key={i} label={f.label} value={f.value} />
                ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            {viewingSub && (
              <Button onClick={() => exportSubmissionPDF(viewingSub)}>
                <FileDown className="mr-1.5 h-4 w-4" /> Exportar PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </MainLayout>
  );
}

function Field({ label, value }: { label: string; value?: any }) {
  return (
    <div className="rounded-md border border-border/60 p-3">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{String(value ?? '').trim() || '—'}</p>
    </div>
  );
}
