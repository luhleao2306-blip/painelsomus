import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft, CheckCircle2, XCircle, AlertCircle, Loader2, History, Copy,
  FileText, FileSignature, Send, Eye, KeyRound,
} from 'lucide-react';
import {
  getRegistration, updateInternalNotes, updateRegistrationStatus,
  requestCorrection, approveRegistration, rejectRegistration,
} from '@/lib/onboarding.functions';
import {
  prepareContract, updateContractCommercial, sendContractForSignature,
  getContractForRegistration, releaseAccess,
} from '@/lib/contracts.functions';
import { ContractTemplate } from '@/components/ContractTemplate';

export const Route = createFileRoute('/registrations/$id')({
  component: RegistrationDetailPage,
});

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_analise: 'Em Análise',
  aguardando_correcao: 'Aguardando Correção',
  aprovado: 'Aprovado',
  aguardando_contrato: 'Aguardando Contrato',
  aguardando_assinatura: 'Aguardando Assinatura',
  contrato_assinado: 'Contrato Assinado',
  ativo: 'Ativo',
  reprovado: 'Reprovado',
};
const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pendente: 'secondary', em_analise: 'outline', aguardando_correcao: 'outline',
  aprovado: 'default', aguardando_contrato: 'outline', aguardando_assinatura: 'outline',
  contrato_assinado: 'default', ativo: 'default', reprovado: 'destructive',
};

const FIELD_LABELS: Record<string, string> = {
  legal_name: 'Razão Social', trade_name: 'Nome Fantasia', cnpj: 'CNPJ',
  founded_at: 'Data de Fundação', segment: 'Segmento', employees_count: 'Colaboradores',
  monthly_revenue: 'Faturamento', website: 'Site', instagram: 'Instagram',
  contact_name: 'Nome do Responsável', contact_role: 'Cargo', contact_cpf: 'CPF do Responsável',
  phone: 'Telefone', whatsapp: 'WhatsApp', email: 'E-mail',
  state: 'Estado', city: 'Cidade', zip_code: 'CEP', address: 'Endereço',
  address_number: 'Número', neighborhood: 'Bairro', financial_responsible: 'Responsável Financeiro',
};

function RegistrationDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getRegistration);
  const notesFn = useServerFn(updateInternalNotes);
  const statusFn = useServerFn(updateRegistrationStatus);
  const correctionFn = useServerFn(requestCorrection);
  const approveFn = useServerFn(approveRegistration);
  const rejectFn = useServerFn(rejectRegistration);

  const prepareFn = useServerFn(prepareContract);
  const updateCommercialFn = useServerFn(updateContractCommercial);
  const sendContractFn = useServerFn(sendContractForSignature);
  const releaseFn = useServerFn(releaseAccess);
  const getContractFn = useServerFn(getContractForRegistration);

  const { data, isLoading } = useQuery({
    queryKey: ['registration', id],
    queryFn: () => getFn({ data: { id } }),
  });
  const { data: contract } = useQuery({
    queryKey: ['registration-contract', id],
    queryFn: () => getContractFn({ data: { registration_id: id } }),
  });

  const [notes, setNotes] = useState<string>('');
  const [notesInit, setNotesInit] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionFields, setCorrectionFields] = useState<string[]>([]);
  const [correctionNote, setCorrectionNote] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('em_analise');
  const [statusReason, setStatusReason] = useState('');
  const [credentials, setCredentials] = useState<{ email: string } | null>(null);

  // Contract preview/edit state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [commercial, setCommercial] = useState<any>({
    service_name: '', monthly_value: '', start_date: '', due_day: '',
    payment_method: '', term_days: '', notes: '',
  });
  useEffect(() => {
    if (contract?.commercial_data) setCommercial({ ...{
      service_name: '', monthly_value: '', start_date: '', due_day: '',
      payment_method: '', term_days: '', notes: '',
    }, ...(contract.commercial_data as any) });
  }, [contract?.id]);

  if (isLoading) return <MainLayout><div className="py-20 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div></MainLayout>;
  if (!data) return <MainLayout><div className="py-20 text-center">Cadastro não encontrado.</div></MainLayout>;

  const { registration: r, history } = data as any;
  if (notesInit !== r.internal_notes) { setNotesInit(r.internal_notes); setNotes(r.internal_notes || ''); }

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['registration', id] });
    qc.invalidateQueries({ queryKey: ['registration-contract', id] });
  };

  const saveNotes = async () => {
    await notesFn({ data: { id, notes } });
    toast.success('Observações salvas');
    refresh();
  };

  const doApprove = async () => {
    try {
      await approveFn({ data: { id } });
      toast.success('Ficha aprovada — agora prepare o contrato');
      refresh();
    } catch (e: any) { toast.error(e?.message || 'Erro ao aprovar'); }
  };

  const doReject = async () => {
    if (!rejectReason.trim()) return toast.error('Informe o motivo');
    await rejectFn({ data: { id, reason: rejectReason } });
    toast.success('Cadastro reprovado');
    setRejectOpen(false); setRejectReason(''); refresh();
  };

  const doCorrection = async () => {
    if (correctionFields.length === 0) return toast.error('Selecione ao menos um campo');
    if (!correctionNote.trim()) return toast.error('Adicione uma observação');
    const res = await correctionFn({ data: { id, fields: correctionFields, note: correctionNote } });
    const url = `${window.location.origin}/onboarding/${res.token}`;
    navigator.clipboard.writeText(url).catch(() => {});
    toast.success('Correção solicitada — novo link copiado', { description: url });
    setCorrectionOpen(false); setCorrectionFields([]); setCorrectionNote(''); refresh();
  };

  const doStatus = async () => {
    if (!statusReason.trim()) return toast.error('Informe o motivo');
    await statusFn({ data: { id, status: newStatus as any, reason: statusReason } });
    toast.success('Status atualizado');
    setStatusOpen(false); setStatusReason(''); refresh();
  };

  const doPrepare = async () => {
    try {
      await prepareFn({ data: { registration_id: id } });
      toast.success('Minuta de contrato criada');
      refresh();
    } catch (e: any) { toast.error(e?.message || 'Erro'); }
  };

  const doSaveCommercial = async () => {
    if (!contract?.id) return;
    try {
      await updateCommercialFn({ data: { id: contract.id, commercial } });
      toast.success('Dados comerciais salvos');
      refresh();
    } catch (e: any) { toast.error(e?.message || 'Erro'); }
  };

  const doSendForSignature = async () => {
    if (!contract?.id) return;
    try {
      // Garante que os dados comerciais preenchidos sejam salvos antes de gerar o link
      await updateCommercialFn({ data: { id: contract.id, commercial } });
      const res = await sendContractFn({ data: { id: contract.id } });
      const url = `${window.location.origin}/contrato/${res.token}`;
      navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Link de assinatura gerado e copiado', { description: url, duration: 8000 });
      refresh();
    } catch (e: any) { toast.error(e?.message || 'Erro'); }
  };

  const doRelease = async () => {
    try {
      const res = await releaseFn({ data: { registration_id: id } });
      setCredentials({ email: res.email });
      toast.success(`Acesso liberado — convite enviado para ${res.email}`);
      refresh();
    } catch (e: any) { toast.error(e?.message || 'Erro'); }
  };

  const contractStatus = contract?.signature_status as string | undefined;
  const canPrepareContract = r.status === 'aprovado' && !contract;
  const canEditContract = contract && contractStatus === 'draft';
  const canSendContract = contract && contractStatus === 'draft';
  const isAwaitingSignature = contract && contractStatus === 'sent';
  const isSigned = contract && contractStatus === 'signed';
  const canRelease = isSigned && r.status !== 'ativo';

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate({ to: '/registrations' })}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
          </Button>
          <Badge variant={STATUS_VARIANTS[r.status]} className="text-sm">{STATUS_LABELS[r.status] || r.status}</Badge>
        </div>

        <header>
          <h1 className="font-display text-2xl font-semibold">{r.trade_name}</h1>
          <p className="text-sm text-muted-foreground">{r.legal_name} • CNPJ {r.cnpj}</p>
        </header>

        <div className="flex flex-wrap gap-2">
          {!['aprovado','aguardando_contrato','aguardando_assinatura','contrato_assinado','ativo'].includes(r.status) && (
            <Button onClick={doApprove}><CheckCircle2 className="h-4 w-4 mr-1.5" /> Aprovar Ficha</Button>
          )}
          {r.status !== 'reprovado' && r.status !== 'ativo' && (
            <Button variant="destructive" onClick={() => setRejectOpen(true)}><XCircle className="h-4 w-4 mr-1.5" /> Reprovar</Button>
          )}
          <Button variant="outline" onClick={() => setCorrectionOpen(true)}><AlertCircle className="h-4 w-4 mr-1.5" /> Solicitar Correção</Button>
          <Button variant="outline" onClick={() => setStatusOpen(true)}>Alterar Status</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <DetailCard title="Dados da Empresa" data={[
              ['Razão Social', r.legal_name], ['Nome Fantasia', r.trade_name], ['CNPJ', r.cnpj],
              ['Fundação', r.founded_at], ['Segmento', r.segment],
              ['Colaboradores', r.employees_count], ['Faturamento (R$)', r.monthly_revenue],
              ['Site', r.website], ['Instagram', r.instagram],
            ]} />
            <DetailCard title="Responsável" data={[
              ['Nome', r.contact_name], ['Cargo', r.contact_role], ['CPF', r.contact_cpf],
              ['Telefone', r.phone], ['WhatsApp', r.whatsapp], ['E-mail', r.email],
              ['Responsável Financeiro', r.financial_responsible],
            ]} />
            <DetailCard title="Endereço" data={[
              ['CEP', r.zip_code], ['Endereço', r.address], ['Número', r.address_number],
              ['Bairro', r.neighborhood], ['Estado', r.state], ['Cidade', r.city],
            ]} />

            {/* ====== Seção Contrato ====== */}
            <Card className="border-primary/30">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Contrato</h3>
                  </div>
                  {contract && (
                    <Badge variant={isSigned ? 'default' : 'outline'}>
                      {contractStatus === 'draft' && 'Minuta'}
                      {contractStatus === 'sent' && 'Aguardando assinatura'}
                      {contractStatus === 'signed' && 'Assinado'}
                    </Badge>
                  )}
                </div>

                {!contract && r.status !== 'aprovado' && (
                  <p className="text-sm text-muted-foreground">
                    Aprove a ficha cadastral para preparar o contrato.
                  </p>
                )}

                {canPrepareContract && (
                  <Button onClick={doPrepare}>
                    <FileText className="h-4 w-4 mr-1.5" /> Preparar Contrato
                  </Button>
                )}

                {contract && (
                  <div className="space-y-4">
                    {canEditContract && (
                      <div className="space-y-3 p-4 rounded-md border bg-muted/20">
                        <div className="text-sm font-semibold">Dados Comerciais</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <FieldX label="Nome do serviço/plano">
                            <Input value={commercial.service_name} onChange={(e) => setCommercial({ ...commercial, service_name: e.target.value })} placeholder="Ex: Modblue Start" />
                          </FieldX>
                          <FieldX label="Valor mensal (R$)">
                            <Input type="number" step="0.01" value={commercial.monthly_value} onChange={(e) => setCommercial({ ...commercial, monthly_value: e.target.value })} placeholder="3000.00" />
                          </FieldX>
                          <FieldX label="Data de início">
                            <Input type="date" value={commercial.start_date} onChange={(e) => setCommercial({ ...commercial, start_date: e.target.value })} />
                          </FieldX>
                          <FieldX label="Dia de vencimento">
                            <Input type="number" min="1" max="31" value={commercial.due_day} onChange={(e) => setCommercial({ ...commercial, due_day: e.target.value })} placeholder="6" />
                          </FieldX>
                          <FieldX label="Forma de pagamento">
                            <Input value={commercial.payment_method} onChange={(e) => setCommercial({ ...commercial, payment_method: e.target.value })} placeholder="Boleto ou PIX" />
                          </FieldX>
                          <FieldX label="Prazo inicial (dias)">
                            <Input type="number" value={commercial.term_days} onChange={(e) => setCommercial({ ...commercial, term_days: e.target.value })} placeholder="90" />
                          </FieldX>
                          <FieldX label="Observações comerciais" full>
                            <Textarea rows={2} value={commercial.notes} onChange={(e) => setCommercial({ ...commercial, notes: e.target.value })} />
                          </FieldX>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={doSaveCommercial}>Salvar dados comerciais</Button>
                          <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
                            <Eye className="h-4 w-4 mr-1.5" /> Prévia do Contrato
                          </Button>
                          <Button size="sm" onClick={async () => { await doSaveCommercial(); await doSendForSignature(); }}>
                            <Send className="h-4 w-4 mr-1.5" /> Enviar para Assinatura
                          </Button>
                        </div>
                      </div>
                    )}

                    {isAwaitingSignature && (
                      <div className="space-y-2 p-4 rounded-md border bg-amber-500/5">
                        <div className="text-sm">Aguardando o cliente assinar.</div>
                        <div className="text-xs text-muted-foreground">Enviado em {contract.sent_at ? new Date(contract.sent_at).toLocaleString('pt-BR') : '—'}</div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4 mr-1.5" /> Visualizar</Button>
                          <Button size="sm" variant="outline" onClick={doSendForSignature}>Gerar novo link</Button>
                        </div>
                      </div>
                    )}

                    {isSigned && (
                      <div className="space-y-2 p-4 rounded-md border border-primary/30 bg-primary/5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <FileSignature className="h-4 w-4" /> Contrato assinado
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Por <strong>{contract.signed_by_name}</strong> (CPF {contract.signed_by_cpf}) em{' '}
                          {contract.signed_at ? new Date(contract.signed_at).toLocaleString('pt-BR') : '—'}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
                            <Eye className="h-4 w-4 mr-1.5" /> Ver contrato assinado
                          </Button>
                          {canRelease && (
                            <Button size="sm" onClick={doRelease}>
                              <KeyRound className="h-4 w-4 mr-1.5" /> Liberar Acesso
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-sm">Observações Internas</h3>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Notas da equipe (não visíveis ao cliente)..." />
                <Button size="sm" onClick={saveNotes}>Salvar observações</Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3"><History className="h-4 w-4" /><h3 className="font-semibold text-sm">Histórico</h3></div>
              <ol className="space-y-3">
                {history.length === 0 && <p className="text-sm text-muted-foreground">Sem eventos.</p>}
                {history.map((h: any) => (
                  <li key={h.id} className="border-l-2 border-primary/40 pl-3">
                    <div className="text-sm font-medium">{h.description || h.event_type}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleString('pt-BR')}
                      {h.actor_name && ` • ${h.actor_name}`}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview do contrato */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between z-10">
            <DialogTitle>Prévia do Contrato {isSigned && '(Assinado)'}</DialogTitle>
            <Button size="sm" variant="outline" onClick={() => window.print()}>Imprimir / PDF</Button>
          </div>
          <div className="bg-neutral-100 p-4">
            <ContractTemplate
              contractor={(contract?.contractor_snapshot as any) || {}}
              commercial={canEditContract ? commercial : ((contract?.commercial_data as any) || {})}
              signature={isSigned ? {
                name: contract!.signed_by_name!,
                cpf: contract!.signed_by_cpf!,
                date: contract!.signed_at!,
                ip: contract!.signed_ip || undefined,
              } : null}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Reprovar */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reprovar cadastro</DialogTitle></DialogHeader>
          <Label>Motivo *</Label>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={doReject}>Confirmar reprovação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Correção */}
      <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Solicitar correção</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Campos para correção *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-[240px] overflow-y-auto p-2 border rounded">
                {Object.entries(FIELD_LABELS).map(([k, v]) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={correctionFields.includes(k)}
                      onCheckedChange={(c) => setCorrectionFields((prev) => c ? [...prev, k] : prev.filter((x) => x !== k))}
                    />
                    {v}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Observação *</Label>
              <Textarea value={correctionNote} onChange={(e) => setCorrectionNote(e.target.value)} rows={3} />
            </div>
            <p className="text-xs text-muted-foreground">Um novo link será gerado (válido por 48h) e copiado para sua área de transferência.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCorrectionOpen(false)}>Cancelar</Button>
            <Button onClick={doCorrection}>Enviar solicitação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Status */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alterar status</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Novo status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo *</Label>
              <Textarea value={statusReason} onChange={(e) => setStatusReason(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStatusOpen(false)}>Cancelar</Button>
            <Button onClick={doStatus}>Atualizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Acesso liberado */}
      <Dialog open={!!credentials} onOpenChange={(o) => !o && setCredentials(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Acesso liberado!</DialogTitle></DialogHeader>
          {credentials && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enviamos um e-mail para <strong className="text-foreground">{credentials.email}</strong> com
                o link seguro para criação de senha.
              </p>
              <div className="rounded-md border p-3 bg-muted/30 text-sm">
                <div><span className="text-muted-foreground">Login:</span> <span className="font-mono">{credentials.email}</span></div>
                <div className="text-xs text-muted-foreground pt-1">O link expira em 24h.</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredentials(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

function FieldX({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function DetailCard({ title, data }: { title: string; data: Array<[string, any]> }) {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-semibold text-sm mb-3">{title}</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
          {data.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="text-sm">{v || <span className="text-muted-foreground">—</span>}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
