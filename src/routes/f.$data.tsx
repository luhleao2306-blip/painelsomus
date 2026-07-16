import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Check, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { OpForm } from '@/lib/operacoes-store';
import somusLogo from '@/assets/somus-logo.png.asset.json';

export const Route = createFileRoute('/f/$data')({
  component: PublicFormPage,
  head: () => ({
    meta: [
      { title: 'Formulário — Somus' },
      { name: 'description', content: 'Preencha o formulário enviado pela equipe Somus.' },
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

function PublicFormPage() {
  const { data } = Route.useParams();
  const [form, setForm] = useState<OpForm | null | undefined>(undefined); // undefined = loading
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Short token (<= 24 chars): look up in DB
      if (data.length <= 24) {
        const { data: row, error } = await supabase
          .from('public_form_shares')
          .select('form')
          .eq('token', data)
          .maybeSingle();
        if (cancelled) return;
        if (!error && row?.form) {
          setForm(row.form as unknown as OpForm);
          return;
        }
      }
      // Fallback: legacy base64-encoded link
      const legacy = decodeLegacyBase64(data);
      if (!cancelled) setForm(legacy);
    })();
    return () => { cancelled = true; };
  }, [data]);

  const responseText = useMemo(() => {
    if (!form) return '';
    return form.fields.map(f => {
      const v = values[f.id];
      const shown = typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : (v ?? '—');
      return `${f.label}:\n${shown}`;
    }).join('\n\n');
  }, [form, values]);

  const copyAnswers = async () => {
    if (!form) return;
    const text = `Respostas — ${form.name}\n\n${responseText}`;
    await navigator.clipboard.writeText(text);
    toast.success('Respostas copiadas! Envie para a equipe.');
  };

  if (form === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_hsl(var(--muted))_0%,_hsl(var(--background))_60%)]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_hsl(var(--muted))_0%,_hsl(var(--background))_60%)]">
        <div className="max-w-md text-center rounded-2xl border border-border/60 bg-card p-8 shadow-sm">
          <img src={somusLogo.url} alt="Somus" className="mx-auto mb-4 h-10 w-auto" />
          <h1 className="font-display text-xl font-semibold">Link inválido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este formulário não pôde ser carregado ou expirou. Peça um novo link à equipe.
          </p>
        </div>
      </div>
    );
  }

  const Header = (
    <header className="border-b border-border/60 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
        <img src={somusLogo.url} alt="Somus" className="h-8 w-auto" />
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Formulário
        </span>
      </div>
    </header>
  );

  if (submitted) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_hsl(var(--muted))_0%,_hsl(var(--background))_60%)]">
        {Header}
        <main className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-600">
              <Check className="h-5 w-5" />
              <h1 className="font-display text-lg font-semibold">Respostas registradas</h1>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Copie suas respostas e envie de volta para a equipe pelo canal habitual (WhatsApp/e-mail).
            </p>
            <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/40 p-3 text-[12px] max-h-80 overflow-auto">
{responseText}
            </pre>
            <div className="mt-4 flex gap-2">
              <Button onClick={copyAnswers} className="flex-1">
                <Copy className="mr-1 h-3.5 w-3.5" /> Copiar respostas
              </Button>
              <Button variant="outline" onClick={() => setSubmitted(false)}>Editar</Button>
            </div>
          </div>
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Enviado com Somus · painelsomus.com
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_hsl(var(--muted))_0%,_hsl(var(--background))_60%)]">
      {Header}
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border/60 bg-gradient-to-b from-muted/40 to-transparent px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold leading-tight">{form.name}</h1>
                <p className="text-[12px] text-muted-foreground">Preencha os campos abaixo e envie as respostas.</p>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-6 py-6">
            {form.fields.map(f => (
              <div key={f.id}>
                <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{f.label}</label>
                <div className="mt-1.5">
                  {f.type === 'texto_curto' && <Input value={values[f.id] ?? ''} onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))} />}
                  {f.type === 'texto_longo' && <Textarea rows={4} value={values[f.id] ?? ''} onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))} />}
                  {f.type === 'data' && <Input type="date" value={values[f.id] ?? ''} onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))} />}
                  {f.type === 'checkbox' && (
                    <label className="mt-1 inline-flex items-center gap-2 text-[13px]">
                      <input type="checkbox" checked={!!values[f.id]} onChange={e => setValues(v => ({ ...v, [f.id]: e.target.checked }))} className="h-4 w-4 rounded border-border" />
                      <span className="text-muted-foreground">Marque se aplicável</span>
                    </label>
                  )}
                  {f.type === 'upload' && (
                    <>
                      <Input type="file" onChange={e => setValues(v => ({ ...v, [f.id]: e.target.files?.[0]?.name }))} />
                      <p className="mt-1 text-[10.5px] text-muted-foreground">Anote o nome do arquivo aqui e envie o arquivo em separado para a equipe.</p>
                    </>
                  )}
                  {f.type === 'multipla_escolha' && (
                    <Select value={values[f.id] ?? ''} onValueChange={val => setValues(v => ({ ...v, [f.id]: val }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {(f.options ?? []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border/60 bg-muted/20 px-6 py-4">
            <Button className="w-full" size="lg" onClick={() => setSubmitted(true)}>
              Concluir e ver respostas
            </Button>
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Enviado com Somus · painelsomus.com
        </p>
      </main>
    </div>
  );
}
