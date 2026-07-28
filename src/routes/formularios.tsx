import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Copy, FileDown, Link2, Plus, Trash2, Eye, Search } from 'lucide-react';
import {
  useClientFormRequests,
  useCreateFormRequest,
  useDeleteFormRequest,
  useLinkFormToClient,
  formPublicUrl,
  exportVisaoPDF,
  type ClientFormRequest,
} from '@/lib/client-forms';
import { FORM_TEMPLATES, VISAO_SECTIONS, HORIZONS } from '@/lib/visao-form';

export const Route = createFileRoute('/formularios')({
  component: FormulariosPage,
  head: () => ({
    meta: [
      { title: 'Formulários de Clientes | Somus Group' },
      {
        name: 'description',
        content:
          'Envie formulários estratégicos para os clientes da Somus, acompanhe o preenchimento em tempo real e exporte as respostas em PDF.',
      },
      { property: 'og:title', content: 'Formulários de Clientes | Somus Group' },
      {
        property: 'og:description',
        content: 'Gestão dos formulários enviados aos clientes: pendentes, respondidos e exportação em PDF.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
});

function useClients() {
  return useQuery({
    queryKey: ['clients-lite'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id,name,email').order('name');
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; email: string | null }[];
    },
  });
}

function FormulariosPage() {
  const { data: requests = [], isLoading } = useClientFormRequests();
  const { data: clients = [] } = useClients();
  const create = useCreateFormRequest();
  const remove = useDeleteFormRequest();
  const link = useLinkFormToClient();

  const [openNew, setOpenNew] = useState(false);
  const [tab, setTab] = useState<'all' | 'pending' | 'submitted'>('all');
  const [q, setQ] = useState('');
  const [viewing, setViewing] = useState<ClientFormRequest | null>(null);

  const [templateKey, setTemplateKey] = useState<string>(FORM_TEMPLATES[0].key);
  const [clientId, setClientId] = useState<string>('none');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const clientName = (r: ClientFormRequest) =>
    clients.find(c => c.id === r.client_id)?.name || r.client_name || 'Não identificado';

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return requests.filter(r => {
      if (tab !== 'all' && r.status !== tab) return false;
      if (!term) return true;
      return (
        clientName(r).toLowerCase().includes(term) ||
        (r.contact_name ?? '').toLowerCase().includes(term) ||
        (r.contact_email ?? '').toLowerCase().includes(term)
      );
    });
  }, [requests, tab, q, clients]);

  const counts = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      submitted: requests.filter(r => r.status === 'submitted').length,
    }),
    [requests],
  );

  const handleCreate = async () => {
    const tpl = FORM_TEMPLATES.find(t => t.key === templateKey)!;
    const c = clients.find(x => x.id === clientId);
    const created = await create.mutateAsync({
      template_key: tpl.key,
      template_name: tpl.name,
      client_id: c?.id ?? null,
      client_name: c?.name ?? null,
      contact_name: contactName || null,
      contact_email: contactEmail || c?.email || null,
    });
    await navigator.clipboard.writeText(formPublicUrl(created.token)).catch(() => {});
    toast.success('Link gerado e copiado para a área de transferência.');
    setOpenNew(false);
    setClientId('none');
    setContactName('');
    setContactEmail('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Relacionamento
          </p>
          <h1 className="mt-1 font-display text-3xl">Formulários de Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gere o link, envie ao cliente e acompanhe as respostas direto no painel.
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Novo envio
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {FORM_TEMPLATES.map(t => (
          <Card key={t.key} className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Modelo</p>
            <p className="mt-1 font-display text-lg">{t.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'pending', 'submitted'] as const).map(k => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === k ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'
            }`}
          >
            {k === 'all' ? 'Todos' : k === 'pending' ? 'Pendentes' : 'Respondidos'} ({counts[k]})
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar cliente ou contato..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
      </div>

      <Card className="divide-y">
        {isLoading && <p className="p-6 text-sm text-muted-foreground">Carregando…</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhum formulário aqui ainda. Clique em “Novo envio” para gerar o primeiro link.
          </p>
        )}
        {filtered.map(r => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{clientName(r)}</p>
                {r.status === 'submitted' ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">
                    Respondido
                  </Badge>
                ) : (
                  <Badge variant="secondary">Pendente · {r.progress}%</Badge>
                )}
                {!r.client_id && <Badge variant="outline">Sem cliente vinculado</Badge>}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {r.template_name} · {r.contact_name || 'sem contato'}{' '}
                {r.contact_email ? `· ${r.contact_email}` : ''} ·{' '}
                {r.submitted_at
                  ? `enviado em ${new Date(r.submitted_at).toLocaleDateString('pt-BR')}`
                  : `criado em ${new Date(r.created_at).toLocaleDateString('pt-BR')}`}
              </p>
            </div>

            {!r.client_id && (
              <Select
                onValueChange={v => link.mutate({ id: r.id, client_id: v })}
                value={r.client_id ?? undefined}
              >
                <SelectTrigger className="h-8 w-48 text-xs">
                  <SelectValue placeholder="Vincular cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(formPublicUrl(r.token));
                  toast.success('Link copiado');
                }}
                title="Copiar link"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" asChild title="Abrir formulário">
                <a href={formPublicUrl(r.token)} target="_blank" rel="noreferrer">
                  <Link2 className="h-4 w-4" />
                </a>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setViewing(r)} title="Ver respostas">
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => exportVisaoPDF(r)}
                title="Exportar PDF"
                disabled={r.status !== 'submitted'}
              >
                <FileDown className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove.mutate(r.id)}
                title="Excluir"
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </Card>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo envio de formulário</DialogTitle>
            <DialogDescription>
              O link é curto e público. Se o cliente for vinculado, o formulário aparece também no Portal do
              Cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium">Modelo</label>
              <Select value={templateKey} onValueChange={setTemplateKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORM_TEMPLATES.map(t => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Cliente (opcional)</label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem vínculo (identificar no preenchimento)</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium">Contato</label>
                <Input value={contactName} onChange={e => setContactName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">E-mail</label>
                <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={create.isPending}>
              {create.isPending ? 'Gerando…' : 'Gerar link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={o => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewing ? clientName(viewing) : ''}</DialogTitle>
            <DialogDescription>{viewing?.template_name}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-6">
              {viewing &&
                VISAO_SECTIONS.map(s => (
                  <div key={s.id}>
                    <p className="font-display text-base">
                      {s.number} · {s.title}
                    </p>
                    <div className="mt-2 space-y-2">
                      {s.fields?.map(f => (
                        <Field
                          key={f.id}
                          label={f.label}
                          value={viewing.answers?.[`${s.id}.${f.id}`]}
                        />
                      ))}
                      {s.horizons &&
                        HORIZONS.map(h => (
                          <Field key={h.key} label={h.label} value={viewing.answers?.[`${s.id}.${h.key}`]} />
                        ))}
                      {s.results &&
                        HORIZONS.map(h => (
                          <Field
                            key={h.key}
                            label={h.label}
                            value={[1, 2, 3]
                              .map(i => viewing.answers?.[`${s.id}.${h.key}.${i}`])
                              .filter(Boolean)
                              .map((v, i) => `${i + 1}. ${v}`)
                              .join('\n')}
                          />
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            {viewing?.status === 'submitted' && (
              <Button onClick={() => exportVisaoPDF(viewing)}>
                <FileDown className="mr-1.5 h-4 w-4" /> Exportar PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
