import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { ClipboardList, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { OpForm } from '@/lib/operacoes-store';

export const Route = createFileRoute('/f/$data')({
  component: PublicFormPage,
  head: () => ({
    meta: [
      { title: 'Formulário — Somus' },
      { name: 'description', content: 'Preencha o formulário enviado pela equipe Somus.' },
    ],
  }),
});

function decodeForm(raw: string): OpForm | null {
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
  const form = useMemo(() => decodeForm(data), [data]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-xl font-semibold">Link inválido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este formulário não pôde ser carregado. Peça um novo link à equipe.
          </p>
        </div>
      </div>
    );
  }

  const responseText = form.fields.map(f => {
    const v = values[f.id];
    const shown = typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : (v ?? '—');
    return `${f.label}:\n${shown}`;
  }).join('\n\n');

  const copyAnswers = async () => {
    const text = `Respostas — ${form.name}\n\n${responseText}`;
    await navigator.clipboard.writeText(text);
    toast.success('Respostas copiadas! Envie para a equipe.');
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <div className="max-w-lg w-full rounded-xl border border-border/60 bg-card p-6 shadow-sm">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="mx-auto max-w-2xl rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2 border-b border-border/60 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold">{form.name}</h1>
            <p className="text-[11px] text-muted-foreground">Preencha os campos abaixo e envie as respostas.</p>
          </div>
        </div>

        <div className="space-y-4">
          {form.fields.map(f => (
            <div key={f.id}>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</label>
              <div className="mt-1">
                {f.type === 'texto_curto' && <Input value={values[f.id] ?? ''} onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))} />}
                {f.type === 'texto_longo' && <Textarea rows={3} value={values[f.id] ?? ''} onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))} />}
                {f.type === 'data' && <Input type="date" value={values[f.id] ?? ''} onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))} />}
                {f.type === 'checkbox' && <input type="checkbox" checked={!!values[f.id]} onChange={e => setValues(v => ({ ...v, [f.id]: e.target.checked }))} className="h-4 w-4" />}
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

        <Button className="mt-6 w-full" onClick={() => setSubmitted(true)}>
          Concluir e ver respostas
        </Button>
      </div>
    </div>
  );
}
