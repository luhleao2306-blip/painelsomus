import { createFileRoute } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileDown,
  Eye,
  Search,
  Link2,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Inbox,
  Users,
  CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  usePublicSubmissions,
  useDeletePublicSubmission,
  submissionFields,
  submissionRespondent,
  exportSubmissionPDF,
  useClientFormRequests,
  useCreateFormRequest,
  useDeleteFormRequest,
  formPublicUrl,
  exportVisaoPDF,
  type PublicSubmission,
  type ClientFormRequest,
} from '@/lib/client-forms';

export const Route = createFileRoute('/formularios')({
  component: FormulariosPage,
  head: () => ({
    meta: [
      { title: 'Visão de Clientes | Somus Group' },
      {
        name: 'description',
        content:
          'Gere links de formulário e acompanhe as respostas dos clientes direto no painel Somus.',
      },
      { property: 'og:title', content: 'Visão de Clientes | Somus Group' },
      {
        property: 'og:description',
        content: 'Gestão dos formulários de clientes: geração de links, respostas e exportação em PDF.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
});

function useClientOptions() {
  return useQuery({
    queryKey: ['clients-options'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name').order('name');
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });
}

export function VisaoClientesPanel({ embedded = false }: { embedded?: boolean }) {
  const [q, setQ] = useState('');
  const { data: submissions = [], isLoading: loadingSubs } = usePublicSubmissions();
  const { data: requests = [], isLoading: loadingReqs } = useClientFormRequests();
  const [viewingSub, setViewingSub] = useState<PublicSubmission | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [deletingSub, setDeletingSub] = useState<PublicSubmission | null>(null);
  const delSub = useDeletePublicSubmission();

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return submissions;
    return submissions.filter(s => {
      const hay = [
        submissionRespondent(s),
        s.form_name ?? '',
        s.client_name ?? '',
        s.contact_email ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }, [submissions, q]);

  const stats = useMemo(() => {
    const now = Date.now();
    const week = submissions.filter(
      s => now - new Date(s.submitted_at).getTime() < 7 * 864e5,
    ).length;
    return {
      total: submissions.length,
      linked: submissions.filter(s => s.client_id).length,
      week,
      pendingLinks: requests.filter(r => r.status !== 'submitted').length,
    };
  }, [submissions, requests]);

  return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {!embedded && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Relacionamento
                </p>
                <h1 className="mt-1 font-display text-3xl">Visão de Clientes</h1>
              </>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              Gere links de formulário e acompanhe tudo o que os clientes responderam.
            </p>
          </div>
          <Button onClick={() => setGenOpen(true)}>
            <Link2 className="mr-1.5 h-4 w-4" /> Gerar link de formulário
          </Button>
        </div>


        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Inbox} label="Respostas recebidas" value={stats.total} />
          <StatCard icon={Users} label="Vinculadas a clientes" value={stats.linked} />
          <StatCard icon={CalendarClock} label="Nos últimos 7 dias" value={stats.week} />
          <StatCard icon={Link2} label="Links aguardando" value={stats.pendingLinks} />
        </div>

        <Tabs defaultValue="respostas">
          <TabsList>
            <TabsTrigger value="respostas">Respostas ({submissions.length})</TabsTrigger>
            <TabsTrigger value="links">Links gerados ({requests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="respostas" className="mt-4 space-y-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por cliente, formulário ou e-mail..."
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </div>

            <Card className="divide-y overflow-hidden">
              {loadingSubs && <p className="p-6 text-sm text-muted-foreground">Carregando…</p>}
              {!loadingSubs && filtered.length === 0 && (
                <div className="p-12 text-center">
                  <Inbox className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-medium">
                    {submissions.length === 0
                      ? 'Nenhuma resposta recebida ainda.'
                      : 'Nada encontrado para essa busca.'}
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                    Gere um link acima e envie ao cliente — assim que ele preencher, a resposta cai
                    aqui automaticamente.
                  </p>
                </div>
              )}

              {filtered.map(s => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground">
                    {submissionRespondent(s).slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{submissionRespondent(s)}</p>
                      {s.client_id ? (
                        <Badge className="bg-blue-500/15 text-blue-600 hover:bg-blue-500/15">
                          Cliente vinculado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Sem cliente
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {s.client_name ? `${s.client_name} · ` : ''}
                      {s.form_name ?? 'Formulário'} ·{' '}
                      {new Date(s.submitted_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setViewingSub(s)} title="Ver respostas">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => exportSubmissionPDF(s)}
                      title="Exportar PDF"
                    >
                      <FileDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingSub(s)}
                      title="Excluir resposta"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="links" className="mt-4">
            <Card className="divide-y overflow-hidden">
              {loadingReqs && <p className="p-6 text-sm text-muted-foreground">Carregando…</p>}
              {!loadingReqs && requests.length === 0 && (
                <div className="p-12 text-center">
                  <Link2 className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-medium">Nenhum link gerado ainda.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Clique em “Gerar link de formulário” para criar o primeiro.
                  </p>
                </div>
              )}
              {requests.map(r => (
                <RequestRow key={r.id} req={r} />
              ))}
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!viewingSub} onOpenChange={o => !o && setViewingSub(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewingSub ? submissionRespondent(viewingSub) : ''}</DialogTitle>
              <DialogDescription>
                {viewingSub?.form_name ?? 'Formulário'}
                {viewingSub ? ` · ${new Date(viewingSub.submitted_at).toLocaleString('pt-BR')}` : ''}
              </DialogDescription>
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
                <>
                  <Button
                    variant="outline"
                    className="text-destructive"
                    onClick={() => {
                      setDeletingSub(viewingSub);
                      setViewingSub(null);
                    }}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" /> Excluir
                  </Button>
                  <Button onClick={() => exportSubmissionPDF(viewingSub)}>
                    <FileDown className="mr-1.5 h-4 w-4" /> Exportar PDF
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deletingSub} onOpenChange={o => !o && setDeletingSub(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Excluir resposta</DialogTitle>
              <DialogDescription>
                {deletingSub
                  ? `A resposta de ${submissionRespondent(deletingSub)} será removida permanentemente.`
                  : ''}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingSub(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={delSub.isPending}
                onClick={() => {
                  if (!deletingSub) return;
                  delSub.mutate(deletingSub.id, { onSuccess: () => setDeletingSub(null) });
                }}
              >
                {delSub.isPending ? 'Excluindo…' : 'Excluir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <GenerateLinkDialog open={genOpen} onOpenChange={setGenOpen} />
      </div>
  );
}

function FormulariosPage() {
  return (
    <MainLayout>
      <VisaoClientesPanel />
    </MainLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: number;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-2xl font-semibold leading-none">{value}</p>
        <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

function RequestRow({ req }: { req: ClientFormRequest }) {
  const del = useDeleteFormRequest();
  const url = typeof window !== 'undefined' ? formPublicUrl(req.token) : '';
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copiado');
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-muted/40">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{req.client_name || req.contact_name || 'Sem cliente'}</p>
          {req.status === 'submitted' ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">
              Respondido
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Aguardando · {req.progress ?? 0}%
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{url}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={copy} title="Copiar link">
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="ghost" asChild title="Abrir formulário">
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
        {req.status === 'submitted' && (
          <Button size="sm" variant="ghost" onClick={() => exportVisaoPDF(req)} title="Exportar PDF">
            <FileDown className="h-4 w-4" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => del.mutate(req.id)}
          title="Excluir link"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function GenerateLinkDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: clients = [] } = useClientOptions();
  const create = useCreateFormRequest();
  const [clientId, setClientId] = useState<string>('none');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [link, setLink] = useState<string | null>(null);

  const reset = () => {
    setClientId('none');
    setContactName('');
    setContactEmail('');
    setLink(null);
  };

  const submit = async () => {
    const client = clients.find(c => c.id === clientId);
    const req = await create.mutateAsync({
      template_key: 'visao-futuro',
      template_name: 'Visão de Futuro',
      client_id: client?.id ?? null,
      client_name: client?.name ?? null,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
    });
    const url = formPublicUrl(req.token);
    setLink(url);
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success('Link gerado e copiado');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={o => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar link de formulário</DialogTitle>
          <DialogDescription>
            Crie um link do formulário “Visão de Futuro” para enviar ao cliente. As respostas caem
            direto nesta tela.
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="break-all font-mono text-xs">{link}</p>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(link);
                  toast.success('Link copiado');
                }}
              >
                <Copy className="mr-1.5 h-4 w-4" /> Copiar link
              </Button>
              <Button variant="outline" asChild>
                <a href={link} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem cliente vinculado</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contato (opcional)</Label>
              <Input
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                placeholder="Nome de quem vai preencher"
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail (opcional)</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="contato@empresa.com"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {link ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          ) : (
            <Button onClick={submit} disabled={create.isPending}>
              <Link2 className="mr-1.5 h-4 w-4" />
              {create.isPending ? 'Gerando…' : 'Gerar link'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value?: any }) {
  return (
    <div className="rounded-md border border-border/60 p-3">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{String(value ?? '').trim() || '—'}</p>
    </div>
  );
}
