import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/use-profile';

interface ChecklistItem {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  position: number;
}

export function TaskChecklistSection({ taskId, canEdit }: { taskId: string; canEdit: boolean }) {
  const { profile } = useProfile();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('task_checklist_items')
      .select('*')
      .eq('task_id', taskId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    setItems((data ?? []) as ChecklistItem[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [taskId]);

  const addItem = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setSaving(true);
    const { error } = await (supabase as any).from('task_checklist_items').insert({
      task_id: taskId,
      title,
      created_by: profile?.id ?? null,
      position: items.length,
    });
    setSaving(false);
    if (error) { toast.error('Não foi possível adicionar o item.'); return; }
    setNewTitle('');
    toast.success('Item adicionado.');
    load();
  };

  const toggle = async (item: ChecklistItem, checked: boolean) => {
    const { error } = await (supabase as any)
      .from('task_checklist_items')
      .update({ completed: checked, completed_at: checked ? new Date().toISOString() : null })
      .eq('id', item.id);
    if (error) { toast.error('Não foi possível atualizar o item.'); return; }
    toast.success('Checklist atualizado.');
    setItems(prev => prev.map(i => i.id === item.id
      ? { ...i, completed: checked, completed_at: checked ? new Date().toISOString() : null }
      : i));
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from('task_checklist_items').delete().eq('id', id);
    if (error) { toast.error('Não foi possível remover o item.'); return; }
    toast.success('Item removido.');
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const done = items.filter(i => i.completed).length;
  const total = items.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ListChecks className="h-3.5 w-3.5" /> Checklist
        </Label>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {done} de {total} {done === 1 && total === 1 ? 'item concluído' : 'itens concluídos'} · {percent}% concluído
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando checklist...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhum item no checklist.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map(item => (
            <li
              key={item.id}
              className="flex items-start gap-2 p-2 rounded-md border border-border/40 bg-muted/30 group"
            >
              <Checkbox
                checked={item.completed}
                onCheckedChange={v => canEdit && toggle(item, !!v)}
                disabled={!canEdit}
                className="mt-0.5"
              />
              <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                {item.title}
              </span>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => remove(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="flex gap-2">
          <Input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
            placeholder="Novo item do checklist..."
            className="h-9"
            disabled={saving}
          />
          <Button onClick={addItem} disabled={saving || !newTitle.trim()} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      )}
    </div>
  );
}
