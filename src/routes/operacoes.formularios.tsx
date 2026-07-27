import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, Trash2, FileText, X, Link as LinkIcon, Copy, Inbox, Download, Eye, CheckCircle2, Clock } from 'lucide-react';
import { useOpStore, opStore, type OpForm, type OpFormField } from '@/lib/operacoes-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { OpPageHeader } from '@/components/operacoes/OpPageHeader';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

import { supabase } from '@/integrations/supabase/client';


function shortToken(len = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join('');
}

async function buildShareLink(form: OpForm): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const token = shortToken(8);
  const { error } = await supabase.from('public_form_shares').insert({
    token,
    form: { id: form.id, name: form.name, fields: form.fields } as any,
    created_by: userData.user?.id ?? null,
  });
  if (error) throw error;
  return `${window.location.origin}/f/${token}`;
}


export const Route = createFileRoute('/operacoes/formularios')({
  component: OperacoesFormularios,
});

const FIELD_TYPES: { v: OpFormField['type']; label: string }[] = [
  { v: 'texto_curto',      label: 'Texto curto' },
  { v: 'texto_longo',      label: 'Texto longo' },
  { v: 'multipla_escolha', label: 'Múltipla escolha' },
  { v: 'data',             label: 'Data' },
  { v: 'upload',           label: 'Upload de arquivo' },
  { v: 'checkbox',         label: 'Checkbox' },
];

type ShareRow = { token: string; form: any; created_at: string };
type SubmissionRow = {
  id: string;
  token: string;
  form_id: string | null;
  form_name: string | null;
  form_snapshot: any;
  answers: Record<string, any>;
  submitted_at: string;
};

