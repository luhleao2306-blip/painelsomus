import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  IntelligentCentralItem,
  IntelligentCentralAudience,
  useData,
} from '@/contexts/DataContext';

interface IntelligentCentralFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  item?: IntelligentCentralItem | null;
}

const itemTypes = [
  'Agente GPT',
  'Lovable',
  'Dashboard',
  'Planilha',
  'Documento',
  'Ferramenta',
  'Site',
  'Outro',
];

const audienceOptions: { value: IntelligentCentralAudience; label: string; description: string }[] = [
  { value: 'all_clients', label: 'Todos os clientes', description: 'Todos os clientes verão no Portal do Cliente.' },
  { value: 'specific_clients', label: 'Selecionar clientes', description: 'Escolha quais clientes terão acesso.' },
];

export function IntelligentCentralForm({
  open,
  onOpenChange,
  onSubmit,
  item,
}: IntelligentCentralFormProps) {
  const { clients, refreshClients } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState('');

  useEffect(() => {
    if (open) {
      refreshClients?.();
    }
  }, [open, refreshClients]);

  const form = useForm({
    defaultValues: {
      name: '',
      type: 'Agente GPT',
      category: '',
      linkUrl: '',
      description: '',
      audience: 'all_clients' as IntelligentCentralAudience,
      status: 'active',
    },
  });

  const audience = form.watch('audience');

  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        type: item.type,
        category: item.category || '',
        linkUrl: item.linkUrl,
        description: item.description || '',
        audience: (item.audience === 'specific_clients' ? 'specific_clients' : 'all_clients') as IntelligentCentralAudience,
        status: item.status,
      });
      setSelectedClients(item.audienceUserIds ?? []);
    } else {
      form.reset({
        name: '',
        type: 'Agente GPT',
        category: '',
        linkUrl: '',
        description: '',
        audience: 'all_clients',
        status: 'active',
      });
      setSelectedClients([]);
    }
    setClientSearch('');
  }, [item, form, open]);

  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const handleSubmit = async (values: any) => {
    const normalized = normalizeUrl(values.linkUrl);
    try {
      const u = new URL(normalized);
      if (!['http:', 'https:'].includes(u.protocol)) {
        form.setError('linkUrl', { message: 'O link deve começar com http:// ou https://' });
        return;
      }
    } catch {
      form.setError('linkUrl', { message: 'Informe um link válido (ex: https://exemplo.com)' });
      return;
    }

    if (values.audience === 'specific_clients' && selectedClients.length === 0) {
      form.setError('audience' as any, { message: 'Selecione ao menos um cliente.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = {
        ...values,
        linkUrl: normalized,
        audienceUserIds: values.audience === 'specific_clients' ? selectedClients : [],
        visibility: 'all',
        releasedToClient:
          values.audience === 'all_clients' || values.audience === 'specific_clients',
      };
      await onSubmit(submitData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o acesso.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleClient = (id: string, e?: React.MouseEvent | React.ChangeEvent) => {
    if (e) {
      if ('preventDefault' in e) e.preventDefault();
      if ('stopPropagation' in e) e.stopPropagation();
    }
    form.clearErrors('audience');
    setSelectedClients((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const filteredClients = useMemo(() => {
    const q = clientSearch.toLowerCase().trim();
    const normalizedClients = clients
      .filter((client) => Boolean(client?.id))
      .map((client) => ({
        ...client,
        name: client.name?.trim() || client.email?.trim() || 'Cliente sem nome',
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    if (!q) return normalizedClients;

    return normalizedClients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.responsible_name?.toLowerCase().includes(q),
    );
  }, [clients, clientSearch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar Acesso' : 'Novo Acesso'}</DialogTitle>
          <DialogDescription>
            Preencha as informações abaixo para {item ? 'atualizar' : 'cadastrar'} um item na
            Central Inteligente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do acesso" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {itemTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Operacional, Marketing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="linkUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link/URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Breve descrição do recurso"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="audience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quem pode visualizar</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {audienceOptions.map((opt) => {
                        const isActive = field.value === opt.value;

                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              field.onChange(opt.value);
                              form.clearErrors('audience');
                            }}
                            className={`rounded-lg border p-3 text-left transition-colors ${
                              isActive
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:bg-muted/40'
                            }`}
                            aria-pressed={isActive}
                          >
                            <div className="text-sm font-medium">{opt.label}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{opt.description}</div>
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormDescription>
                    {audienceOptions.find((o) => o.value === field.value)?.description}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {audience === 'specific_clients' && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    Clientes selecionados:{' '}
                    <span className="font-normal text-muted-foreground">
                      {selectedClients.length}
                    </span>
                  </div>
                </div>

                {selectedClients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedClients.map((id) => {
                      const c = filteredClients.find((cl) => cl.id === id) ?? clients.find((cl) => cl.id === id);
                      if (!c) return null;
                      const clientLabel = c.name?.trim() || c.email?.trim() || 'Cliente sem nome';
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="gap-1 pl-2 pr-1 py-1"
                        >
                          {clientLabel}
                          <button
                            type="button"
                            onClick={(e) => toggleClient(id, e)}
                            className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                            aria-label={`Remover ${clientLabel}`}
                          >
                            <span className="text-xs">×</span>
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {filteredClients.length === 0 && clients.length > 0 ? (
                  <p className="text-sm text-muted-foreground p-3 text-center border rounded">
                    Nenhum cliente encontrado com esse filtro.
                  </p>
                ) : null}

                {clients.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 text-center border rounded">
                    Nenhum cliente cadastrado no sistema.
                  </p>
                ) : (
                  <>
                     <Input
                       placeholder="Buscar cliente..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="h-9"
                    />
                    <ScrollArea className="h-48 rounded border">
                      <div className="p-2 space-y-1">
                        {filteredClients.length === 0 && clientSearch.trim().length > 0 && (
                          <p className="text-xs text-muted-foreground p-2">
                            Nenhum cliente encontrado para "{clientSearch}".
                          </p>
                        )}
                        {filteredClients.map((c) => {
                          const isChecked = selectedClients.includes(c.id);

                          return (
                            <div
                              key={c.id}
                              onClick={(e) => toggleClient(c.id, e)}
                              className="flex w-full cursor-pointer items-center gap-3 rounded p-2 text-left hover:bg-muted/50"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => toggleClient(c.id, e)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 shrink-0 accent-primary"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium">{c.name}</div>
                                {(c.email || c.responsible_name) && (
                                  <div className="truncate text-xs text-muted-foreground">
                                    {c.email || c.responsible_name}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
