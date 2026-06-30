import { createFileRoute } from '@tanstack/react-router';
import { InlineText } from '@/components/shared/InlineEdit';
import { useEffect, useMemo, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Download, Upload, Search, Calendar as CalendarIcon, MoreHorizontal,
  Eye, Pencil, Trash2, Filter, List, LayoutGrid, Mail, Phone, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

export const Route = createFileRoute('/comercial/prospeccoes')({
  component: Prospeccoes,
});

type ViewMode = 'list' | 'kanban';
const VIEW_STORAGE_KEY = 'comercial:prospeccoes:view';
const LEGACY_VIEW_STORAGE_KEY = 'comercial:view';

function readSavedView(): ViewMode {
  if (typeof window === 'undefined') return 'list';
  try {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY)
      ?? window.localStorage.getItem(LEGACY_VIEW_STORAGE_KEY);
    return saved === 'kanban' ? 'kanban' : 'list';
  } catch {
    return 'list';
  }
}

function saveView(next: ViewMode) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    window.localStorage.setItem(LEGACY_VIEW_STORAGE_KEY, next);
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}

import {
  type Lead, type Stage, type Tier, type Status,
  stages, tiers, owners, sourceOptions,
  useLeads, addLead, updateLead, removeLead,
} from '@/lib/comercial-store';


// ---------------- Estilo dos badges ----------------
const stageStyles: Record<Stage, string> = {
  'Lead': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30',
  'Em contato': 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30',
  'Follow up': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30',
  'Reunião agendada': 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30',
  'Em negociação': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  'Ganho': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  'Perdido': 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
  'Dados incompletos': 'bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-300 dark:border-zinc-500/30',
};

const tierStyles: Record<Tier, string> = {
  A: 'bg-primary text-primary-foreground',
  B: 'bg-sky-500 text-white',
  C: 'bg-slate-400 text-white',
};

const statusStyles: Record<Status, string> = {
  'Ativo': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Pausado': 'bg-amber-50 text-amber-700 border-amber-200',
  'Arquivado': 'bg-slate-100 text-slate-600 border-slate-200',
};

// ---------------- Schema do formulário ----------------
const phoneRegex = /^[\d\s().+-]{8,}$/;
const leadSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome'),
  email: z.string().trim().email('E-mail inválido'),
  phone: z.string().trim().regex(phoneRegex, 'Telefone inválido'),
  office: z.string().trim().min(2, 'Informe o escritório'),
  stage: z.enum(stages as [Stage, ...Stage[]]),
  tier: z.enum(['A', 'B', 'C']),
  owner: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  instagram: z.string().trim().optional(),
  website: z.string().trim().optional(),
  source: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  nextFollowUp: z.string().optional(),
});
type LeadFormValues = z.infer<typeof leadSchema>;

