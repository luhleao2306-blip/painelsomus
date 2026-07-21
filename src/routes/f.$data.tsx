import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Check, Loader2, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { OpForm } from '@/lib/operacoes-store';
import somusLogo from '@/assets/somus-logo.png';

export const Route = createFileRoute('/f/$data')({
  component: PublicFormPage,
  head: () => ({
    meta: [
      { title: 'Formulário — Somus' },
      { name: 'description', content: 'Preencha o formulário enviado pela equipe Somus.' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap',
      },
    ],
  }),
});

function decodeLegacyBase64(raw: string): OpForm | null {
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 ? b64 + '='.repeat(4 - (b64.length % 4)) : b64;
    const json = decodeURIComponent(escape(atob(pad)));
    const parsed = JSON.parse(json);
    if (!parsed?.name || !Array.isArray(parsed?.fields)) return null;
    return parsed as OpForm;
  } catch {
    return null;
  }
}

const FONT_STACK = "'Inter', system-ui, -apple-system, sans-serif";
const SERIF_STACK = "'Instrument Serif', 'Times New Roman', serif";

function PublicFormPage() {
  const { data } = Route.useParams();
  const [form, setForm] = useState<OpForm | null | undefined>(undefined);
  const [token, setToken] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (data.length <= 24) {
        const { data: row, error } = await (supabase as any)
          .rpc('get_public_form_share', { _token: data })
          .maybeSingle();
        if (cancelled) return;
        if (!error && row?.form) {
          setForm(row.form as unknown as OpForm);
          setToken(data);
          return;
        }
      }

      const legacy = decodeLegacyBase64(data);
      if (!cancelled) setForm(legacy);
    })();
    return () => { cancelled = true; };
  }, [data]);

  const submit = async () => {
    if (!form) return;
    setSubmitting(true);
    try {
      if (token) {
        const { error } = await (supabase as any).rpc('submit_public_form', {
          _token: token,
          _form_id: form.id,
          _form_name: form.name,
          _form_snapshot: { id: form.id, name: form.name, fields: form.fields },
          _answers: values,
        });
        if (error) throw error;
      }
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };


  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div
      className="min-h-screen w-full"
      style={{
        fontFamily: FONT_STACK,
        background: '#000',
        color: '#fff',
        backgroundImage:
          'radial-gradient(1200px 600px at 50% -10%, rgba(255,255,255,0.06), transparent 60%)',
      }}
    >
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
          <img src={somusLogo} alt="SOMUS" className="h-6 w-auto brightness-0 invert" />
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60"
          >
            Formulário
          </span>
        </div>
      </header>
      {children}
      <footer className="mx-auto max-w-3xl px-6 pb-10 pt-4">
        <p className="text-center text-[11px] tracking-wide text-white/40">
          Enviado com <span style={{ fontFamily: SERIF_STACK, fontStyle: 'italic' }}>Somus</span> · painelsomus.com
        </p>
      </footer>
    </div>
  );

  if (form === undefined) {
    return (
      <Shell>
        <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-6">
          <Loader2 className="h-6 w-6 animate-spin text-white/50" />
        </main>
      </Shell>
    );
  }

  if (!form) {
    return (
      <Shell>
        <main className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center backdrop-blur">
            <h1 className="text-2xl font-semibold tracking-tight">
              Link{' '}
              <span style={{ fontFamily: SERIF_STACK, fontStyle: 'italic', fontWeight: 400 }}>
                inválido
              </span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/60">
              Este formulário não pôde ser carregado ou expirou. Peça um novo link à equipe.
            </p>
          </div>
        </main>
      </Shell>
    );
  }

  if (submitted) {
    return (
      <Shell>
        <main className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center backdrop-blur">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <Check className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">
              Respostas{' '}
              <span style={{ fontFamily: SERIF_STACK, fontStyle: 'italic', fontWeight: 400 }} className="text-white/70">
                enviadas
              </span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/60">
              Obrigado! Suas respostas foram enviadas com sucesso para a equipe Somus. Você já pode fechar esta página.
            </p>
          </div>
        </main>
      </Shell>
    );
  }


  return (
    <Shell>
      <main className="mx-auto max-w-3xl px-6 pt-12 pb-6">
        {/* Editorial hero */}
        <div className="mb-10">
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/50">
            Somus · Formulário
          </div>
          <h1
            className="mt-4 text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl"
          >
            {form.name}
            <span
              style={{ fontFamily: SERIF_STACK, fontStyle: 'italic', fontWeight: 400 }}
              className="ml-2 text-white/50"
            >
              .
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60">
            Preencha os campos abaixo com atenção. Ao concluir, suas respostas serão enviadas
            diretamente para a equipe Somus.
          </p>

        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
          <div className="space-y-6 px-6 py-8 sm:px-8">
            {form.fields.map((f, i) => (
              <div key={f.id} className="grid gap-2">
                <label className="flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                  <span className="text-white/30">{String(i + 1).padStart(2, '0')}</span>
                  <span>{f.label}</span>
                </label>
                <div>
                  {f.type === 'texto_curto' && (
                    <Input
                      value={values[f.id] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))}
                      className="h-11 rounded-lg border-white/15 bg-black/40 text-white placeholder:text-white/30 focus-visible:border-white/40 focus-visible:ring-0"
                    />
                  )}
                  {f.type === 'texto_longo' && (
                    <Textarea
                      rows={4}
                      value={values[f.id] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))}
                      className="rounded-lg border-white/15 bg-black/40 text-white placeholder:text-white/30 focus-visible:border-white/40 focus-visible:ring-0"
                    />
                  )}
                  {f.type === 'data' && (
                    <Input
                      type="date"
                      value={values[f.id] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))}
                      className="h-11 rounded-lg border-white/15 bg-black/40 text-white [color-scheme:dark] focus-visible:border-white/40 focus-visible:ring-0"
                    />
                  )}
                  {f.type === 'checkbox' && (
                    <label className="inline-flex cursor-pointer items-center gap-2.5 text-[13px] text-white/80">
                      <input
                        type="checkbox"
                        checked={!!values[f.id]}
                        onChange={e => setValues(v => ({ ...v, [f.id]: e.target.checked }))}
                        className="h-4 w-4 rounded border-white/30 bg-black/40 accent-white"
                      />
                      <span>Marque se aplicável</span>
                    </label>
                  )}
                  {f.type === 'upload' && (
                    <>
                      <Input
                        type="file"
                        onChange={e => setValues(v => ({ ...v, [f.id]: e.target.files?.[0]?.name }))}
                        className="h-11 rounded-lg border-white/15 bg-black/40 text-white file:mr-3 file:rounded file:border-0 file:bg-white file:px-3 file:py-1 file:text-xs file:font-semibold file:text-black focus-visible:border-white/40 focus-visible:ring-0"
                      />
                      <p className="mt-1.5 text-[11px] text-white/40">
                        Anote o nome do arquivo e envie-o em separado à equipe.
                      </p>
                    </>
                  )}
                  {f.type === 'multipla_escolha' && (
                    <Select
                      value={values[f.id] ?? ''}
                      onValueChange={val => setValues(v => ({ ...v, [f.id]: val }))}
                    >
                      <SelectTrigger className="h-11 rounded-lg border-white/15 bg-black/40 text-white focus:ring-0">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-zinc-950 text-white">
                        {(f.options ?? []).map(o => (
                          <SelectItem key={o} value={o} className="focus:bg-white/10 focus:text-white">
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 px-6 py-5 sm:px-8">
            <Button
              size="lg"
              disabled={submitting}
              onClick={submit}
              className="group h-12 w-full rounded-full bg-white text-[13px] font-semibold uppercase tracking-[0.14em] text-black hover:bg-white/90 disabled:opacity-70"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…</>
              ) : (
                <>Enviar respostas <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>
              )}
            </Button>
          </div>

        </div>
      </main>
    </Shell>
  );
}
