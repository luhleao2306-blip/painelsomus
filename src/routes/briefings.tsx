import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Copy, Eye, Loader2, ArrowLeft, Download, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const Route = createFileRoute('/briefings')({
  component: BriefingsAdminPage,
});

type Briefing = {
  id: string;
  token: string;
  office_name: string | null;
  contact_name: string | null;
  email: string | null;
  internal_notes: string | null;
  allow_edit: boolean;
  status: 'aguardando' | 'em_andamento' | 'enviado';
  dados: Record<string, any>;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

const TOTAL_SECTIONS = 10;

// Map sections → keys for progress and detail rendering
const SECTION_KEYS: { title: string; keys: { key: string; label: string }[] }[] = [
  { title: 'Identidade do Escritório', keys: [
    { key: 'nome_escritorio', label: 'Nome do escritório' },
    { key: 'segmento_principal', label: 'Segmento principal' },
    { key: 'cidade', label: 'Cidade' }, { key: 'estado', label: 'Estado' },
    { key: 'anos_mercado', label: 'Anos de mercado' },
    { key: 'diferenciais', label: 'Diferenciais' },
    { key: 'conquistas', label: 'Conquistas' },
  ]},
  { title: 'Público-Alvo e ICP', keys: [
    { key: 'faixa_investimento', label: 'Faixa de investimento' },
    { key: 'perfil_ocupacao', label: 'Perfil de ocupação' },
    { key: 'faixa_etaria', label: 'Faixa etária' },
    { key: 'perfil_familiar', label: 'Perfil familiar' },
    { key: 'medos_objecoes', label: 'Medos e objeções' },
    { key: 'desejos_motivacoes', label: 'Desejos e motivações' },
  ]},
  { title: 'Portfólio e Serviços', keys: [
    { key: 'tipos_projeto', label: 'Tipos de projeto' },
    { key: 'ticket_medio', label: 'Ticket médio' },
    { key: 'prazo_medio', label: 'Prazo médio' },
    { key: 'projetos_recentes', label: 'Projetos recentes' },
  ]},
  { title: 'Processo Comercial Atual', keys: [
    { key: 'fontes_leads', label: 'Fontes de leads' },
    { key: 'tempo_resposta', label: 'Tempo de resposta' },
    { key: 'taxa_conversao', label: 'Taxa de conversão' },
    { key: 'qualificacao_atual', label: 'Qualificação atual' },
    { key: 'gargalo_comercial', label: 'Gargalo comercial' },
  ]},
  { title: 'Tom de Voz do Agente', keys: [
    { key: 'tom_voz', label: 'Tom de voz' },
    { key: 'nome_agente', label: 'Nome do agente' },
    { key: 'genero_agente', label: 'Gênero do agente' },
    { key: 'palavras_proibidas', label: 'Palavras proibidas' },
    { key: 'exemplo_apresentacao', label: 'Exemplo de apresentação' },
  ]},
  { title: 'Agendamento e BANT', keys: [
    { key: 'link_agenda', label: 'Link da agenda' },
    { key: 'responsavel_atendimento', label: 'Responsável' },
    { key: 'investimento_minimo', label: 'Investimento mínimo' },
    { key: 'prazo_decisao', label: 'Prazo de decisão' },
    { key: 'perguntas_qualificacao', label: 'Perguntas de qualificação' },
  ]},
  { title: 'Concorrência e Posicionamento', keys: [
    { key: 'concorrentes', label: 'Concorrentes' },
    { key: 'analise_concorrentes', label: 'Análise dos concorrentes' },
    { key: 'diferencial_competitivo', label: 'Diferencial competitivo' },
  ]},
  { title: 'Objeções Frequentes', keys: [
    { key: 'objecao_caro', label: '"Muito caro"' },
    { key: 'objecao_pensar', label: '"Pensar melhor"' },
    { key: 'objecao_outro_orcamento', label: '"Outro orçamento"' },
    { key: 'outras_objecoes', label: 'Outras objeções' },
  ]},
  { title: 'Links e Materiais', keys: [
    { key: 'site', label: 'Site' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'portfolios', label: 'Portfólios' },
    { key: 'outros_links', label: 'Outros links' },
    { key: 'materiais_adicionais', label: 'Materiais adicionais' },
  ]},
  { title: 'Expectativas e Metas', keys: [
    { key: 'meta_leads_atual', label: 'Meta leads (atual)' },
    { key: 'meta_leads_objetivo', label: 'Meta leads (objetivo)' },
    { key: 'meta_reunioes', label: 'Meta de reuniões' },
    { key: 'sucesso_90dias', label: 'Sucesso em 90 dias' },
    { key: 'limites_agente', label: 'Limites do agente' },
  ]},
];

function isFilled(v: any) {
  if (v === undefined || v === null || v === '') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

function sectionsCompleted(dados: Record<string, any>) {
  let count = 0;
  for (const s of SECTION_KEYS) {
    if (s.keys.some(k => isFilled(dados?.[k.key]))) count++;
  }
  return count;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    aguardando: { label: 'Aguardando', cls: 'bg-muted text-muted-foreground' },
    em_andamento: { label: 'Em andamento', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
    enviado: { label: 'Enviado', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  };
  const m = map[status] ?? map.aguardando;
  return <Badge variant="secondary" className={m.cls}>{m.label}</Badge>;
}

function BriefingsAdminPage() {
  const [list, setList] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<Briefing | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('briefings').select('*').order('created_at', { ascending: false });
    setLoading(false);
    if (error) { toast.error('Erro ao carregar'); return; }
    setList((data ?? []) as any);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => filter === 'all' ? list : list.filter(b => b.status === filter),
    [list, filter]
  );

  if (detail) {
    return (
      <MainLayout>
        <BriefingDetail briefing={detail} onBack={() => { setDetail(null); load(); }} />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Briefings</h1>
            <p className="text-sm text-muted-foreground">Gere links únicos e acompanhe o preenchimento por cliente.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="aguardando">Aguardando</SelectItem>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowNew(true)}><Plus className="mr-2 h-4 w-4" />Novo cliente</Button>
          </div>
        </div>

        <Card className="p-0 overflow-hidden">
          {loading ? (
            <div className="flex h-48 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Nenhum briefing encontrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Escritório</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(b => {
                  const done = sectionsCompleted(b.dados ?? {});
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.office_name ?? '—'}</TableCell>
                      <TableCell>{b.email ?? '—'}</TableCell>
                      <TableCell>{new Date(b.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{statusBadge(b.status)}</TableCell>
                      <TableCell>{done}/{TOTAL_SECTIONS} seções</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => copyLink(b.token)} title="Copiar link"><Copy className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setDetail(b)} title="Ver detalhes"><Eye className="h-4 w-4" /></Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Excluir"
                            onClick={async () => {
                              if (!confirm(`Excluir briefing de "${b.office_name ?? 'cliente'}"? Esta ação não pode ser desfeita.`)) return;
                              const { error } = await supabase.from('briefings').delete().eq('id', b.id);
                              if (error) { toast.error('Erro ao excluir'); return; }
                              toast.success('Briefing excluído');
                              load();
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <NewBriefingDialog open={showNew} onOpenChange={setShowNew} onCreated={load} />
    </MainLayout>
  );
}

function publicLink(token: string) {
  return `${window.location.origin}/briefing/${token}`;
}

async function copyLink(token: string) {
  try {
    await navigator.clipboard.writeText(publicLink(token));
    toast.success('Link copiado!');
  } catch {
    toast.error('Não foi possível copiar');
  }
}

function NewBriefingDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [officeName, setOfficeName] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ token: string } | null>(null);

  function reset() {
    setOfficeName(''); setCreated(null);
  }

  async function save() {
    if (!officeName.trim()) { toast.error('Informe o nome do escritório'); return; }
    setSaving(true);
    const { data, error } = await supabase.from('briefings').insert({
      office_name: officeName.trim(),
      dados: {},
    }).select('token').single();
    setSaving(false);
    if (error) { toast.error('Erro: ' + error.message); return; }
    setCreated({ token: data.token });
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{created ? 'Link gerado' : 'Novo cliente'}</DialogTitle>
          <DialogDescription>
             {created ? 'Compartilhe o link abaixo com o cliente.' : 'Informe apenas o nome para gerar o link público do briefing.'}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-3">
            <Label>Link público</Label>
            <div className="flex gap-2">
              <Input readOnly value={publicLink(created.token)} className="font-mono text-xs" />
              <Button onClick={() => copyLink(created.token)}><Copy className="mr-2 h-4 w-4" />Copiar</Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome do escritório *</Label>
              <Input value={officeName} onChange={(e) => setOfficeName(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Gerar link
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BriefingDetail({ briefing, onBack }: { briefing: Briefing; onBack: () => void }) {
  const [allowEdit, setAllowEdit] = useState(briefing.allow_edit);
  const dados = briefing.dados ?? {};

  async function toggleAllowEdit(v: boolean) {
    setAllowEdit(v);
    const { error } = await supabase.from('briefings').update({ allow_edit: v }).eq('id', briefing.id);
    if (error) { toast.error('Erro ao salvar'); setAllowEdit(!v); }
  }

  async function remove() {
    if (!confirm('Excluir este briefing? Esta ação não pode ser desfeita.')) return;
    const { error } = await supabase.from('briefings').delete().eq('id', briefing.id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Briefing excluído');
    onBack();
  }

  function exportText() {
    const lines: string[] = [];
    lines.push(`BRIEFING — ${briefing.office_name ?? ''}`);
    lines.push(`Contato: ${briefing.contact_name ?? '—'} | E-mail: ${briefing.email ?? '—'}`);
    lines.push(`Status: ${briefing.status}`);
    lines.push('');
    for (const s of SECTION_KEYS) {
      lines.push(`### ${s.title}`);
      for (const k of s.keys) {
        const v = dados[k.key];
        const text = !isFilled(v) ? 'Não informado' : Array.isArray(v) ? v.join(', ') : String(v);
        lines.push(`- ${k.label}: ${text}`);
      }
      lines.push('');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `briefing-${(briefing.office_name ?? 'cliente').replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{briefing.office_name ?? 'Cliente'}</h1>
            <p className="text-sm text-muted-foreground">
              {briefing.contact_name ?? '—'} · {briefing.email ?? '—'} · {statusBadge(briefing.status)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 pr-2 border-r">
            <Label htmlFor="edit-toggle" className="text-xs text-muted-foreground">Permitir edição</Label>
            <Switch id="edit-toggle" checked={allowEdit} onCheckedChange={toggleAllowEdit} />
          </div>
          <Button variant="outline" onClick={() => copyLink(briefing.token)}><Copy className="mr-2 h-4 w-4" />Link</Button>
          <Button variant="outline" onClick={exportText}><Download className="mr-2 h-4 w-4" />Exportar</Button>
          <Button variant="outline" onClick={remove} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-4">
        {SECTION_KEYS.map((s, idx) => (
          <Card key={s.title} className="p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Seção {idx + 1}
            </div>
            <h2 className="text-lg font-semibold mb-4">{s.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {s.keys.map(k => {
                const v = dados[k.key];
                const filled = isFilled(v);
                return (
                  <div key={k.key} className="rounded-md border p-3">
                    <div className="text-xs font-medium text-muted-foreground">{k.label}</div>
                    <div className={`mt-1 text-sm whitespace-pre-wrap ${filled ? '' : 'italic text-muted-foreground/70'}`}>
                      {filled ? (Array.isArray(v) ? v.join(', ') : String(v)) : 'Não informado'}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
