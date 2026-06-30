import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  searchable?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  emptyText = 'Nenhuma opção',
  className,
  searchable = true,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  };

  const selectedOptions = options.filter(o => value.includes(o.value));
  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn('h-auto min-h-9 w-full justify-between px-3 py-1.5 font-normal', className)}
        >
          <div className="flex flex-1 flex-wrap items-center gap-1">
            {selectedOptions.length === 0 && (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            {selectedOptions.map(o => (
              <Badge
                key={o.value}
                variant="secondary"
                className="gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
              >
                {o.label}
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggle(o.value);
                  }}
                  className="ml-0.5 inline-flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded-sm hover:bg-muted-foreground/20"
                >
                  <X className="h-3 w-3" />
                </span>
              </Badge>
            ))}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {searchable && (
          <div className="border-b p-2">
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="h-8"
            />
          </div>
        )}
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">{emptyText}</div>
          )}
          {filtered.map(o => {
            const checked = value.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
                  checked && 'bg-accent/60'
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded border',
                    checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                  )}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <span className="flex-1 truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
