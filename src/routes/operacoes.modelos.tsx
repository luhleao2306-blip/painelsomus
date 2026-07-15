import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { LayoutTemplate, Plus, Trash2, Copy } from 'lucide-react';
import { useOpStore, opStore } from '@/lib/operacoes-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export const Route = createFileRoute('/operacoes/modelos')({
  component: OperacoesModelos,
});

function OperacoesModelos() {
  const store = useOpStore();
  const [applyTpl, setApplyTpl] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-10">
      <OpPageHeader
        eyebrow="Playbooks da alcateia"
        title="Modelos"
        description="Templates reutilizáveis de projeto. Um clique e a operação inteira nasce pronta."
        icon={<LayoutTemplate className="h-4 w-4" />}
      />


      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {store.templates.map(tpl => {
          const totalTasks = tpl.sections.reduce((n, s) => n + s.tasks.length, 0);
          return (
            <div key={tpl.id} className="flex flex-col rounded-xl border border-border/60 bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <LayoutTemplate className="h-5 w-5" />
                </div>
                <button
                  onClick={() => { if (confirm(`Excluir modelo "${tpl.name}"?`)) opStore.removeTemplate(tpl.id); }}
                  className="rounded p-1 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <h3 className="font-display text-base font-semibold">{tpl.name}</h3>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                {tpl.sections.length} seções · {totalTasks} tarefas
              </p>
              <ul className="mt-3 space-y-0.5">
                {tpl.sections.slice(0, 5).map(s => (
                  <li key={s.name} className="truncate text-[11.5px] text-muted-foreground">
                    · {s.name} <span className="text-muted-foreground/60">({s.tasks.length})</span>
                  </li>
                ))}
              </ul>
              <Button size="sm" className="mt-4" onClick={() => setApplyTpl(tpl.id)}>
                <Copy className="mr-1 h-3.5 w-3.5" /> Usar este modelo
              </Button>
            </div>
          );
        })}
        {store.templates.length === 0 && (
          <p className="col-span-full rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            Nenhum modelo — salve um projeto como modelo em Pastas & Projetos.
          </p>
        )}
      </div>

      <ApplyTemplateDialog templateId={applyTpl} onClose={() => setApplyTpl(null)} />
    </div>
  );
}

function ApplyTemplateDialog({ templateId, onClose }: { templateId: string | null; onClose: () => void }) {
  const store = useOpStore();
  const tpl = store.templates.find(t => t.id === templateId);
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState(store.folders[0]?.id ?? '');
  if (!tpl) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Usar modelo: {tpl.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Nome do novo projeto</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: [Cliente Fulano] Agente IA SDR + LP" />
          </div>
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Pasta de destino</label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger><SelectValue placeholder="Selecione uma pasta" /></SelectTrigger>
              <SelectContent>
                {store.folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {store.folders.length === 0 && <p className="mt-1 text-[11px] text-destructive">Crie uma pasta em Pastas & Projetos primeiro.</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!name.trim() || !folderId}
            onClick={() => {
              opStore.applyTemplate(tpl.id, folderId, name.trim());
              onClose();
            }}
          >
            Criar projeto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
