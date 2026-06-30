import { cn } from '@/lib/utils';

const GRADIENTS = [
  'from-muted-foreground/20 to-muted-foreground/5',
  'from-primary/15 to-primary/5',
  'from-muted-foreground/15 to-muted-foreground/30',
  'from-primary/10 to-muted-foreground/10',
  'from-secondary-foreground/15 to-muted-foreground/10',
  'from-muted-foreground/25 to-muted-foreground/10',
  'from-primary/20 to-muted-foreground/5',
];

const SIZE: Record<string, string> = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
};

function initials(name?: string | null) {
  const n = (name ?? '').trim();
  if (!n) return '?';
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function hashIndex(seed: string, mod: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % mod;
}

export function ClientAvatar({
  name,
  photoUrl,
  size = 'sm',
  className,
}: {
  name?: string | null;
  photoUrl?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const initialsText = initials(name);
  const grad = GRADIENTS[hashIndex(name ?? 'x', GRADIENTS.length)];
  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden font-semibold text-white shadow-sm ring-1 ring-border/40',
        SIZE[size],
        !photoUrl && `bg-gradient-to-br ${grad}`,
        className,
      )}
      title={name ?? ''}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={name ?? ''} className="h-full w-full object-cover" />
      ) : (
        <span className="select-none tracking-tight">{initialsText}</span>
      )}
    </div>
  );
}
