import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useData, type StageTemplate } from '@/contexts/DataContext';

interface Stage { id?: string; name: string; color?: string | null; sort_order: number }

const STAGE_COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#a855f7', '#10b981', '#ef4444', '#ec4899', '#14b8a6'];

export function ProjectStagesDialog({
  open, onOpenChange, projectId, projectName,
}: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string; projectName: string }) {
  const { refreshProjects } = useData();
  const [stages, setStages] = useState<Stage[]>([]);
  const [templates, setTemplates] = useState<StageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const load = async () => {
    const { data } = await supabase.from('project_stages').select('*').eq('project_id', projectId).order('sort_order');
    setStages((data || []).map((s: any) => ({ id: s.id, name: s.name, color: s.color, sort_order: s.sort_order })));
    const { data: tpls } = await supabase.from('stage_templates').select('*').order('is_default', { ascending: false });
    setTemplates((tpls || []).map((t: any) => ({
      id: t.id, name: t.name, description: t.description, isDefault: t.is_default,
      stages: Array.isArray(t.stages) ? t.stages : [],
    })));
  };

  useEffect(() => { if (open && projectId) load(); }, [open, projectId]);

  const addStage = () => setStages(s => [...s, { name: 'Nova coluna', color: STAGE_COLORS[s.length % STAGE_COLORS.length], sort_order: s.length }]);
  const updateStage = (idx: number, patch: Partial<Stage>) => setStages(s => s.map((st, i) => i === idx ? { ...st, ...patch } : st));
  const removeStage = (idx: number) => setStages(s => s.filter((_, i) => i !== idx).map((st, i) => ({ ...st, sort_order: i })));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = stages.findIndex((_, i) => `s-${i}` === active.id);
    const newIdx = stages.findIndex((_, i) => `s-${i}` === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    setStages(arrayMove(stages, oldIdx, newIdx).map((s, i) => ({ ...s, sort_order: i })));
  };

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    setStages(tpl.stages.map((s, i) => ({ name: s.name, color: s.color ?? null, sort_order: i })));
    toast.info(`Template "${tpl.name}" carregado. Clique em salvar para aplicar.`);
  };

  const save = async () => {
    if (stages.some(s => !s.name.trim())) { toast.error('Toda coluna precisa de um nome'); return; }
    setLoading(true);
    try {
      // Strategy: load current ids, diff and apply.
      const { data: existing } = await supabase.from('project_stages').select('id').eq('project_id', projectId);
      const existingIds = new Set((existing || []).map((s: any) => s.id));
      const keptIds = new Set(stages.filter(s => s.id).map(s => s.id!));
      const toDelete = Array.from(existingIds).filter(id => !keptIds.has(id as string));
      if (toDelete.length) {
        const { error } = await supabase.from('project_stages').delete().in('id', toDelete as string[]);
        if (error) throw error;
      }
      for (let i = 0; i < stages.length; i++) {
        const s = stages[i];
        if (s.id) {
          const { error } = await supabase.from('project_stages').update({ name: s.name, color: s.color ?? null, sort_order: i }).eq('id', s.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('project_stages').insert([{ project_id: projectId, name: s.name, color: s.color ?? null, sort_order: i, status: 'Pendente' }]);
          if (error) throw error;
        }
      }
      toast.success('Funil atualizado!');
      await refreshProjects();
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message || 'desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Funil do projeto</DialogTitle>
          <DialogDescription>Personalize as colunas do Kanban de <strong>{projectName}</strong>.</DialogDescription>
        </DialogHeader>

        {templates.length > 0 && (
          <div className="rounded-xl border border-border/50 bg-muted/30 p-3 space-y-2">
            <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Carregar a partir de um template</Label>
            <div className="flex flex-wrap gap-2">
              {templates.map(t => (
                <Button key={t.id} size="sm" variant="outline" onClick={() => applyTemplate(t.id)}>
                  {t.name}{t.isDefault ? ' · padrão' : ''}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Colunas (arraste para reordenar)</Label>
            <Button size="sm" variant="outline" onClick={addStage} className="gap-1"><Plus className="h-3 w-3" />Coluna</Button>
          </div>
          {stages.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-xl">
              Sem colunas. Adicione uma ou aplique um template.
            </div>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={stages.map((_, i) => `s-${i}`)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {stages.map((s, i) => (
                  <SortableRow key={s.id || `new-${i}`} id={`s-${i}`} stage={s} onUpdate={p => updateStage(i, p)} onRemove={() => removeStage(i)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={save} disabled={loading}>{loading ? 'Salvando…' : 'Salvar funil'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortableRow({ id, stage, onUpdate, onRemove }: { id: string; stage: Stage; onUpdate: (p: Partial<Stage>) => void; onRemove: () => void }) {
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
