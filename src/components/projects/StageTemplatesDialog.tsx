import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, Pencil, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TemplateStage { name: string; color?: string | null }
interface Template {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  stages: TemplateStage[];
}

const STAGE_COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#a855f7', '#10b981', '#ef4444', '#ec4899', '#14b8a6'];

export function StageTemplatesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from('stage_templates').select('*').order('is_default', { ascending: false }).order('created_at');
    if (error) { toast.error('Erro ao carregar templates'); return; }
    setTemplates((data as any[]).map(t => ({
      id: t.id, name: t.name, description: t.description, isDefault: t.is_default,
      stages: Array.isArray(t.stages) ? t.stages : [],
    })));
  };

  useEffect(() => { if (open) load(); }, [open]);

  const startNew = () => setEditing({ id: '', name: '', description: '', isDefault: false, stages: [{ name: 'Backlog', color: '#94a3b8' }] });

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error('Informe um nome'); return; }
    if (editing.stages.length === 0) { toast.error('Adicione pelo menos uma etapa'); return; }
    setLoading(true);
    try {
      const payload: any = {
        name: editing.name,
        description: editing.description,
        is_default: editing.isDefault,
        stages: editing.stages as any,
      };
      if (editing.id) {
        const { error } = await supabase.from('stage_templates').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('stage_templates').insert([payload]);
        if (error) throw error;
      }
      toast.success('Template salvo!');
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error('Erro: ' + (e?.message || 'desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir este template?')) return;
    const { error } = await supabase.from('stage_templates').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Excluído');
    await load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Templates de Funil</DialogTitle>
          <DialogDescription>Crie funis reutilizáveis para aplicar em novos projetos.</DialogDescription>
        </DialogHeader>

        {!editing ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={startNew} className="gap-2"><Plus className="h-4 w-4" />Novo template</Button>
            </div>
            {templates.length === 0 && (
              <div className="text-center py-10 text-sm text-muted-foreground border border-dashed rounded-xl">Nenhum template ainda.</div>
            )}
            {templates.map(t => (
              <div key={t.id} className="border border-border/50 rounded-xl p-4 hover:border-foreground/30 transition-colors">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold truncate">{t.name}</h3>
                      {t.isDefault && <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3" />Padrão</Badge>}
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(t)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {t.stages.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border" style={{ borderColor: (s.color || '#94a3b8') + '40', background: (s.color || '#94a3b8') + '15', color: s.color || undefined }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color || '#94a3b8' }} />
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <TemplateEditor template={editing} onChange={setEditing} />
        )}

        <DialogFooter>
          {editing ? (
            <>
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={loading}>Voltar</Button>
              <Button onClick={save} disabled={loading}>{loading ? 'Salvando…' : 'Salvar template'}</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateEditor({ template, onChange }: { template: Template; onChange: (t: Template) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = template.stages.findIndex((_, i) => `s-${i}` === active.id);
    const newIdx = template.stages.findIndex((_, i) => `s-${i}` === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onChange({ ...template, stages: arrayMove(template.stages, oldIdx, newIdx) });
  };

  const addStage = () => onChange({ ...template, stages: [...template.stages, { name: 'Nova etapa', color: STAGE_COLORS[template.stages.length % STAGE_COLORS.length] }] });
  const updateStage = (idx: number, patch: Partial<TemplateStage>) => {
    const next = template.stages.map((s, i) => i === idx ? { ...s, ...patch } : s);
    onChange({ ...template, stages: next });
  };
  const removeStage = (idx: number) => onChange({ ...template, stages: template.stages.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input value={template.name} onChange={e => onChange({ ...template, name: e.target.value })} placeholder="Ex: Padrão Consultoria" />
        </div>
        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Textarea value={template.description ?? ''} onChange={e => onChange({ ...template, description: e.target.value })} rows={2} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={template.isDefault} onChange={e => onChange({ ...template, isDefault: e.target.checked })} />
          Marcar como template padrão
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Colunas do funil (arraste para reordenar)</Label>
          <Button size="sm" variant="outline" onClick={addStage} className="gap-1"><Plus className="h-3 w-3" />Coluna</Button>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={template.stages.map((_, i) => `s-${i}`)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {template.stages.map((s, i) => (
                <SortableStageRow
                  key={i}
                  id={`s-${i}`}
                  stage={s}
                  onUpdate={(patch) => updateStage(i, patch)}
                  onRemove={() => removeStage(i)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function SortableStageRow({ id, stage, onUpdate, onRemove }: { id: string; stage: TemplateStage; onUpdate: (p: Partial<TemplateStage>) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className="flex items-center gap-2 rounded-lg border border-border/60 bg-card p-2">
      <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="h-4 w-4 rounded-full shrink-0 border" style={{ background: stage.color || '#94a3b8' }} />
      <Input value={stage.name} onChange={e => onUpdate({ name: e.target.value })} className="h-8" />
      <div className="flex gap-1">
        {STAGE_COLORS.map(c => (
          <button key={c} type="button" onClick={() => onUpdate({ color: c })}
            className={`h-5 w-5 rounded-full border-2 ${stage.color === c ? 'border-foreground' : 'border-transparent'}`}
            style={{ background: c }} />
        ))}
      </div>
      <Button size="icon" variant="ghost" onClick={onRemove}><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </div>
  );
}
