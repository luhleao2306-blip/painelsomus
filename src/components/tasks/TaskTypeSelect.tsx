import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskTypes } from '@/hooks/use-task-types';
import { toast } from 'sonner';

interface Props {
  value?: string | null;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function TaskTypeSelect({ value, onChange, className, placeholder = 'Selecione' }: Props) {
  const { types, addType, renameType, deleteType } = useTaskTypes();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingText(name);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setBusy(true);
    try {
      await renameType(editingId, editingText);
      toast.success('Tipo atualizado');
      setEditingId(null);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao renomear');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir este tipo?')) return;
    setBusy(true);
    try {
      await deleteType(id);
      toast.success('Tipo removido');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao excluir');
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const created = await addType(newName);
      if (created) {
        onChange(created.name);
        toast.success('Tipo criado');
      }
      setNewName('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao criar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-8 justify-between font-normal', className)}
        >
          <span className={cn(!value && 'text-muted-foreground')}>{value || placeholder}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        <div className="max-h-64 overflow-y-auto">
          {types.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground">Nenhum tipo cadastrado</div>
          )}
          {types.map((t) => (
            <div
              key={t.id}
              className={cn(
                'group flex items-center gap-1 rounded-sm px-1.5 py-1 text-sm hover:bg-accent',
                value === t.name && 'bg-accent/60',
              )}
            >
              {editingId === t.id ? (
                <>
                  <Input
                    autoFocus
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="h-7 text-sm"
                    disabled={busy}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit} disabled={busy}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="flex-1 truncate text-left"
                    onClick={() => {
                      onChange(t.name);
                      setOpen(false);
                    }}
                  >
                    {t.name}
                  </button>
                  {value === t.name && <Check className="h-3.5 w-3.5 text-primary" />}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(t.id, t.name);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(t.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-1 border-t pt-1">
          <Input
            placeholder="Novo tipo…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
            }}
            className="h-7 text-sm"
            disabled={busy}
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={add} disabled={busy || !newName.trim()}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