function OperacoesFormularios() {
  const store = useOpStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fillingId, setFillingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [viewing, setViewing] = useState<SubmissionRow | null>(null);

  const loadShares = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const [{ data: sh }, { data: sub }] = await Promise.all([
      supabase.from('public_form_shares').select('token, form, created_at').eq('created_by', userData.user.id).order('created_at', { ascending: false }),
      supabase.from('public_form_submissions').select('*').order('submitted_at', { ascending: false }),
    ]);
    setShares((sh ?? []) as any);
    setSubmissions((sub ?? []) as any);
  }, []);

  useEffect(() => { loadShares(); }, [loadShares]);

  const submissionsByToken = (t: string) => submissions.filter(s => s.token === t);

  return (
    <div className="py-8">
      <OpPageHeader
        eyebrow="Coleta de campo"
        title="Formulários"
        description="Construa briefings, entradas de tráfego e checklists — cada resposta amarra num projeto."
        icon={<ClipboardList className="h-4 w-4" />}
        actions={
          <Button size="sm" onClick={() => {
            const name = prompt('Nome do formulário:');
            if (name?.trim()) {
              const id = opStore.addForm(name.trim());
              setEditingId(id);
            }
          }}><Plus className="mr-1 h-3.5 w-3.5" /> Novo formulário</Button>
        }
      />


      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {store.forms.map(f => (
          <div key={f.id} className="rounded-xl border border-border/60 bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <ClipboardList className="h-4 w-4 text-primary" />
              <button onClick={() => { if (confirm(`Excluir "${f.name}"?`)) opStore.removeForm(f.id); }} className="text-destructive/70 hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <h3 className="font-display text-[15px] font-semibold">{f.name}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{f.fields.length} campos</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {store.formAnswers.filter(a => a.formId === f.id).length} respostas
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="flex-1 min-w-[90px]" onClick={() => setEditingId(f.id)}>Editar</Button>
              <Button size="sm" variant="outline" className="flex-1 min-w-[90px]" onClick={() => setSharingId(f.id)}>
                <LinkIcon className="mr-1 h-3.5 w-3.5" /> Link
              </Button>
              <Button size="sm" className="flex-1 min-w-[90px]" onClick={() => setFillingId(f.id)}>Preencher</Button>
            </div>
          </div>
        ))}
        {store.forms.length === 0 && (
          <p className="col-span-full rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            Nenhum formulário ainda.
          </p>
        )}
      </div>

      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold flex items-center gap-2"><Inbox className="h-4 w-4" /> Links enviados</h2>
            <p className="text-[11px] text-muted-foreground">Acompanhe o status de cada link compartilhado com clientes.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={loadShares}>Atualizar</Button>
        </div>
        {shares.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-[12px] text-muted-foreground">
            Nenhum link enviado ainda. Clique em "Link" no formulário para gerar um.
          </p>
        ) : (
          <div className="space-y-2">
            {shares.map(sh => {
              const subs = submissionsByToken(sh.token);
              const answered = subs.length > 0;
              const latest = subs[0];
              return (
                <div key={sh.token} className="rounded-lg border border-border/60 bg-card p-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-[12.5px] font-medium">{sh.form?.name ?? 'Formulário'}</p>
                      <p className="text-[10.5px] text-muted-foreground font-mono">
                        /f/{sh.token} · enviado em {new Date(sh.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {answered ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Recebido{subs.length > 1 ? ` (${subs.length})` : ''}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0">
                        <Clock className="mr-1 h-3 w-3" /> Aguardando
                      </Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/f/${sh.token}`);
                      toast.success('Link copiado');
                    }}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    {answered && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setViewing(latest)}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> Ver
                        </Button>
                        <Button size="sm" onClick={() => exportSubmissionPDF(latest)}>
                          <Download className="mr-1 h-3.5 w-3.5" /> PDF
                        </Button>
                      </>
                    )}
                  </div>
                  {answered && subs.length > 1 && (
                    <div className="mt-2 pl-7 space-y-1">
                      {subs.slice(1).map(s => (
                        <div key={s.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>· Resposta de {new Date(s.submitted_at).toLocaleString('pt-BR')}</span>
                          <button onClick={() => setViewing(s)} className="underline hover:text-foreground">ver</button>
                          <button onClick={() => exportSubmissionPDF(s)} className="underline hover:text-foreground">PDF</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FormBuilderDialog formId={editingId} onClose={() => setEditingId(null)} />
      <FormFillDialog formId={fillingId} onClose={() => setFillingId(null)} />
      <ShareLinkDialog formId={sharingId} onClose={() => { setSharingId(null); loadShares(); }} />
      <SubmissionViewDialog submission={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function formatAnswer(v: any): string {
  if (v === undefined || v === null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

function exportSubmissionPDF(sub: SubmissionRow) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 60;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SOMUS', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('Formulário respondido', pageW - marginX, y, { align: 'right' });
  doc.setTextColor(0);

  y += 26;
  doc.setDrawColor(220);
  doc.line(marginX, y, pageW - marginX, y);

  y += 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(sub.form_name ?? 'Formulário', marginX, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Recebido em ${new Date(sub.submitted_at).toLocaleString('pt-BR')}`, marginX, y);
  doc.setTextColor(0);
  y += 24;

  const fields: { id: string; label: string }[] = (sub.form_snapshot?.fields ?? []) as any;
  fields.forEach((f, i) => {
    const val = formatAnswer(sub.answers?.[f.id]);
    const label = `${String(i + 1).padStart(2, '0')}. ${f.label}`;
    if (y > pageH - 80) { doc.addPage(); y = 60; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(label, marginX, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(val, pageW - marginX * 2);
    lines.forEach((ln: string) => {
      if (y > pageH - 60) { doc.addPage(); y = 60; }
      doc.text(ln, marginX, y);
      y += 14;
    });
    y += 10;
  });

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Enviado com Somus · painelsomus.com', pageW / 2, pageH - 24, { align: 'center' });

  doc.save(`${(sub.form_name ?? 'formulario').replace(/\s+/g, '_')}_${sub.id.slice(0, 6)}.pdf`);
}

function SubmissionViewDialog({ submission, onClose }: { submission: SubmissionRow | null; onClose: () => void }) {
  if (!submission) return null;
  const fields: { id: string; label: string }[] = (submission.form_snapshot?.fields ?? []) as any;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{submission.form_name ?? 'Formulário'}</DialogTitle>
          <DialogDescription>
            Recebido em {new Date(submission.submitted_at).toLocaleString('pt-BR')}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-4">
          {fields.map((f, i) => (
            <div key={f.id} className="rounded-md border border-border/60 p-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                {String(i + 1).padStart(2, '0')} · {f.label}
              </p>
              <p className="mt-1 text-[13px] whitespace-pre-wrap">{formatAnswer(submission.answers?.[f.id])}</p>
            </div>
          ))}
          {fields.length === 0 && (
            <pre className="text-[12px] whitespace-pre-wrap">{JSON.stringify(submission.answers, null, 2)}</pre>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => exportSubmissionPDF(submission)}>
            <Download className="mr-2 h-4 w-4" /> Exportar PDF
          </Button>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function ShareLinkDialog({ formId, onClose }: { formId: string | null; onClose: () => void }) {
  const store = useOpStore();
  const form = store.forms.find(f => f.id === formId);
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    if (!form) return;
    setUrl('');
    buildShareLink(form)
      .then(u => setUrl(u))
      .catch(err => { toast.error('Não foi possível gerar o link.'); console.error(err); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  if (!form) return null;
  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success('Link copiado! Envie ao cliente.');
  };
  const whatsapp = url ? `https://wa.me/?text=${encodeURIComponent(`Olá! Por favor preencha este formulário: ${form.name}\n${url}`)}` : '#';
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Link do formulário</DialogTitle>
          <DialogDescription>
            Envie este link para o cliente preencher. Ele abrirá uma página pública com os campos do formulário "{form.name}".
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input readOnly value={url || 'Gerando link…'} onFocus={e => e.currentTarget.select()} className="text-[12px]" />
          <Button onClick={copy} disabled={!url}><Copy className="h-3.5 w-3.5" /></Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Após preencher, o cliente copia as respostas e devolve pelo canal habitual (WhatsApp/e-mail).
        </p>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" asChild disabled={!url}>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">Enviar por WhatsApp</a>
          </Button>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormBuilderDialog({ formId, onClose }: { formId: string | null; onClose: () => void }) {
  const store = useOpStore();
  const form = store.forms.find(f => f.id === formId);
  const [type, setType] = useState<OpFormField['type']>('texto_curto');
  const [label, setLabel] = useState('');
  const [options, setOptions] = useState('');
  if (!form) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Editar: {form.name}</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {form.fields.map(field => (
            <div key={field.id} className="flex items-center gap-2 rounded border border-border/60 bg-muted/20 px-2 py-1.5 text-[12px]">
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{FIELD_TYPES.find(t => t.v === field.type)?.label}</span>
              <span className="flex-1">{field.label}</span>
              <button onClick={() => opStore.removeFormField(form.id, field.id)} className="text-destructive/70 hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {form.fields.length === 0 && <p className="text-[11px] italic text-muted-foreground">Sem campos ainda.</p>}
        </div>

        <div className="border-t border-border/60 pt-3">
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Adicionar campo</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Rótulo do campo" className="flex-1" />
          </div>
          {type === 'multipla_escolha' && (
            <Input value={options} onChange={e => setOptions(e.target.value)} placeholder="Opções separadas por vírgula" className="mt-2" />
          )}
          <Button size="sm" className="mt-2" onClick={() => {
            if (label.trim()) {
              opStore.addFormField(form.id, {
                type, label: label.trim(),
                options: type === 'multipla_escolha' ? options.split(',').map(s => s.trim()).filter(Boolean) : undefined,
              });
              setLabel(''); setOptions('');
            }
          }}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
        <DialogFooter><Button onClick={onClose}>Concluir</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormFillDialog({ formId, onClose }: { formId: string | null; onClose: () => void }) {
  const store = useOpStore();
  const form = store.forms.find(f => f.id === formId);
  const [values, setValues] = useState<Record<string, any>>({});
  const [projectId, setProjectId] = useState<string>('__none');
  if (!form) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{form.name}</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Projeto (opcional)</label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sem projeto</SelectItem>
                {store.projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {form.fields.map(f => (
            <div key={f.id}>
              <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</label>
              {f.type === 'texto_curto' && <Input value={values[f.id] ?? ''} onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))} />}
              {f.type === 'texto_longo' && <Textarea value={values[f.id] ?? ''} onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))} rows={3} />}
              {f.type === 'data' && <Input type="date" value={values[f.id] ?? ''} onChange={e => setValues(v => ({ ...v, [f.id]: e.target.value }))} />}
              {f.type === 'checkbox' && <input type="checkbox" checked={!!values[f.id]} onChange={e => setValues(v => ({ ...v, [f.id]: e.target.checked }))} className="ml-2 h-4 w-4" />}
              {f.type === 'upload' && <Input type="file" onChange={e => setValues(v => ({ ...v, [f.id]: e.target.files?.[0]?.name }))} />}
              {f.type === 'multipla_escolha' && (
                <Select value={values[f.id] ?? ''} onValueChange={val => setValues(v => ({ ...v, [f.id]: val }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(f.options ?? []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            opStore.submitFormAnswer(form.id, projectId === '__none' ? undefined : projectId, values);
            onClose();
          }}>Salvar resposta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