// ---------------- Página ----------------
function Prospeccoes() {
  const leads = useLeads();
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<string>('all');
  const [tier, setTier] = useState<string>('all');
  const [owner, setOwner] = useState<string>('all');
  const [source, setSource] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [followUpRange, setFollowUpRange] = useState<DateRange | undefined>();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>();
  const [view, setView] = useState<ViewMode>('list');
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);

  useEffect(() => {
    setView(readSavedView());
  }, []);

  const handleViewChange = (value: string) => {
    const next: ViewMode = value === 'kanban' ? 'kanban' : 'list';
    setView(next);
    saveView(next);
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDropOnStage = (e: DragEvent<HTMLDivElement>, target: Stage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    setDragOverStage(null);
    if (!id) return;
    const current = leads.find((l) => l.id === id);
    if (!current || current.stage === target) return;
    updateLead(id, { stage: target });
    toast.success(`Lead movido para "${target}"`);
  };

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { stage: 'Lead', tier: 'C' },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (term) {
        const hit =
          l.name.toLowerCase().includes(term) ||
          l.email.toLowerCase().includes(term) ||
          l.phone.toLowerCase().includes(term) ||
          l.office.toLowerCase().includes(term);
        if (!hit) return false;
      }
      if (stage !== 'all' && l.stage !== stage) return false;
      if (tier !== 'all' && l.tier !== tier) return false;
      if (owner !== 'all' && l.owner !== owner) return false;
      if (source !== 'all' && (l.source ?? '') !== source) return false;
      if (dateRange?.from) {
        const created = new Date(l.createdAt);
        if (created < dateRange.from) return false;
        if (dateRange.to && created > dateRange.to) return false;
      }
      if (followUpRange?.from) {
        if (!l.nextFollowUp) return false;
        const fu = new Date(l.nextFollowUp);
        if (fu < followUpRange.from) return false;
        if (followUpRange.to && fu > followUpRange.to) return false;
      }
      return true;
    });
  }, [leads, search, stage, tier, owner, source, dateRange, followUpRange]);

  const clearFilters = () => {
    setSearch(''); setStage('all'); setTier('all'); setOwner('all');
    setSource('all'); setDateRange(undefined); setFollowUpRange(undefined);
  };
  const hasFilters = !!search || stage !== 'all' || tier !== 'all' || owner !== 'all'
    || source !== 'all' || !!dateRange || !!followUpRange;

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.error('Nenhum lead para exportar com os filtros atuais.');
      return;
    }
    const headers = [
      'Nome', 'E-mail', 'Telefone', 'Escritório', 'Cidade', 'Estado',
      'Instagram', 'Site', 'Origem', 'Responsável', 'Etapa', 'Nível',
      'Data de cadastro', 'Próximo follow up', 'Observações',
    ];
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filtered.map((l) => [
      l.name, l.email, l.phone, l.office, l.city ?? '', l.state ?? '',
      l.instagram ?? '', l.website ?? '', l.source ?? '', l.owner,
      l.stage, l.tier,
      l.createdAt ? format(new Date(l.createdAt), 'dd/MM/yyyy', { locale: ptBR }) : '',
      l.nextFollowUp ? format(new Date(l.nextFollowUp), 'dd/MM/yyyy', { locale: ptBR }) : '',
      l.notes ?? '',
    ].map(escape).join(';'));
    // BOM para Excel reconhecer UTF-8 e separador ; (pt-BR friendly)
    const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prospeccoes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} lead(s) exportado(s)`);
  };

  const importCsv = async (file: File) => {
    try {
      const raw = (await file.text()).replace(/^\uFEFF/, '');
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) { toast.error('Planilha vazia ou sem dados.'); return; }
      const delim = lines[0].includes(';') ? ';' : ',';
      const parseLine = (line: string) => {
        const out: string[] = []; let cur = ''; let inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQ) {
            if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
            else if (ch === '"') inQ = false;
            else cur += ch;
          } else {
            if (ch === '"') inQ = true;
            else if (ch === delim) { out.push(cur); cur = ''; }
            else cur += ch;
          }
        }
        out.push(cur);
        return out.map((s) => s.trim());
      };
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const headers = parseLine(lines[0]).map(norm);
      const idx = (names: string[]) => headers.findIndex((h) => names.includes(h));
      const ix = {
        name: idx(['nome', 'name', 'lead']),
        email: idx(['e-mail', 'email']),
        phone: idx(['telefone', 'phone', 'celular', 'whatsapp']),
        office: idx(['escritorio', 'office', 'empresa']),
        city: idx(['cidade', 'city']),
        state: idx(['estado', 'state', 'uf']),
        instagram: idx(['instagram']),
        website: idx(['site', 'website']),
        source: idx(['origem', 'source']),
        owner: idx(['responsavel', 'owner']),
        stage: idx(['etapa', 'stage']),
        tier: idx(['nivel', 'tier']),
        notes: idx(['observacoes', 'notes', 'obs']),
      };
      if (ix.name < 0 || ix.email < 0) { toast.error('Cabeçalho deve conter ao menos "Nome" e "E-mail".'); return; }
      const get = (cols: string[], i: number) => (i >= 0 ? (cols[i] ?? '') : '');
      let ok = 0, fail = 0;
      for (let li = 1; li < lines.length; li++) {
        const cols = parseLine(lines[li]);
        const name = get(cols, ix.name); const email = get(cols, ix.email);
        if (!name || !email) { fail++; continue; }
        const stageVal = get(cols, ix.stage); const tierVal = get(cols, ix.tier).toUpperCase();
        const ownerVal = get(cols, ix.owner);
        const newLead: Lead = {
          id: crypto.randomUUID(),
          name, email,
          phone: get(cols, ix.phone) || '',
          office: get(cols, ix.office) || '—',
          stage: (stages as readonly string[]).includes(stageVal) ? (stageVal as Stage) : 'Lead',
          tier: (tiers as readonly string[]).includes(tierVal) ? (tierVal as Tier) : 'C',
          owner: ownerVal || owners[0],
          createdAt: new Date().toISOString(),
          nextFollowUp: null,
          status: 'Ativo',
          city: get(cols, ix.city) || undefined,
          state: get(cols, ix.state) || undefined,
          instagram: get(cols, ix.instagram) || undefined,
          website: get(cols, ix.website) || undefined,
          source: get(cols, ix.source) || undefined,
          notes: get(cols, ix.notes) || undefined,
        };
        const res = await addLead(newLead);
        if (res) ok++; else fail++;
      }
      if (ok > 0) toast.success(`${ok} lead(s) importado(s)${fail ? `, ${fail} ignorado(s)` : ''}`);
      else toast.error('Nenhum lead importado. Verifique o cabeçalho e os dados.');
    } catch (e: any) {
      toast.error('Falha ao importar planilha', { description: e?.message });
    }
  };


  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      form.reset({ stage: 'Lead', tier: 'C' });
      setFollowUpDate(undefined);
      setEditingId(null);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    form.reset({ stage: 'Lead', tier: 'C' });
    setFollowUpDate(undefined);
    setOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingId(lead.id);
    form.reset({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      office: lead.office,
      stage: lead.stage,
      tier: lead.tier,
      owner: lead.owner === '—' ? '' : lead.owner,
      city: lead.city ?? '',
      state: lead.state ?? '',
      instagram: lead.instagram ?? '',
      website: lead.website ?? '',
      source: lead.source ?? '',
      notes: lead.notes ?? '',
    });
    setFollowUpDate(lead.nextFollowUp ? new Date(lead.nextFollowUp) : undefined);
    setOpen(true);
  };

  const onSubmit = (values: LeadFormValues) => {
    if (editingId) {
      updateLead(editingId, {
        name: values.name,
        email: values.email,
        phone: values.phone,
        office: values.office,
        stage: values.stage,
        tier: values.tier,
        owner: values.owner || '—',
        nextFollowUp: followUpDate ? followUpDate.toISOString().slice(0, 10) : null,
        city: values.city, state: values.state, instagram: values.instagram,
        website: values.website, source: values.source, notes: values.notes,
      });
      toast.success('Lead atualizado com sucesso');
    } else {
      const newLead: Lead = {
        id: crypto.randomUUID(),
        name: values.name,
        email: values.email,
        phone: values.phone,
        office: values.office,
        stage: values.stage ?? 'Lead',
        tier: values.tier ?? 'C',
        owner: values.owner || '—',
        createdAt: new Date().toISOString().slice(0, 10),
        nextFollowUp: followUpDate ? followUpDate.toISOString().slice(0, 10) : null,
        status: 'Ativo',
        city: values.city, state: values.state, instagram: values.instagram,
        website: values.website, source: values.source, notes: values.notes,
      };
      addLead(newLead);
      toast.success('Prospecção adicionada com sucesso');
    }
    handleOpenChange(false);
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Prospecções</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} de {leads.length} leads
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={handleViewChange}>
            <TabsList>
              <TabsTrigger value="list" className="gap-1.5"><List className="h-3.5 w-3.5" />Lista</TabsTrigger>
              <TabsTrigger value="kanban" className="gap-1.5"><LayoutGrid className="h-3.5 w-3.5" />Kanban</TabsTrigger>
            </TabsList>
          </Tabs>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            id="import-leads-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importCsv(f);
              e.target.value = '';
            }}
          />
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => document.getElementById('import-leads-input')?.click()}
          >
            <Upload className="h-4 w-4" />
            Importar Leads
          </Button>
          <Button variant="outline" className="gap-2" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Exportar Leads
          </Button>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Adicionar Prospecção
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="border-border/70">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail, telefone ou escritório"
              className="pl-9"
            />
          </div>

          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="Etapa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as etapas</SelectItem>
              {stages.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className="w-full lg:w-[140px]"><SelectValue placeholder="Nível" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis</SelectItem>
              {tiers.map((t) => (<SelectItem key={t} value={t}>Nível {t}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="w-full lg:w-[200px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {owners.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              {sourceOptions.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('w-full justify-start gap-2 font-normal lg:w-[230px]', !dateRange && 'text-muted-foreground')}
              >
                <CalendarIcon className="h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>{format(dateRange.from, 'dd/MM/yy', { locale: ptBR })} – {format(dateRange.to, 'dd/MM/yy', { locale: ptBR })}</>
                  ) : format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
                ) : 'Período de cadastro'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} initialFocus className="pointer-events-auto p-3" locale={ptBR} />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('w-full justify-start gap-2 font-normal lg:w-[230px]', !followUpRange && 'text-muted-foreground')}
              >
                <CalendarIcon className="h-4 w-4" />
                {followUpRange?.from ? (
                  followUpRange.to ? (
                    <>{format(followUpRange.from, 'dd/MM/yy', { locale: ptBR })} – {format(followUpRange.to, 'dd/MM/yy', { locale: ptBR })}</>
                  ) : format(followUpRange.from, 'dd/MM/yyyy', { locale: ptBR })
                ) : 'Próximo follow up'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" selected={followUpRange} onSelect={setFollowUpRange} numberOfMonths={2} initialFocus className="pointer-events-auto p-3" locale={ptBR} />
            </PopoverContent>
          </Popover>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
              <Filter className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </CardContent>
      </Card>

      {view === 'list' ? (
        <Card className="border-border/70">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead>Lead</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Escritório</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead className="text-center">Nível</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Próx. follow up</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-32 text-center text-sm text-muted-foreground">
                        Nenhum lead encontrado com os filtros atuais.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((l) => (
                      <TableRow key={l.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          <InlineText
                            value={l.name}
                            onSave={(v: string) => updateLead(l.id, { name: v })}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <InlineText
                            value={l.email}
                            onSave={(v: string) => updateLead(l.id, { email: v })}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <InlineText
                            value={l.phone}
                            onSave={(v: string) => updateLead(l.id, { phone: v })}
                          />
                        </TableCell>
                        <TableCell>
                          <InlineText
                            value={l.office}
                            onSave={(v: string) => updateLead(l.id, { office: v })}
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            value={l.stage}
                            onChange={(e) => updateLead(l.id, { stage: e.target.value as Stage })}
                            className={cn(
                              'h-7 rounded-md border bg-transparent px-2 text-xs font-medium outline-none',
                              stageStyles[l.stage],
                            )}
                          >
                            {stages.map((s) => (<option key={s} value={s}>{s}</option>))}
                          </select>
                        </TableCell>
                        <TableCell className="text-center">
                          <select
                            value={l.tier}
                            onChange={(e) => updateLead(l.id, { tier: e.target.value as Tier })}
                            className={cn(
                              'h-7 w-12 rounded-full border bg-transparent text-center text-xs font-bold outline-none',
                              tierStyles[l.tier],
                            )}
                          >
                            {tiers.map((t) => (<option key={t} value={t}>{t}</option>))}
                          </select>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <select
                            value={l.owner}
                            onChange={(e) => updateLead(l.id, { owner: e.target.value })}
                            className="h-7 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none hover:border-input focus:border-input"
                          >
                            {owners.map((o) => (<option key={o} value={o}>{o}</option>))}
                          </select>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(l.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                        <TableCell className="text-muted-foreground">
                          <input
                            type="date"
                            value={l.nextFollowUp ? l.nextFollowUp.slice(0, 10) : ''}
                            onChange={(e) => updateLead(l.id, { nextFollowUp: e.target.value || null })}
                            className="h-7 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none hover:border-input focus:border-input"
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            value={l.status}
                            onChange={(e) => updateLead(l.id, { status: e.target.value as Status })}
                            className={cn(
                              'h-7 rounded-md border bg-transparent px-2 text-xs font-medium outline-none',
                              statusStyles[l.status],
                            )}
                          >
                            {(['Ativo','Pausado','Arquivado'] as Status[]).map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(l)}><Eye className="mr-2 h-4 w-4" />Mais detalhes</DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-600"
                                onClick={() => {
                                  removeLead(l.id);
                                  toast.success('Lead removido');
                                }}
                              ><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            {stages.map((s) => {
              const items = filtered.filter((l) => l.stage === s);
              const isOver = dragOverStage === s;
              return (
                <div
                  key={s}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverStage(s); }}
                  onDragLeave={() => setDragOverStage((curr) => curr === s ? null : curr)}
                  onDrop={(e) => handleDropOnStage(e, s)}
                  className={cn(
                    'flex w-72 shrink-0 flex-col rounded-lg border bg-muted/20 transition-colors',
                    isOver && 'border-primary bg-primary/5'
                  )}
                >
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('font-medium', stageStyles[s])}>{s}</Badge>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="flex flex-col gap-2 p-2 min-h-[200px]">
                    {items.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center py-6 text-xs text-muted-foreground">
                        Nenhum lead nesta etapa
                      </div>
                    ) : (
                      items.map((l) => (
                        <div
                          key={l.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, l.id)}
                          onClick={() => openEdit(l)}
                          className="group cursor-grab rounded-md border bg-background p-3 shadow-sm transition hover:border-primary/40 hover:shadow active:cursor-grabbing"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{l.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{l.office}</p>
                            </div>
                            <span className={cn('inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', tierStyles[l.tier])}>
                              {l.tier}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <p className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" />{l.email}</p>
                            <p className="flex items-center gap-1.5 truncate"><Phone className="h-3 w-3 shrink-0" />{l.phone}</p>
                            <p className="flex items-center gap-1.5 truncate"><User className="h-3 w-3 shrink-0" />{l.owner}</p>
                            <p className="flex items-center gap-1.5"><CalendarIcon className="h-3 w-3 shrink-0" />
                              {l.nextFollowUp ? format(new Date(l.nextFollowUp), 'dd/MM/yyyy', { locale: ptBR }) : 'Sem follow up'}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Drawer de cadastro */}
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
          onCloseAutoFocus={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{editingId ? 'Editar Lead' : 'Adicionar Prospecção'}</SheetTitle>
            <SheetDescription>{editingId ? 'Atualize as informações do lead.' : 'Cadastre um novo lead no funil comercial.'}</SheetDescription>
          </SheetHeader>

          <form
            id="lead-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 space-y-5 overflow-y-auto px-6 py-5"
          >
            <Section title="Identificação">
              <Field label="Nome do lead *" error={form.formState.errors.name?.message}>
                <Input {...form.register('name')} placeholder="Nome completo" />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="E-mail *" error={form.formState.errors.email?.message}>
                  <Input type="email" {...form.register('email')} placeholder="email@exemplo.com" />
                </Field>
                <Field label="Telefone *" error={form.formState.errors.phone?.message}>
                  <Input {...form.register('phone')} placeholder="(11) 99999-0000" />
                </Field>
              </div>
              <Field label="Escritório de arquitetura *" error={form.formState.errors.office?.message}>
                <Input {...form.register('office')} placeholder="Nome do escritório" />
              </Field>
            </Section>

            <Section title="Funil">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Etapa">
                  <Select
                    value={form.watch('stage')}
                    onValueChange={(v) => form.setValue('stage', v as Stage, { shouldValidate: true })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Nível">
                  <Select
                    value={form.watch('tier')}
                    onValueChange={(v) => form.setValue('tier', v as Tier, { shouldValidate: true })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {tiers.map((t) => (<SelectItem key={t} value={t}>Nível {t}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Responsável">
                  <Select
                    value={form.watch('owner') || ''}
                    onValueChange={(v) => form.setValue('owner', v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {owners.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Próximo follow up">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn('w-full justify-start gap-2 font-normal', !followUpDate && 'text-muted-foreground')}
                      >
                        <CalendarIcon className="h-4 w-4" />
                        {followUpDate ? format(followUpDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={followUpDate} onSelect={setFollowUpDate} initialFocus className="pointer-events-auto p-3" locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </Field>
              </div>
            </Section>

            <Section title="Complementares">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Cidade"><Input {...form.register('city')} /></Field>
                <Field label="Estado"><Input {...form.register('state')} maxLength={2} placeholder="SP" /></Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Instagram"><Input {...form.register('instagram')} placeholder="@escritorio" /></Field>
                <Field label="Site"><Input {...form.register('website')} placeholder="https://" /></Field>
              </div>
              <Field label="Origem do lead">
                <Select value={form.watch('source') || ''} onValueChange={(v) => form.setValue('source', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar origem" /></SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Observações">
                <Textarea rows={3} {...form.register('notes')} placeholder="Notas internas, contexto, próximos passos..." />
              </Field>
            </Section>
          </form>

          <SheetFooter className="border-t bg-muted/30 px-6 py-3">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="lead-form" disabled={form.formState.isSubmitting}>
              {editingId ? 'Salvar alterações' : 'Salvar prospecção'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
