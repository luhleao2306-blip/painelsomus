import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Check, Plus, Trash2, ListTodo, CheckCircle2, Circle, Tag, Pencil, X, Flag, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Priority = 'P1' | 'P2' | 'P3';

type Item = {
  id: string;
  text: string;
  completed: boolean;
  completed_at: string | null;
  position: number;
  category_id: string | null;
  priority: Priority;
};

type Category = {
  id: string;
  name: string;
  color: string;
  position: number;
};

type Filter = 'open' | 'done' | 'all';

const PRIORITY_META: Record<Priority, { label: string; className: string; dot: string }> = {
  P1: { label: 'P1', className: 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400', dot: 'bg-red-500' },
  P2: { label: 'P2', className: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  P3: { label: 'P3', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
};

const PRIORITY_ORDER: Priority[] = ['P1', 'P2', 'P3'];

const COLOR_PRESETS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#64748b',
];

export function PersonalChecklistPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('open');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [draft, setDraft] = useState('');
  const [draftPriority, setDraftPriority] = useState<Priority>('P3');
  const [draftCategory, setDraftCategory] = useState<string>('none');
  const [adding, setAdding] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState(COLOR_PRESETS[11]);

  const load = async () => {
    setLoading(true);
    const [itemsRes, catsRes] = await Promise.all([
      (supabase as any)
        .from('personal_checklist_items')
        .select('id, text, completed, completed_at, position, category_id, priority')
        .order('completed', { ascending: true })
        .order('priority', { ascending: true })
        .order('position', { ascending: true })
        .order('created_at', { ascending: false }),
      (supabase as any)
        .from('personal_checklist_categories')
        .select('id, name, color, position')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true }),
    ]);
    if (itemsRes.error || catsRes.error) {
      toast.error('Erro ao carregar check-list');
    } else {
      setItems((itemsRes.data ?? []) as Item[]);
      setCategories((catsRes.data ?? []) as Category[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addItem = async () => {
    const text = draft.trim();
    if (!text) return;
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Sessão expirada');
      setAdding(false);
      return;
    }
    const { data, error } = await (supabase as any)
      .from('personal_checklist_items')
      .insert({
        text,
        user_id: user.id,
        position: items.length,
        priority: draftPriority,
        category_id: draftCategory === 'none' ? null : draftCategory,
      })
      .select('id, text, completed, completed_at, position, category_id, priority')
      .single();
    if (error) {
      toast.error('Não foi possível adicionar');
    } else if (data) {
      setItems((prev) => [data as Item, ...prev]);
      setDraft('');
    }
    setAdding(false);
  };

  const toggle = async (item: Item) => {
    const next = !item.completed;
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, completed: next, completed_at: next ? new Date().toISOString() : null } : i,
      ),
    );
    const { error } = await (supabase as any)
      .from('personal_checklist_items')
      .update({ completed: next, completed_at: next ? new Date().toISOString() : null })
      .eq('id', item.id);
    if (error) {
      toast.error('Erro ao atualizar');
      load();
    }
  };

  const updateItem = async (id: string, patch: Partial<Pick<Item, 'priority' | 'category_id' | 'text'>>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    const { error } = await (supabase as any)
      .from('personal_checklist_items')
      .update(patch)
      .eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar');
      load();
    }
  };

  const remove = async (id: string) => {
    const prev = items;
    setItems(items.filter((i) => i.id !== id));
    const { error } = await (supabase as any).from('personal_checklist_items').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir');
      setItems(prev);
    }
  };

  const clearCompleted = async () => {
    const ids = items.filter((i) => i.completed).map((i) => i.id);
    if (ids.length === 0) return;
    const prev = items;
    setItems(items.filter((i) => !i.completed));
    const { error } = await (supabase as any).from('personal_checklist_items').delete().in('id', ids);
    if (error) {
      toast.error('Erro ao limpar concluídos');
      setItems(prev);
    } else {
      toast.success(`${ids.length} item(s) removido(s)`);
    }
  };

  // Category management
  const openNewCat = () => {
    setEditingCat(null);
    setCatName('');
    setCatColor(COLOR_PRESETS[11]);
    setCatDialogOpen(true);
  };
  const openEditCat = (cat: Category) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatColor(cat.color);
    setCatDialogOpen(true);
  };
  const saveCategory = async () => {
    const name = catName.trim();
    if (!name) {
      toast.error('Informe um nome');
      return;
    }
    if (editingCat) {
      const { error } = await (supabase as any)
        .from('personal_checklist_categories')
        .update({ name, color: catColor })
        .eq('id', editingCat.id);
      if (error) {
        toast.error('Erro ao salvar categoria');
        return;
      }
      setCategories((prev) => prev.map((c) => (c.id === editingCat.id ? { ...c, name, color: catColor } : c)));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await (supabase as any)
        .from('personal_checklist_categories')
        .insert({ name, color: catColor, user_id: user.id, position: categories.length })
        .select('id, name, color, position')
        .single();
      if (error) {
        toast.error('Erro ao criar categoria');
        return;
      }
      if (data) setCategories((prev) => [...prev, data as Category]);
    }
    setCatDialogOpen(false);
  };
  const deleteCategory = async (id: string) => {
    const prev = categories;
    setCategories(categories.filter((c) => c.id !== id));
    setItems((prevItems) => prevItems.map((i) => (i.category_id === id ? { ...i, category_id: null } : i)));
    const { error } = await (supabase as any).from('personal_checklist_categories').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir categoria');
      setCategories(prev);
      load();
    } else {
      setCatDialogOpen(false);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorderGroup = async (groupItems: Item[], activeId: string, overId: string) => {
    const oldIndex = groupItems.findIndex((i) => i.id === activeId);
    const newIndex = groupItems.findIndex((i) => i.id === overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    const reordered = arrayMove(groupItems, oldIndex, newIndex);
    const updates = reordered.map((it, idx) => ({ id: it.id, position: idx }));
    const updatedIds = new Map(updates.map((u) => [u.id, u.position]));
    setItems((prev) =>
      prev.map((i) => (updatedIds.has(i.id) ? { ...i, position: updatedIds.get(i.id)! } : i)),
    );
    const results = await Promise.all(
      updates.map((u) =>
        (supabase as any).from('personal_checklist_items').update({ position: u.position }).eq('id', u.id),
      ),
    );
    if (results.some((r: any) => r.error)) {
      toast.error('Erro ao salvar ordem');
      load();
    }
  };

  const openCount = items.filter((i) => !i.completed).length;
  const doneCount = items.filter((i) => i.completed).length;

  const categoryMap = useMemo(() => {
    const m = new Map<string, Category>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const visible = items.filter((i) => {
    if (filter === 'open' && i.completed) return false;
    if (filter === 'done' && !i.completed) return false;
    if (categoryFilter === 'none' && i.category_id) return false;
    if (categoryFilter !== 'all' && categoryFilter !== 'none' && i.category_id !== categoryFilter) return false;
    if (priorityFilter !== 'all' && i.priority !== priorityFilter) return false;
    return true;
  });

  // Group by category for display
  const grouped = useMemo(() => {
    const groups = new Map<string, Item[]>();
    visible.forEach((it) => {
      const key = it.category_id ?? '__none__';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    });
    // sort each group: open before completed, then by position
    groups.forEach((arr) =>
      arr.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.position - b.position;
      }),
    );
    const orderedKeys: string[] = [];
    categories.forEach((c) => {
      if (groups.has(c.id)) orderedKeys.push(c.id);
    });
    if (groups.has('__none__')) orderedKeys.push('__none__');
    return orderedKeys.map((k) => ({
      key: k,
      category: k === '__none__' ? null : categoryMap.get(k) ?? null,
      items: groups.get(k)!,
    }));
  }, [visible, categories, categoryMap]);

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'open', label: 'Abertos', count: openCount },
    { id: 'done', label: 'Concluídos', count: doneCount },
    { id: 'all', label: 'Todos', count: items.length },
  ];

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground/80">
            <ListTodo className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight text-foreground">Meu Check-list</h2>
            <p className="text-[12px] text-muted-foreground">Organize por categoria e prioridade.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openNewCat}
            className="h-8 rounded-full px-3 text-[12px]"
          >
            <Tag className="mr-1.5 h-3.5 w-3.5" />
            Nova categoria
          </Button>
          {doneCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCompleted}
              className="h-8 rounded-full px-3 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Limpar concluídos
            </Button>
          )}
        </div>
      </header>

      {/* Add input */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-1.5 transition-colors focus-within:border-foreground/30">
          <Plus className="h-4 w-4 text-muted-foreground" />
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Adicionar tarefa e pressionar Enter…"
            className="h-9 flex-1 border-0 bg-transparent px-0 text-[14px] shadow-none focus-visible:ring-0"
            disabled={adding}
          />
          {draft.trim() && (
            <Button size="sm" onClick={addItem} disabled={adding} className="h-7 rounded-full px-3 text-[12px]">
              Adicionar
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Padrão do novo item:</span>
          <Select value={draftPriority} onValueChange={(v) => setDraftPriority(v as Priority)}>
            <SelectTrigger className="h-8 w-[110px] rounded-full text-[12px]">
              <Flag className="mr-1 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_ORDER.map((p) => (
                <SelectItem key={p} value={p}>
                  <span className="inline-flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', PRIORITY_META[p].dot)} />
                    {p}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={draftCategory} onValueChange={setDraftCategory}>
            <SelectTrigger className="h-8 w-[180px] rounded-full text-[12px]">
              <Tag className="mr-1 h-3.5 w-3.5" />
              <SelectValue placeholder="Sem categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem categoria</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-all',
                filter === f.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
              <span
                className={cn(
                  'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                  filter === f.id ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
                )}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setPriorityFilter('all')}
            className={cn(
              'rounded-full px-3 py-1 text-[12px] font-medium transition-all',
              priorityFilter === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Todas prioridades
          </button>
          {PRIORITY_ORDER.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityFilter(p)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-all',
                priorityFilter === p ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', PRIORITY_META[p].dot)} />
              {p}
            </button>
          ))}
        </div>
        {categories.length > 0 && (
          <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={cn(
                'rounded-full px-3 py-1 text-[12px] font-medium transition-all',
                categoryFilter === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Todas
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryFilter(c.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-all',
                  categoryFilter === c.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditCat(c);
                  }}
                  className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Editar categoria"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCategoryFilter('none')}
              className={cn(
                'rounded-full px-3 py-1 text-[12px] font-medium transition-all',
                categoryFilter === 'none' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Sem categoria
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="mt-4 space-y-5">
        {loading ? (
          <p className="py-8 text-center text-[13px] text-muted-foreground">Carregando…</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground/60">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-[13px] font-medium text-foreground">
              {filter === 'open' && 'Nada por aqui — você está em dia!'}
              {filter === 'done' && 'Nenhum item concluído ainda.'}
              {filter === 'all' && 'Comece adicionando sua primeira tarefa.'}
            </p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.key} className="space-y-1">
              <div className="flex items-center gap-2 px-1 pb-1">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: group.category?.color ?? '#94a3b8' }}
                />
                <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.category?.name ?? 'Sem categoria'}
                </span>
                <span className="text-[11px] text-muted-foreground">· {group.items.length}</span>
                {group.category && (
                  <button
                    type="button"
                    onClick={() => openEditCat(group.category!)}
                    className="ml-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label="Editar categoria"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e: DragEndEvent) => {
                  const { active, over } = e;
                  if (!over || active.id === over.id) return;
                  reorderGroup(group.items, String(active.id), String(over.id));
                }}
              >
                <SortableContext
                  items={group.items.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-1">
                    {group.items.map((item) => (
                      <SortableTaskRow
                        key={item.id}
                        item={item}
                        categories={categories}
                        onToggle={() => toggle(item)}
                        onRemove={() => remove(item.id)}
                        onUpdate={(patch) => updateItem(item.id, patch)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>

            </div>
          ))
        )}
      </div>

      {/* Category dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Nome</label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Ex: Pessoal, Somus, Estudos…"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Cor</label>
              <div className="grid grid-cols-9 gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatColor(c)}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-all',
                      catColor === c ? 'border-foreground scale-110' : 'border-transparent',
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={`Cor ${c}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: catColor }} />
              <span className="text-[13px] font-medium">{catName.trim() || 'Pré-visualização'}</span>
            </div>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            {editingCat ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteCategory(editingCat.id)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Excluir
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCatDialogOpen(false)}>
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancelar
              </Button>
              <Button size="sm" onClick={saveCategory}>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function InlineItemText({
  value,
  completed,
  onSave,
}: {
  value: string;
  completed: boolean;
  onSave: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          onSave(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(value);
            setEditing(false);
          }
        }}
        className="h-7 flex-1 border-0 bg-transparent px-1 text-[14px] shadow-none focus-visible:ring-1 focus-visible:ring-foreground/30"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Clique para editar"
      className={cn(
        'flex-1 truncate text-left text-[14px] transition-all hover:text-foreground',
        completed ? 'text-muted-foreground line-through' : 'text-foreground',
      )}
    >
      {value}
    </button>
  );
}

function SortableTaskRow({
  item,
  categories,
  onToggle,
  onRemove,
  onUpdate,
}: {
  item: Item;
  categories: Category[];
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<Pick<Item, 'priority' | 'category_id' | 'text'>>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const p = PRIORITY_META[item.priority];

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 rounded-xl px-1 py-2 transition-colors hover:bg-muted/50',
        isDragging && 'z-10 bg-muted shadow-md',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Reordenar"
        className="flex h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onToggle}
        aria-label={item.completed ? 'Marcar como aberto' : 'Marcar como concluído'}
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
          item.completed
            ? 'border-foreground bg-foreground text-background'
            : 'border-border bg-background text-transparent hover:border-foreground/60',
        )}
      >
        {item.completed ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Circle className="h-3 w-3 opacity-0" />}
      </button>

      <Select value={item.priority} onValueChange={(v) => onUpdate({ priority: v as Priority })}>
        <SelectTrigger
          className={cn(
            'h-6 w-[72px] shrink-0 justify-center gap-1 rounded-full border px-2 text-[11px] font-bold [&>svg]:h-3 [&>svg]:w-3',
            p.className,
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRIORITY_ORDER.map((pr) => (
            <SelectItem key={pr} value={pr}>
              <span className="inline-flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', PRIORITY_META[pr].dot)} />
                {pr}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <InlineItemText
        value={item.text}
        completed={item.completed}
        onSave={(t) => {
          const trimmed = t.trim();
          if (!trimmed || trimmed === item.text) return;
          onUpdate({ text: trimmed });
        }}
      />

      <Select
        value={item.category_id ?? 'none'}
        onValueChange={(v) => onUpdate({ category_id: v === 'none' ? null : v })}
      >
        <SelectTrigger className="h-7 w-[42px] shrink-0 rounded-full border-border/60 px-2 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100">
          <Tag className="h-3.5 w-3.5" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="none">Sem categoria</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Excluir"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-background hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}


