import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { LayoutTemplate, Plus, Trash2, Copy, Pencil, Files, X } from 'lucide-react';
import { useOpStore, opStore, type OpTemplate } from '@/lib/operacoes-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { OpPageHeader } from '@/components/operacoes/OpPageHeader';
import { toast } from 'sonner';


export const Route = createFileRoute('/operacoes/modelos')({
  component: OperacoesModelos,
});

function OperacoesModelos() {
  const store = useOpStore();
  const [applyTpl, setApplyTpl] = useState<string | null>(null);
  const [editTpl, setEditTpl] = useState<string | null>(null);

  return (
    <div className="py-8">
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
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" className="flex-1 min-w-[110px]" onClick={() => setApplyTpl(tpl.id)}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Usar
                </Button>
                <Button size="sm" variant="outline" className="flex-1 min-w-[90px]" onClick={() => setEditTpl(tpl.id)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                </Button>
                <Button size="sm" variant="outline" className="flex-1 min-w-[110px]" onClick={() => {
                  const id = opStore.duplicateTemplate(tpl.id);
                  if (id) toast.success(`Modelo "${tpl.name}" duplicado.`);
                }}>
                  <Files className="mr-1 h-3.5 w-3.5" /> Duplicar
                </Button>
              </div>
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
      <EditTemplateDialog templateId={editTpl} onClose={() => setEditTpl(null)} />
    </div>
  );
}

function EditTemplateDialog({ templateId, onClose }: { templateId: string | null; onClose: () => void }) {
  const store = useOpStore();
  const tpl = store.templates.find(t => t.id === templateId) ?? null;
  const [draft, setDraft] = useState<OpTemplate | null>(null);

  useEffect(() => {
    if (tpl) {
      setDraft({
        id: tpl.id,
        name: tpl.name,
        sections: tpl.sections.map(s => ({
          name: s.name,
          tasks: s.tasks.map(t => ({ name: t.name, subtasks: [...(t.subtasks ?? [])] })),
        })),
      });
    } else {
      setDraft(null);
    }
  }, [templateId]);

  if (!tpl || !draft) return null;

  const setSection = (idx: number, patch: Partial<{ name: string; tasks: { name: string; subtasks: string[] }[] }>) => {
    setDraft(d => d ? { ...d, sections: d.sections.map((s, i) => i === idx ? { ...s, ...patch } : s) } : d);
  };

  const updateTask = (si: number, ti: number, patch: Partial<{ name: string; subtasks: string[] }>) => {
    setDraft(d => d ? { ...d, sections: d.sections.map((s, i) => i === si ? {
      ...s,
      tasks: s.tasks.map((t, j) => j === ti ? { ...t, ...patch } : t),
    } : s) } : d);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar modelo</DialogTitle>
          <DialogDescription>Ajuste nome, seções, tarefas e subtarefas. As alterações valem para os próximos projetos criados a partir deste modelo.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Nome do modelo</label>
            <Input value={draft.name} onChange={e => setDraft(d => d ? { ...d, name: e.target.value } : d)} />
          </div>

          <div className="space-y-3">
            {draft.sections.map((sec, si) => (
              <div key={si} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={sec.name}
                    onChange={e => setSection(si, { name: e.target.value })}
                    className="font-medium"
                    placeholder="Nome da seção"
                  />
                  <button
                    onClick={() => setDraft(d => d ? { ...d, sections: d.sections.filter((_, i) => i !== si) } : d)}
                    className="rounded p-1.5 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                    title="Remover seção"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <ul className="mt-2 space-y-2">
                  {sec.tasks.map((task, ti) => (
                    <li key={ti} className="rounded-md border border-border/40 bg-background/40 p-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={task.name}
                          onChange={e => updateTask(si, ti, { name: e.target.value })}
                          className="h-8 text-[12.5px]"
                          placeholder="Descrição da tarefa"
                        />
                        <button
                          onClick={() => setSection(si, { tasks: sec.tasks.filter((_, i) => i !== ti) })}
                          className="text-destructive/70 hover:text-destructive"
                          title="Remover tarefa"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {task.subtasks.length > 0 && (
                        <ul className="mt-2 space-y-1 pl-4 border-l border-border/40">
                          {task.subtasks.map((st, sti) => (
                            <li key={sti} className="flex items-center gap-2">
                              <span className="text-muted-foreground text-[11px]">↳</span>
                              <Input
                                value={st}
                                onChange={e => updateTask(si, ti, { subtasks: task.subtasks.map((x, i) => i === sti ? e.target.value : x) })}
                                className="h-7 text-[11.5px]"
                                placeholder="Sub tarefa"
                              />
                              <button
                                onClick={() => updateTask(si, ti, { subtasks: task.subtasks.filter((_, i) => i !== sti) })}
                                className="text-destructive/70 hover:text-destructive"
                                title="Remover sub tarefa"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-1 h-6 px-2 text-[10.5px] text-muted-foreground"
                        onClick={() => updateTask(si, ti, { subtasks: [...task.subtasks, ''] })}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Adicionar sub tarefa
                      </Button>
                    </li>
                  ))}
                </ul>

                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1 h-7 text-[11.5px]"
                  onClick={() => setSection(si, { tasks: [...sec.tasks, { name: '', subtasks: [] }] })}
                >
                  <Plus className="mr-1 h-3 w-3" /> Adicionar tarefa
                </Button>
              </div>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setDraft(d => d ? { ...d, sections: [...d.sections, { name: 'Nova seção', tasks: [] }] } : d)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Nova seção
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!draft.name.trim()}
            onClick={() => {
              opStore.updateTemplate(draft.id, {
                name: draft.name.trim(),
                sections: draft.sections
                  .map(s => ({
                    name: s.name.trim(),
                    tasks: s.tasks
                      .map(t => ({
                        name: t.name.trim(),
                        subtasks: t.subtasks.map(x => x.trim()).filter(Boolean),
                      }))
                      .filter(t => t.name.length > 0),
                  }))
                  .filter(s => s.name.length > 0),
              });
              toast.success('Modelo atualizado.');
              onClose();
            }}
          >
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
