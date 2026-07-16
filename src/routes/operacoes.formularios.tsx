import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { ClipboardList, Plus, Trash2, FileText, X, Link as LinkIcon, Copy } from 'lucide-react';
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
import { toast } from 'sonner';

function buildShareLink(form: OpForm): string {
  const json = JSON.stringify({ id: form.id, name: form.name, fields: form.fields });
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${window.location.origin}/f/${b64}`;
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

function OperacoesFormularios() {
  const store = useOpStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fillingId, setFillingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-10">
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

      {store.formAnswers.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-base font-semibold mb-3">Respostas preenchidas</h2>
          <div className="space-y-2">
            {store.formAnswers.map(a => {
              const form = store.forms.find(f => f.id === a.formId);
              const project = store.projects.find(p => p.id === a.projectId);
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-[12.5px] font-medium">{form?.name ?? 'Formulário removido'}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {project?.name ?? 'Sem projeto'} · {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <FormBuilderDialog formId={editingId} onClose={() => setEditingId(null)} />
      <FormFillDialog formId={fillingId} onClose={() => setFillingId(null)} />
      <ShareLinkDialog formId={sharingId} onClose={() => setSharingId(null)} />
    </div>
  );
}

function ShareLinkDialog({ formId, onClose }: { formId: string | null; onClose: () => void }) {
  const store = useOpStore();
  const form = store.forms.find(f => f.id === formId);
  if (!form) return null;
  const url = buildShareLink(form);
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast.success('Link copiado! Envie ao cliente.');
  };
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Olá! Por favor preencha este formulário: ${form.name}\n${url}`)}`;
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
          <Input readOnly value={url} onFocus={e => e.currentTarget.select()} className="text-[12px]" />
          <Button onClick={copy}><Copy className="h-3.5 w-3.5" /></Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Após preencher, o cliente copia as respostas e devolve pelo canal habitual (WhatsApp/e-mail).
        </p>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" asChild>
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
