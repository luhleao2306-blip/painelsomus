import { useEffect, useRef, useState } from 'react';

interface InlineTextProps {
  value: string;
  onSave: (val: string) => void | Promise<void>;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  wrap?: boolean;
}

export function InlineText({ value, onSave, className = '', placeholder, disabled, wrap = false }: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = async () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) { setDraft(value); return; }
    await onSave(trimmed);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        placeholder={placeholder}
        className={`bg-background border border-primary rounded px-1.5 py-0.5 outline-none w-full ${className}`}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => { if (!disabled) { e.stopPropagation(); setEditing(true); } }}
      onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === 'F2')) { e.preventDefault(); setEditing(true); } }}
      className={`block cursor-text hover:bg-muted/60 rounded px-1.5 py-0.5 -mx-1.5 ${wrap ? 'whitespace-normal break-words [overflow-wrap:anywhere]' : 'truncate'} ${className}`}
      title="Clique para editar"
    >
      {value || <span className="text-muted-foreground italic">{placeholder || 'Sem título'}</span>}
    </span>
  );
}

interface InlineSelectProps<T extends string> {
  value: T;
  options: readonly T[];
  onSave: (val: T) => void | Promise<void>;
  className?: string;
  renderLabel?: (v: T) => React.ReactNode;
}

export function InlineSelect<T extends string>({ value, options, onSave, className = '', renderLabel }: InlineSelectProps<T>) {
  return (
    <select
      value={value}
      onClick={e => e.stopPropagation()}
      onChange={e => onSave(e.target.value as T)}
      className={`bg-transparent border border-transparent hover:border-input rounded px-1 py-0.5 text-xs cursor-pointer ${className}`}
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{renderLabel ? (renderLabel(opt) as any) : opt}</option>
      ))}
    </select>
  );
}
