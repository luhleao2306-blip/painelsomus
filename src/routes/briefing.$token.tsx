import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import {
  Building2, Users, Briefcase, Target, MessageSquare, CalendarClock,
  Swords, ShieldQuestion, Link2, Trophy, Loader2, CheckCircle2,
  ArrowLeft, ArrowRight, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logo from '@/assets/somus-logo.png';

export const Route = createFileRoute('/briefing/$token')({
  component: PublicBriefingPage,
});

type Dados = Record<string, any>;

const PROJECT_TYPES = ['Residencial','Comercial','Corporativo','Hotelaria','Interiores','Arquitetura + Interiores integrados','Reforma','Projeto novo'];
const LEAD_SOURCES = ['Instagram','Indicação','Google','Site próprio','WhatsApp direto','Portais (Houzz etc.)','Outros'];
const TONE_OPTIONS = ['Sofisticado e formal','Próximo e acolhedor','Direto e objetivo','Consultivo e educativo','Elegante e reservado','Entusiasmado e propositivo'];

const SECTIONS = [
  { title: 'Identidade do Escritório', subtitle: 'Conte sobre sua marca e posicionamento.', icon: Building2 },
  { title: 'Público-Alvo e ICP', subtitle: 'Quem é o cliente ideal do escritório.', icon: Users },
  { title: 'Portfólio e Serviços', subtitle: 'Tipos de projeto, ticket e prazos.', icon: Briefcase },
  { title: 'Processo Comercial Atual', subtitle: 'Como vocês recebem e qualificam leads hoje.', icon: Target },
  { title: 'Tom de Voz do Agente', subtitle: 'Como o agente IA deve se comunicar.', icon: MessageSquare },
  { title: 'Agendamento e BANT', subtitle: 'Qualificação e agendamento de reuniões.', icon: CalendarClock },
  { title: 'Concorrência e Posicionamento', subtitle: 'Como vocês se diferenciam.', icon: Swords },
  { title: 'Objeções Frequentes', subtitle: 'Respostas-padrão a objeções comuns.', icon: ShieldQuestion },
  { title: 'Links e Materiais', subtitle: 'Referências e canais oficiais.', icon: Link2 },
  { title: 'Expectativas e Metas', subtitle: 'O que define sucesso para vocês.', icon: Trophy },
] as const;

type BriefingRow = {
  id: string;
  token: string;
  office_name: string | null;
  contact_name: string | null;
  email: string | null;
  status: 'aguardando' | 'em_andamento' | 'enviado';
  dados: Dados;
  allow_edit: boolean;
  submitted_at: string | null;
};

function PublicBriefingPage() {
  const { token } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState<BriefingRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [dados, setDados] = useState<Dados>({});
  const [saving, setSaving] = useState(false);
  const [thanks, setThanks] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('get_briefing_by_token', { _token: token });
      if (error) { setError('erro'); setLoading(false); return; }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) { setError('not_found'); setLoading(false); return; }
      const r = row as any as BriefingRow;
      setBriefing(r);
      setDados((r.dados as Dados) ?? {});
      if (r.status === 'enviado' && !r.allow_edit) setThanks(true);
      setLoading(false);
    })();
  }, [token]);

  // debounced autosave
  useEffect(() => {
    if (!briefing || thanks) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      supabase.rpc('save_briefing_progress', { _token: token, _dados: dados }).then(() => {}, () => {});
    }, 1000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [dados, briefing, token, thanks]);

  const set = (key: string, value: any) => setDados((d) => ({ ...d, [key]: value }));
  const toggleArr = (key: string, value: string, max?: number) =>
    setDados((d) => {
      const arr: string[] = Array.isArray(d[key]) ? d[key] : [];
      if (arr.includes(value)) return { ...d, [key]: arr.filter((v) => v !== value) };
      if (max && arr.length >= max) { toast.warning(`Máximo de ${max} seleções`); return d; }
      return { ...d, [key]: [...arr, value] };
    });

  async function saveNow() {
    setSaving(true);
    const { error } = await supabase.rpc('save_briefing_progress', { _token: token, _dados: dados });
    setSaving(false);
    if (error) { toast.error('Erro ao salvar'); return false; }
    return true;
  }

  async function next() {
    if (step === 0 && (!dados.nome_escritorio?.trim() || !dados.segmento_principal?.trim())) {
      toast.error('Preencha o nome do escritório e o segmento principal.');
      return;
    }
    const ok = await saveNow();
    if (ok && step < SECTIONS.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function submit() {
    setSaving(true);
    const { error } = await supabase.rpc('submit_briefing_by_token', { _token: token, _dados: dados });
    setSaving(false);
    if (error) { toast.error('Erro ao enviar: ' + error.message); return; }
    setThanks(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const progress = useMemo(() => Math.round(((step + 1) / SECTIONS.length) * 100), [step]);

  if (loading) {
    return <CenterShell><Loader2 className="h-6 w-6 animate-spin text-primary" /></CenterShell>;
  }

  if (error === 'not_found' || error === 'erro') {
    return (
      <CenterShell>
        <Card className="max-w-md p-8 text-center space-y-3">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="text-xl font-semibold">Link inválido ou expirado</h1>
          <p className="text-sm text-muted-foreground">Verifique o link recebido ou solicite um novo à equipe SOMUS.</p>
        </Card>
      </CenterShell>
    );
  }

  if (thanks) {
    return (
      <CenterShell>
        <Card className="max-w-md p-8 text-center space-y-3">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <h1 className="text-xl font-semibold">Briefing recebido</h1>
          <p className="text-sm text-muted-foreground">Obrigado! Recebemos suas respostas. Nossa equipe entrará em contato em breve.</p>
        </Card>
      </CenterShell>
    );
  }

  const current = SECTIONS[step];
  const Icon = current.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5">
      {/* Decorative background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <header className="relative border-b border-border/40 bg-background/70 backdrop-blur-xl sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <img src={logo} alt="SOMUS" className="h-8 w-auto" />
          {briefing?.office_name && (
            <div className="text-sm font-medium text-muted-foreground px-3 py-1 rounded-full bg-muted/60">
              {briefing.office_name}
            </div>
          )}
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-4">
          <div className="flex items-center justify-between text-xs font-medium mb-2">
            <span className="text-muted-foreground">
              Seção <span className="text-foreground">{step + 1}</span> de {SECTIONS.length}
            </span>
            <span className="text-primary font-semibold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
          <div className="mt-3 flex gap-1.5">
            {SECTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${
                  i < step ? 'bg-primary' : i === step ? 'bg-primary/60' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 py-10 space-y-8">
        <div className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500" key={step}>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/20">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 pt-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary/80 mb-1">
              Etapa {step + 1} de {SECTIONS.length}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{current.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{current.subtitle}</p>
          </div>
        </div>

        <Card className="p-6 sm:p-8 space-y-5 border-border/50 shadow-xl shadow-primary/5 backdrop-blur-sm bg-card/80 animate-in fade-in duration-500">
          {step === 0 && <Section1 dados={dados} set={set} />}
          {step === 1 && <Section2 dados={dados} set={set} />}
          {step === 2 && <Section3 dados={dados} set={set} toggleArr={toggleArr} />}
          {step === 3 && <Section4 dados={dados} set={set} toggleArr={toggleArr} />}
          {step === 4 && <Section5 dados={dados} set={set} toggleArr={toggleArr} />}
          {step === 5 && <Section6 dados={dados} set={set} />}
          {step === 6 && <Section7 dados={dados} set={set} />}
          {step === 7 && <Section8 dados={dados} set={set} />}
          {step === 8 && <Section9 dados={dados} set={set} />}
          {step === 9 && <Section10 dados={dados} set={set} />}
        </Card>

        <div className="flex items-center justify-between gap-3 pb-12">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0 || saving}
            className="rounded-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          {step < SECTIONS.length - 1 ? (
            <Button onClick={next} disabled={saving} size="lg" className="rounded-full shadow-lg shadow-primary/20 px-6">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Continuar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={saving} size="lg" className="rounded-full shadow-lg shadow-primary/20 px-6">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Enviar briefing
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function CenterShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">{children}</div>;
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-foreground/90">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </Label>
      <div className="[&_input]:h-11 [&_input]:rounded-xl [&_input]:border-border/60 [&_input]:bg-background/60 [&_input]:transition-all [&_input:focus-visible]:ring-2 [&_input:focus-visible]:ring-primary/30 [&_input:focus-visible]:border-primary [&_textarea]:rounded-xl [&_textarea]:border-border/60 [&_textarea]:bg-background/60 [&_textarea]:transition-all [&_textarea:focus-visible]:ring-2 [&_textarea:focus-visible]:ring-primary/30 [&_textarea:focus-visible]:border-primary">
        {children}
      </div>
    </div>
  );
}

function CheckGrid({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <label
            key={opt}
            className={`flex items-center gap-2.5 rounded-xl border p-3 text-sm cursor-pointer transition-all ${
              isSelected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border/60 hover:border-primary/40 hover:bg-muted/40'
            }`}
          >
            <Checkbox checked={isSelected} onCheckedChange={() => onToggle(opt)} />
            <span className="font-medium">{opt}</span>
          </label>
        );
      })}
    </div>
  );
}

function Section1({ dados, set }: any) {
  return (
    <div className="space-y-4">
      <Field label="Nome do escritório / marca" required>
        <Input value={dados.nome_escritorio ?? ''} onChange={(e) => set('nome_escritorio', e.target.value)} />
      </Field>
      <Field label="Segmento principal" required>
        <Input placeholder="Ex: Residencial alto padrão" value={dados.segmento_principal ?? ''} onChange={(e) => set('segmento_principal', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Cidade"><Input value={dados.cidade ?? ''} onChange={(e) => set('cidade', e.target.value)} /></Field>
        <Field label="Estado"><Input value={dados.estado ?? ''} onChange={(e) => set('estado', e.target.value)} /></Field>
      </div>
      <Field label="Anos de mercado"><Input type="number" value={dados.anos_mercado ?? ''} onChange={(e) => set('anos_mercado', e.target.value)} /></Field>
      <Field label="Diferenciais do escritório"><Textarea rows={4} value={dados.diferenciais ?? ''} onChange={(e) => set('diferenciais', e.target.value)} /></Field>
      <Field label="Conquistas e projetos de destaque"><Textarea rows={4} value={dados.conquistas ?? ''} onChange={(e) => set('conquistas', e.target.value)} /></Field>
    </div>
  );
}
function Section2({ dados, set }: any) {
  return (
    <div className="space-y-4">
      <Field label="Faixa de investimento do cliente ideal"><Input value={dados.faixa_investimento ?? ''} onChange={(e) => set('faixa_investimento', e.target.value)} /></Field>
      <Field label="Perfil de ocupação"><Input value={dados.perfil_ocupacao ?? ''} onChange={(e) => set('perfil_ocupacao', e.target.value)} /></Field>
      <Field label="Faixa etária predominante"><Input value={dados.faixa_etaria ?? ''} onChange={(e) => set('faixa_etaria', e.target.value)} /></Field>
      <Field label="Perfil familiar"><Input value={dados.perfil_familiar ?? ''} onChange={(e) => set('perfil_familiar', e.target.value)} /></Field>
      <Field label="Principais medos e objeções"><Textarea rows={4} value={dados.medos_objecoes ?? ''} onChange={(e) => set('medos_objecoes', e.target.value)} /></Field>
      <Field label="Principais desejos e motivações"><Textarea rows={4} value={dados.desejos_motivacoes ?? ''} onChange={(e) => set('desejos_motivacoes', e.target.value)} /></Field>
    </div>
  );
}
function Section3({ dados, set, toggleArr }: any) {
  return (
    <div className="space-y-4">
      <Field label="Tipos de projeto que atendem">
        <CheckGrid options={PROJECT_TYPES} selected={dados.tipos_projeto ?? []} onToggle={(v) => toggleArr('tipos_projeto', v)} />
      </Field>
      <Field label="Ticket médio por projeto"><Input value={dados.ticket_medio ?? ''} onChange={(e) => set('ticket_medio', e.target.value)} /></Field>
      <Field label="Prazo médio de entrega"><Input value={dados.prazo_medio ?? ''} onChange={(e) => set('prazo_medio', e.target.value)} /></Field>
      <Field label="Descrição de 2 ou 3 projetos recentes"><Textarea rows={6} value={dados.projetos_recentes ?? ''} onChange={(e) => set('projetos_recentes', e.target.value)} /></Field>
    </div>
  );
}
function Section4({ dados, set, toggleArr }: any) {
  return (
    <div className="space-y-4">
      <Field label="Como recebem leads hoje">
        <CheckGrid options={LEAD_SOURCES} selected={dados.fontes_leads ?? []} onToggle={(v) => toggleArr('fontes_leads', v)} />
      </Field>
      <Field label="Tempo médio de resposta atual"><Input value={dados.tempo_resposta ?? ''} onChange={(e) => set('tempo_resposta', e.target.value)} /></Field>
      <Field label="Taxa de conversão estimada"><Input value={dados.taxa_conversao ?? ''} onChange={(e) => set('taxa_conversao', e.target.value)} /></Field>
      <Field label="Como é feita a qualificação do lead hoje"><Textarea rows={4} value={dados.qualificacao_atual ?? ''} onChange={(e) => set('qualificacao_atual', e.target.value)} /></Field>
      <Field label="Maior gargalo comercial atual"><Textarea rows={4} value={dados.gargalo_comercial ?? ''} onChange={(e) => set('gargalo_comercial', e.target.value)} /></Field>
    </div>
  );
}
function Section5({ dados, set, toggleArr }: any) {
  return (
    <div className="space-y-4">
      <Field label="Como o agente deve se comunicar (máximo 3)">
        <CheckGrid options={TONE_OPTIONS} selected={dados.tom_voz ?? []} onToggle={(v) => toggleArr('tom_voz', v, 3)} />
      </Field>
      <Field label="Nome do agente IA"><Input value={dados.nome_agente ?? ''} onChange={(e) => set('nome_agente', e.target.value)} /></Field>
      <Field label="Gênero do agente">
        <RadioGroup value={dados.genero_agente ?? ''} onValueChange={(v) => set('genero_agente', v)} className="flex gap-4">
          {['Masculino','Feminino','Neutro'].map((g) => (
            <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem value={g} /> {g}
            </label>
          ))}
        </RadioGroup>
      </Field>
      <Field label="Palavras e expressões que o agente NÃO deve usar"><Textarea rows={3} value={dados.palavras_proibidas ?? ''} onChange={(e) => set('palavras_proibidas', e.target.value)} /></Field>
      <Field label="Exemplo de apresentação do agente ao lead"><Textarea rows={4} value={dados.exemplo_apresentacao ?? ''} onChange={(e) => set('exemplo_apresentacao', e.target.value)} /></Field>
    </div>
  );
}
function Section6({ dados, set }: any) {
  return (
    <div className="space-y-4">
      <Field label="Link do Calendly ou agenda"><Input type="url" placeholder="https://" value={dados.link_agenda ?? ''} onChange={(e) => set('link_agenda', e.target.value)} /></Field>
      <Field label="Nome do responsável pelo atendimento"><Input value={dados.responsavel_atendimento ?? ''} onChange={(e) => set('responsavel_atendimento', e.target.value)} /></Field>
      <Field label="Investimento mínimo para atender"><Input value={dados.investimento_minimo ?? ''} onChange={(e) => set('investimento_minimo', e.target.value)} /></Field>
      <Field label="Prazo mínimo de decisão do cliente"><Input value={dados.prazo_decisao ?? ''} onChange={(e) => set('prazo_decisao', e.target.value)} /></Field>
      <Field label="Perguntas obrigatórias de qualificação"><Textarea rows={4} value={dados.perguntas_qualificacao ?? ''} onChange={(e) => set('perguntas_qualificacao', e.target.value)} /></Field>
    </div>
  );
}
function Section7({ dados, set }: any) {
  return (
    <div className="space-y-4">
      <Field label="Cite 2 ou 3 concorrentes diretos"><Textarea rows={3} value={dados.concorrentes ?? ''} onChange={(e) => set('concorrentes', e.target.value)} /></Field>
      <Field label="O que esses concorrentes fazem bem / mal"><Textarea rows={4} value={dados.analise_concorrentes ?? ''} onChange={(e) => set('analise_concorrentes', e.target.value)} /></Field>
      <Field label="Por que um cliente escolheria vocês"><Textarea rows={4} value={dados.diferencial_competitivo ?? ''} onChange={(e) => set('diferencial_competitivo', e.target.value)} /></Field>
    </div>
  );
}
function Section8({ dados, set }: any) {
  return (
    <div className="space-y-4">
      <Field label='Resposta para "Está muito caro."'><Textarea rows={3} value={dados.objecao_caro ?? ''} onChange={(e) => set('objecao_caro', e.target.value)} /></Field>
      <Field label='Resposta para "Preciso pensar melhor."'><Textarea rows={3} value={dados.objecao_pensar ?? ''} onChange={(e) => set('objecao_pensar', e.target.value)} /></Field>
      <Field label='Resposta para "Já tenho outro orçamento."'><Textarea rows={3} value={dados.objecao_outro_orcamento ?? ''} onChange={(e) => set('objecao_outro_orcamento', e.target.value)} /></Field>
      <Field label="Outras objeções frequentes e respostas"><Textarea rows={4} value={dados.outras_objecoes ?? ''} onChange={(e) => set('outras_objecoes', e.target.value)} /></Field>
    </div>
  );
}
function Section9({ dados, set }: any) {
  return (
    <div className="space-y-4">
      <Field label="Site do escritório"><Input type="url" placeholder="https://" value={dados.site ?? ''} onChange={(e) => set('site', e.target.value)} /></Field>
      <Field label="Instagram principal"><Input placeholder="@..." value={dados.instagram ?? ''} onChange={(e) => set('instagram', e.target.value)} /></Field>
      <Field label="Houzz / Pinterest / Behance"><Input value={dados.portfolios ?? ''} onChange={(e) => set('portfolios', e.target.value)} /></Field>
      <Field label="Outros links relevantes"><Input value={dados.outros_links ?? ''} onChange={(e) => set('outros_links', e.target.value)} /></Field>
      <Field label="Materiais adicionais que deseja enviar"><Textarea rows={3} value={dados.materiais_adicionais ?? ''} onChange={(e) => set('materiais_adicionais', e.target.value)} /></Field>
    </div>
  );
}
function Section10({ dados, set }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Meta de leads/mês — atual"><Input type="number" value={dados.meta_leads_atual ?? ''} onChange={(e) => set('meta_leads_atual', e.target.value)} /></Field>
        <Field label="Meta de leads/mês — objetivo"><Input type="number" value={dados.meta_leads_objetivo ?? ''} onChange={(e) => set('meta_leads_objetivo', e.target.value)} /></Field>
      </div>
      <Field label="Meta de reuniões agendadas por mês"><Input type="number" value={dados.meta_reunioes ?? ''} onChange={(e) => set('meta_reunioes', e.target.value)} /></Field>
      <Field label="O que seria um sucesso claro em 90 dias"><Textarea rows={4} value={dados.sucesso_90dias ?? ''} onChange={(e) => set('sucesso_90dias', e.target.value)} /></Field>
      <Field label="O que o agente nunca deve fazer — limites e restrições"><Textarea rows={4} value={dados.limites_agente ?? ''} onChange={(e) => set('limites_agente', e.target.value)} /></Field>
    </div>
  );
}
