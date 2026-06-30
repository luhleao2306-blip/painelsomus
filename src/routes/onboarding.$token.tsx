import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getInviteByToken, submitOnboarding } from '@/lib/onboarding.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Loader2, AlertCircle, CheckCircle2, Building2, User, MapPin,
  ShieldCheck, ArrowRight, ArrowLeft, Sparkles, Lock, Clock, Mail,
} from 'lucide-react';
import { isValidCNPJ, maskCNPJ, maskPhone, onlyDigits } from '@/lib/cnpj';

function maskCPF(v: string) {
  const d = (v || '').replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function maskCEP(v: string) {
  const d = (v || '').replace(/\D/g, '').slice(0, 8);
  return d.replace(/(\d{5})(\d)/, '$1-$2');
}
function isValidCPF(v: string) { return (v || '').replace(/\D/g, '').length === 11; }
import somusLogoUrl from '@/assets/somus-logo.png';

export const Route = createFileRoute('/onboarding/$token')({
  component: OnboardingPage,
});

const schema = z.object({
  legal_name: z.string().trim().min(1, 'Obrigatório').max(200),
  trade_name: z.string().trim().min(1, 'Obrigatório').max(200),
  cnpj: z.string().refine((v) => isValidCNPJ(v), 'CNPJ inválido'),
  founded_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').or(z.literal('')),
  segment: z.string().trim().min(1, 'Obrigatório').max(120),
  employees_count: z.string().regex(/^\d+$/, 'Apenas números').or(z.literal('')),
  monthly_revenue: z.string().regex(/^\d+(\.\d+)?$/, 'Apenas números').or(z.literal('')),
  website: z.string().trim().url('URL inválida').or(z.literal('')),
  instagram: z.string().trim().max(120).or(z.literal('')),
  contact_name: z.string().trim().min(1, 'Obrigatório').max(120),
  contact_role: z.string().trim().min(1, 'Obrigatório').max(120),
  contact_cpf: z.string().refine(isValidCPF, 'CPF inválido'),
  phone: z.string().refine((v) => onlyDigits(v).length >= 10, 'Telefone inválido'),
  whatsapp: z.string().refine((v) => onlyDigits(v).length >= 10, 'WhatsApp inválido'),
  email: z.string().trim().email('E-mail inválido').max(255),
  financial_responsible: z.string().trim().max(120).or(z.literal('')),
  zip_code: z.string().refine((v) => onlyDigits(v).length === 8, 'CEP inválido'),
  address: z.string().trim().min(1, 'Obrigatório').max(200),
  address_number: z.string().trim().min(1, 'Obrigatório').max(20),
  neighborhood: z.string().trim().min(1, 'Obrigatório').max(120),
  state: z.string().trim().min(2, 'Obrigatório').max(40),
  city: z.string().trim().min(1, 'Obrigatório').max(120),
});

type FormData = z.infer<typeof schema>;

const STEPS = [
  { id: 0, title: 'Empresa', desc: 'Dados da sua empresa', icon: Building2,
    fields: ['legal_name','trade_name','cnpj','founded_at','segment','employees_count','monthly_revenue','website','instagram'] as const },
  { id: 1, title: 'Responsável', desc: 'Quem está preenchendo', icon: User,
    fields: ['contact_name','contact_role','contact_cpf','phone','whatsapp','email','financial_responsible'] as const },
  { id: 2, title: 'Endereço', desc: 'Onde a empresa atua', icon: MapPin,
    fields: ['zip_code','address','address_number','neighborhood','state','city'] as const },
];

function OnboardingPage() {
  const { token } = Route.useParams();
  const validateFn = useServerFn(getInviteByToken);
  const submitFn = useServerFn(submitOnboarding);
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success'>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      legal_name: '', trade_name: '', cnpj: '', founded_at: '', segment: '',
      employees_count: '', monthly_revenue: '', website: '', instagram: '',
      contact_name: '', contact_role: '', contact_cpf: '', phone: '', whatsapp: '', email: '',
      financial_responsible: '',
      zip_code: '', address: '', address_number: '', neighborhood: '',
      state: '', city: '',
    },
  });

  useEffect(() => {
    validateFn({ data: { token } })
      .then((r) => setStatus(r.valid ? 'valid' : 'invalid'))
      .catch(() => setStatus('invalid'));
  }, [token, validateFn]);

  async function onSubmit(values: FormData) {
    setSubmitting(true);
    try {
      await submitFn({ data: {
        token, ...values,
        cnpj: onlyDigits(values.cnpj),
        contact_cpf: onlyDigits(values.contact_cpf),
        zip_code: onlyDigits(values.zip_code),
      } });
      setStatus('success');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar ficha');
    } finally {
      setSubmitting(false);
    }
  }

  async function next() {
    const ok = await form.trigger(STEPS[step].fields as any);
    if (!ok) { toast.error('Preencha os campos obrigatórios antes de continuar'); return; }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function prev() {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <PublicShell>
        <Card className="max-w-lg mx-auto border-destructive/30 shadow-xl">
          <CardContent className="p-10 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="font-display text-2xl">Link inválido ou expirado</h2>
            <p className="text-muted-foreground">
              Este link não está mais disponível. Entre em contato com nossa equipe para solicitar um novo convite.
            </p>
          </CardContent>
        </Card>
      </PublicShell>
    );
  }

  if (status === 'success') {
    return (
      <PublicShell>
        <Card className="max-w-lg mx-auto border-primary/30 shadow-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-primary" />
          <CardContent className="p-10 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center ring-8 ring-primary/5">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>
            <h2 className="font-display text-3xl">Ficha enviada!</h2>
            <p className="text-muted-foreground">
              Recebemos suas informações. Nossa equipe irá analisar seu cadastro em breve.
            </p>
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Mail className="h-4 w-4" /> Próximo passo
              </div>
              <p className="text-sm text-muted-foreground">
                Assim que seu cadastro for <strong>aprovado</strong>, enviaremos o <strong>link do contrato</strong> para sua assinatura. Em seguida, você receberá um <strong>e-mail</strong> para definir sua senha e acessar a plataforma.
              </p>
              <p className="text-xs text-muted-foreground">
                Fique de olho na sua caixa de entrada (e na pasta de spam).
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
              <Clock className="h-3.5 w-3.5" /> Análise em até 1 dia útil
            </div>
          </CardContent>
        </Card>
      </PublicShell>
    );
  }

  const { register, handleSubmit, formState: { errors }, watch, setValue } = form;
  const v = watch();
  const StepIcon = STEPS[step].icon;
  const isLast = step === STEPS.length - 1;

  return (
    <PublicShell>
      <div className="grid lg:grid-cols-[320px_1fr] gap-8 max-w-6xl mx-auto">
        {/* Stepper sidebar */}
        <aside className="lg:sticky lg:top-8 self-start">
          <Card className="overflow-hidden">
            <div className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary mb-2">
                <Sparkles className="h-3.5 w-3.5" /> Cadastro guiado
              </div>
              <h3 className="font-display text-lg font-semibold">3 etapas rápidas</h3>
              <p className="text-xs text-muted-foreground mt-1">~3 minutos para concluir</p>
            </div>
            <div className="p-4 space-y-1">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const active = i === step;
                const done = i < step;
                return (
                  <div key={s.id}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                      active ? 'bg-primary/10' : done ? 'opacity-70' : 'opacity-50'
                    }`}>
                    <div className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold transition ${
                      active ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                      : done ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                    }`}>
                      {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-sm font-medium ${active ? 'text-foreground' : ''}`}>{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t bg-muted/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Seus dados são criptografados.
              </div>
            </div>
          </Card>
        </aside>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Etapa {step + 1} de {STEPS.length}</span>
              <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
          </div>

          <Card className="shadow-xl border-border/60 overflow-hidden">
            <div className="p-6 md:p-8 border-b bg-gradient-to-br from-card to-muted/20">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <StepIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl md:text-2xl font-semibold">{STEPS[step].title}</h2>
                  <p className="text-sm text-muted-foreground">{STEPS[step].desc}</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6 md:p-8">
              {step === 0 && (
                <Grid>
                  <Field label="Razão Social *" error={errors.legal_name?.message}>
                    <Input {...register('legal_name')} />
                  </Field>
                  <Field label="Nome Fantasia *" error={errors.trade_name?.message}>
                    <Input {...register('trade_name')} />
                  </Field>
                  <Field label="CNPJ *" error={errors.cnpj?.message}>
                    <Input value={maskCNPJ(v.cnpj)} onChange={(e) => setValue('cnpj', maskCNPJ(e.target.value), { shouldValidate: true })} placeholder="00.000.000/0000-00" />
                  </Field>
                  <Field label="Data de Fundação" error={errors.founded_at?.message}>
                    <Input type="date" {...register('founded_at')} />
                  </Field>
                  <Field label="Segmento de Atuação *" error={errors.segment?.message}>
                    <Input {...register('segment')} placeholder="Ex: Varejo, Indústria, Serviços" />
                  </Field>
                  <Field label="Qtd. de Colaboradores" error={errors.employees_count?.message}>
                    <Input type="number" min="0" {...register('employees_count')} />
                  </Field>
                  <Field label="Faturamento Médio Mensal (R$)" error={errors.monthly_revenue?.message}>
                    <Input type="number" min="0" step="0.01" {...register('monthly_revenue')} />
                  </Field>
                  <Field label="Site" error={errors.website?.message}>
                    <Input placeholder="https://" {...register('website')} />
                  </Field>
                  <Field label="Instagram" error={errors.instagram?.message} full>
                    <Input placeholder="@empresa" {...register('instagram')} />
                  </Field>
                </Grid>
              )}

              {step === 1 && (
                <Grid>
                  <Field label="Nome *" error={errors.contact_name?.message}>
                    <Input {...register('contact_name')} />
                  </Field>
                  <Field label="Cargo *" error={errors.contact_role?.message}>
                    <Input {...register('contact_role')} placeholder="Ex: Diretor Comercial" />
                  </Field>
                  <Field label="CPF *" error={errors.contact_cpf?.message}>
                    <Input value={maskCPF(v.contact_cpf || '')} onChange={(e) => setValue('contact_cpf', maskCPF(e.target.value), { shouldValidate: true })} placeholder="000.000.000-00" />
                  </Field>
                  <Field label="E-mail *" error={errors.email?.message}>
                    <Input type="email" {...register('email')} placeholder="voce@empresa.com" />
                  </Field>
                  <Field label="Telefone *" error={errors.phone?.message}>
                    <Input value={maskPhone(v.phone)} onChange={(e) => setValue('phone', maskPhone(e.target.value), { shouldValidate: true })} placeholder="(00) 0000-0000" />
                  </Field>
                  <Field label="WhatsApp *" error={errors.whatsapp?.message}>
                    <Input value={maskPhone(v.whatsapp)} onChange={(e) => setValue('whatsapp', maskPhone(e.target.value), { shouldValidate: true })} placeholder="(00) 00000-0000" />
                  </Field>
                  <Field label="Responsável Financeiro (se diferente do responsável)" error={errors.financial_responsible?.message} full>
                    <Input {...register('financial_responsible')} placeholder="Nome do responsável financeiro" />
                  </Field>
                </Grid>
              )}

              {step === 2 && (
                <Grid>
                  <Field label="CEP *" error={errors.zip_code?.message}>
                    <Input value={maskCEP(v.zip_code || '')} onChange={(e) => setValue('zip_code', maskCEP(e.target.value), { shouldValidate: true })} placeholder="00000-000" />
                  </Field>
                  <Field label="Endereço *" error={errors.address?.message}>
                    <Input {...register('address')} placeholder="Rua, avenida..." />
                  </Field>
                  <Field label="Número *" error={errors.address_number?.message}>
                    <Input {...register('address_number')} placeholder="Nº" />
                  </Field>
                  <Field label="Bairro *" error={errors.neighborhood?.message}>
                    <Input {...register('neighborhood')} />
                  </Field>
                  <Field label="Estado *" error={errors.state?.message}>
                    <Input maxLength={2} placeholder="UF" {...register('state')} />
                  </Field>
                  <Field label="Cidade *" error={errors.city?.message}>
                    <Input {...register('city')} />
                  </Field>
                </Grid>
              )}
            </CardContent>

            <div className="px-6 md:px-8 py-5 border-t bg-muted/20 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <Button type="button" variant="ghost" onClick={prev} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
              </Button>
              {isLast ? (
                <Button type="submit" size="lg" disabled={submitting} className="min-w-[220px] shadow-lg shadow-primary/20">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Enviar Ficha Cadastral
                </Button>
              ) : (
                <Button type="button" size="lg" onClick={next} className="min-w-[180px] shadow-lg shadow-primary/20">
                  Continuar <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              )}
            </div>
          </Card>
        </form>
      </div>
    </PublicShell>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 relative">
      {/* Decorative gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <header className="relative border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={somusLogoUrl} alt="Somus" className="h-8 w-auto dark:invert" />
          </div>
          <div className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Conexão segura
          </div>
        </div>
      </header>

      <section className="relative max-w-6xl mx-auto px-6 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-5">
          <ShieldCheck className="h-3.5 w-3.5" /> Link exclusivo e seguro
        </div>
        <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          Bem-vindo à SOMUS
        </h1>
        <p className="mt-5 text-muted-foreground max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
          Preencha sua ficha cadastral para que nossa equipe possa analisar suas informações e liberar seu acesso à plataforma.
        </p>
      </section>

      <main className="relative max-w-6xl mx-auto px-6 pb-20">{children}</main>

      <footer className="relative border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Somus — Todos os direitos reservados
      </footer>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>;
}

function Field({ label, error, children, full }: { label: string; error?: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {error && <p className="text-xs text-destructive mt-1.5 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{error}</p>}
    </div>
  );
}
