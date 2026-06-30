import { createFileRoute, useNavigate, useParams, Link } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, ExternalLink, FileSignature, Edit, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useProfile } from '@/hooks/use-profile';
import { FileViewerDialog } from '@/components/files/FileViewerDialog';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/contracts/$contractId')({
  component: ContractDetailPage,
});

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'Ativo': 'default',
  'Vigente': 'default',
  'Em Renovação': 'secondary',
  'Encerrado': 'outline',
  'Cancelado': 'destructive',
  'Suspenso': 'destructive',
};

const formatMoney = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString('pt-BR') : '—';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  );
}

function ContractDetailPage() {
  const { contractId } = useParams({ from: '/contracts/$contractId' });
  const navigate = useNavigate();
  const { role } = useProfile();
  const { filteredContracts, clients, projects } = useData();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [signed, setSigned] = useState<{ html: string; name: string | null; at: string | null } | null>(null);
  const [snapshot, setSnapshot] = useState<Record<string, any> | null>(null);
  const [commercial, setCommercial] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from('contracts')
      .select('signed_html, signed_by_name, signed_at, signature_status, contractor_snapshot, commercial_data')
      .eq('id', contractId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive || !data) return;
        if (data.signed_html) {
          setSigned({ html: data.signed_html, name: data.signed_by_name, at: data.signed_at });
        }
        setSnapshot((data.contractor_snapshot as any) ?? null);
        setCommercial((data.commercial_data as any) ?? null);
      });
    return () => { alive = false; };
  }, [contractId]);

  const contract = filteredContracts.find(c => c.id === contractId);
  const canSeeFinancial = role === 'master' || role === 'project_manager';

  if (!contract) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto py-10 text-center space-y-4">
          <FileSignature className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold">Contrato não encontrado</h2>
          <p className="text-sm text-muted-foreground">Este contrato não existe ou você não tem permissão para acessá-lo.</p>
          <Button onClick={() => navigate({ to: '/contracts' })} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </MainLayout>
    );
  }

  const client = clients.find(c => c.id === contract.clientId);
  const project = contract.projectId ? projects.find(p => p.id === contract.projectId) : null;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate({ to: '/contracts' })} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          {canSeeFinancial && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/contracts">
                <Edit className="h-4 w-4" /> Editar na listagem
              </Link>
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <FileSignature className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{contract.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{client?.name || '—'}</p>
                  </div>
                </div>
              </div>
              <Badge variant={STATUS_VARIANT[contract.status] || 'secondary'}>{contract.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Cliente" value={client?.name} />
              <Field label="Projeto" value={project?.name || 'Sem vínculo'} />
              <Field label="Produto / Serviço" value={contract.product} />
              {canSeeFinancial && <Field label="Segmento" value={contract.segment} />}
              <Field label="Data de início" value={formatDate(contract.startDate)} />
              <Field label="Data de término" value={formatDate(contract.endDate)} />
              <Field label="Prazo" value={contract.termMonths ? `${contract.termMonths} meses` : '—'} />
              {canSeeFinancial && <Field label="Vendedor responsável" value={contract.sellerId} />}
              {canSeeFinancial && <Field label="Valor mensal" value={formatMoney(contract.monthlyValue)} />}
              {canSeeFinancial && <Field label="Valor único do projeto" value={formatMoney(contract.totalValue)} />}
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {(contract.filePath || contract.externalLink) && (
                <Button onClick={() => setViewerOpen(true)} className="gap-2">
                  <Download className="h-4 w-4" /> Visualizar contrato
                </Button>
              )}
              {contract.externalLink && contract.downloadEnabled && (
                <Button variant="outline" asChild className="gap-2">
                  <a href={contract.externalLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> Link de referência
                  </a>
                </Button>
              )}
            </div>

            {canSeeFinancial && contract.internalNotes && (
              <div className="space-y-2 pt-4 border-t">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Observações internas</p>
                <p className="text-sm whitespace-pre-wrap rounded-md border bg-muted/30 p-3">{contract.internalNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {snapshot && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Dados cadastrais do contratante
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="Razão social" value={snapshot.legal_name} />
                <Field label="Nome fantasia" value={snapshot.trade_name} />
                <Field label="CNPJ" value={snapshot.cnpj} />
                <Field label="Endereço" value={[snapshot.address, snapshot.address_number].filter(Boolean).join(', ') || null} />
                <Field label="Bairro" value={snapshot.neighborhood} />
                <Field label="CEP" value={snapshot.zip_code} />
                <Field label="Cidade" value={snapshot.city} />
                <Field label="Estado" value={snapshot.state} />
                <Field label="Responsável" value={snapshot.contact_name} />
                <Field label="CPF do responsável" value={snapshot.contact_cpf} />
                <Field label="Telefone" value={snapshot.phone} />
                <Field label="E-mail" value={snapshot.email} />
                <Field label="Responsável financeiro" value={snapshot.financial_responsible} />
              </div>

              {canSeeFinancial && commercial && (
                <div className="pt-4 border-t space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dados comerciais</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Field label="Serviço" value={commercial.service_name} />
                    <Field label="Valor mensal" value={commercial.monthly_value} />
                    <Field label="Início" value={commercial.start_date} />
                    <Field label="Dia de vencimento" value={commercial.due_day} />
                    <Field label="Forma de pagamento" value={commercial.payment_method} />
                    <Field label="Prazo (dias)" value={commercial.term_days} />
                  </div>
                  {commercial.notes && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Observações comerciais</p>
                      <p className="text-sm whitespace-pre-wrap rounded-md border bg-muted/30 p-3">{commercial.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {signed && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Documento assinado
                </CardTitle>
                {signed.at && (
                  <span className="text-xs text-muted-foreground">
                    Assinado por {signed.name} em {new Date(signed.at).toLocaleString('pt-BR')}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="max-h-[800px] overflow-y-auto rounded-md border bg-white p-6 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: signed.html }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <FileViewerDialog
        item={contract ? {
          id: contract.id,
          name: contract.name,
          type: 'PDF',
          filePath: contract.filePath ?? null,
          externalLink: contract.externalLink ?? null,
          downloadEnabled: contract.downloadEnabled,
        } : null}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        allowDownload={contract.downloadEnabled}
      />
    </MainLayout>
  );
}
