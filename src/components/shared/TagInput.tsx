import { useState, KeyboardEvent } from 'react';
import { X, Tag as TagIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}

export function TagInput({ value, onChange, placeholder = 'Adicionar tag e Enter…', suggestions = [] }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (value.includes(t)) { setDraft(''); return; }
    onChange([...value, t]);
    setDraft('');
  };

  const remove = (tag: string) => onChange(value.filter(t => t !== tag));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  const filtered = suggestions.filter(s => !value.includes(s) && s.toLowerCase().includes(draft.toLowerCase()) && draft);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 min-h-9 rounded-md border border-input bg-background px-2 py-1.5">
        {value.map(t => (
          <Badge key={t} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5">
            <TagIcon className="h-3 w-3" />
            {t}
            <button type="button" onClick={() => remove(t)} className="ml-0.5 rounded-full hover:bg-muted-foreground/10 p-0.5" aria-label={`Remover ${t}`}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft && commit(draft)}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filtered.slice(0, 8).map(s => (
            <button key={s} type="button" onClick={() => commit(s)} className="text-[11px] px-2 py-0.5 rounded-full border border-border hover:bg-muted">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
