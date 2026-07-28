import { createFileRoute } from '@tanstack/react-router';
import { useForceLight } from '@/hooks/use-force-light';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Save } from 'lucide-react';
import somusLogo from '@/assets/somus-logo.png';
import { VISAO_SECTIONS, HORIZONS, visaoProgress } from '@/lib/visao-form';

export const Route = createFileRoute('/vf/$token')({
  component: PublicVisaoForm,
  head: () => ({
    meta: [
      { title: 'Visão de Futuro | Somus Group' },
      {
        name: 'description',
        content:
          'Formulário Visão de Futuro da Somus Group: registre propósito, metas e resultados inegociáveis do seu escritório em 12 meses, 36 meses e 5 anos.',
      },
      { property: 'og:title', content: 'Visão de Futuro | Somus Group' },
      {
        property: 'og:description',
        content: 'Preencha a Visão de Futuro do seu escritório e traga o material para o encontro de imersão.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
});

type Loaded = {
  id: string;
  template_name: string;
  client_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  status: string;
  answers: Record<string, any>;
};

function PublicVisaoForm() {
  useForceLight();
  const { token } = Route.useParams();
  const [state, setState] = useState<'loading' | 'ok' | 'invalid' | 'done'>('loading');
  const [meta, setMeta] = useState<Loaded | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('get_client_form_request' as any, { _token: token });
      const row = Array.isArray(data) ? (data[0] as any) : (data as any);
      if (error || !row) {
        setState('invalid');
        return;
      }
      setMeta(row);
      setAnswers(row.answers ?? {});
      if (!row.answers?.['identificacao.empresa'] && row.client_name) {
        setAnswers(a => ({ ...a, 'identificacao.empresa': row.client_name }));
      }
      setState(row.status === 'submitted' ? 'done' : 'ok');
    })();
  }, [token]);

  const progress = useMemo(() => visaoProgress(answers), [answers]);
  const set = (key: string, value: string) => setAnswers(a => ({ ...a, [key]: value }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.rpc('save_client_form_progress' as any, {
      _token: token,
      _answers: answers,
      _progress: progress,
    });
    setSaving(false);
    if (error) toast.error('Não foi possível salvar.');
    else toast.success('Progresso salvo. Você pode voltar depois neste mesmo link.');
  };

  const submit = async () => {
    if (!String(answers['identificacao.empresa'] ?? '').trim()) {
      toast.error('Informe o nome do escritório / empresa.');
      return;
    }
    setSending(true);
    const { error } = await supabase.rpc('submit_client_form' as any, {
      _token: token,
      _answers: answers,
      _progress: progress,
      _client_name: String(answers['identificacao.empresa'] ?? ''),
      _contact_name: String(answers['identificacao.nome'] ?? ''),
      _contact_email: String(answers['identificacao.email'] ?? ''),
    });
    setSending(false);
    if (error) {
      toast.error('Não foi possível enviar. Tente novamente.');
      return;
    }
    setState('done');
  };

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div>
          <img src={somusLogo} alt="Somus Group" className="mx-auto mb-6 h-10 w-auto" />
          <h1 className="font-display text-2xl">Link inválido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este formulário não existe ou foi removido. Fale com o seu consultor Somus.
          </p>
        </div>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md">
          <img src={somusLogo} alt="Somus Group" className="mx-auto mb-6 h-10 w-auto" />
          <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-500" />
          <h1 className="font-display text-2xl">Visão enviada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Recebemos suas respostas. Traga este material para o encontro de imersão — a visão será o ponto de
            partida do diagnóstico.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-4">
          <img src={somusLogo} alt="Somus Group" className="h-7 w-auto" />
          <div className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{progress}%</span>
          <Button size="sm" variant="outline" onClick={save} disabled={saving}>
            <Save className="mr-1 h-3.5 w-3.5" /> Salvar
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {meta?.template_name ?? 'Visão de Futuro'}
        </p>
        <h1 className="mt-2 font-display text-3xl leading-tight">
          A visão do escritório em 12 meses, 36 meses e 5 anos
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Responda com calma. Você pode salvar e voltar depois usando este mesmo link.
        </p>

        <div className="mt-10 space-y-12">
          {VISAO_SECTIONS.map(s => (
            <section key={s.id} className="scroll-mt-24">
              <p className="font-mono text-xs text-muted-foreground">{s.number}</p>
              <h2 className="mt-1 font-display text-xl">{s.title}</h2>
              {s.intro && <p className="mt-2 text-sm text-muted-foreground">{s.intro}</p>}
              {s.prompts && (
                <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-4">
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Perguntas para provocar a resposta
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {s.prompts.map(p => (
                      <li key={p} className="text-[13px] text-foreground/80">
                        — {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {s.fields && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {s.fields.map(f => (
                    <div key={f.id} className={f.long ? 'sm:col-span-2' : ''}>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {f.label}
                      </label>
                      {f.long ? (
                        <Textarea
                          rows={4}
                          value={answers[`${s.id}.${f.id}`] ?? ''}
                          onChange={e => set(`${s.id}.${f.id}`, e.target.value)}
                        />
                      ) : (
                        <Input
                          value={answers[`${s.id}.${f.id}`] ?? ''}
                          onChange={e => set(`${s.id}.${f.id}`, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {s.horizons && (
                <div className="mt-4 space-y-4">
                  {HORIZONS.map(h => (
                    <div key={h.key}>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {h.label}
                      </label>
                      <Textarea
                        rows={4}
                        value={answers[`${s.id}.${h.key}`] ?? ''}
                        onChange={e => set(`${s.id}.${h.key}`, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {s.results && (
                <div className="mt-4 grid gap-5 sm:grid-cols-3">
                  {HORIZONS.map(h => (
                    <div key={h.key} className="rounded-lg border border-border/60 p-4">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {h.label}
                      </p>
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                          <Input
                            key={i}
                            placeholder={`${i}.`}
                            value={answers[`${s.id}.${h.key}.${i}`] ?? ''}
                            onChange={e => set(`${s.id}.${h.key}.${i}`, e.target.value)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-border/60 bg-muted/30 p-6">
          <h3 className="font-display text-lg">Próximo passo</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Ao enviar, sua visão vai direto para o painel da Somus e será usada como ponto de partida do
            diagnóstico no encontro de imersão.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={save} disabled={saving}>
              Salvar rascunho
            </Button>
            <Button onClick={submit} disabled={sending}>
              {sending ? 'Enviando…' : 'Enviar visão para a Somus'}
            </Button>
          </div>
        </div>

        <p className="mt-10 text-center text-[11px] text-muted-foreground">Somus Group · portal.somus.group</p>
      </main>
    </div>
  );
}
