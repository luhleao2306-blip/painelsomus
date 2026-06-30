import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, Pencil } from 'lucide-react';
import { WOLF_AVATARS, getWolfAvatar, pickDefaultWolfAvatar } from '@/lib/wolf-avatars';

interface WolfAvatarPickerProps {
  value?: string | null;
  seed?: string | null;
  onChange: (key: string) => void | Promise<void>;
  /** Render mode: 'inline-button' shows the current avatar with an edit affordance. */
  trigger?: 'inline-button';
}

export function WolfAvatarPicker({ value, seed, onChange, trigger = 'inline-button' }: WolfAvatarPickerProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(value ?? null);
  const [saving, setSaving] = useState(false);

  const current = getWolfAvatar(value) ?? pickDefaultWolfAvatar(seed);
  const visible = WOLF_AVATARS;

  const handleConfirm = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      await onChange(pending);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {trigger === 'inline-button' && (
        <button
          type="button"
          onClick={() => {
            setPending(value ?? current.key);
            setOpen(true);
          }}
          className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-border transition hover:ring-primary"
          aria-label="Alterar avatar"
        >
          <img
            src={current.src}
            alt={current.label}
            loading="lazy"
            width={512}
            height={512}
            className="h-full w-full object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition group-hover:opacity-100">
            <Pencil className="h-4 w-4" />
          </span>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Escolha seu lobo</DialogTitle>
            <DialogDescription>
              Seu avatar aparece nas tarefas, notificações e em toda a alcateia.
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            {WOLF_AVATARS.length} avatares disponíveis — escolha o seu lobo.
          </p>

          <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-5">
            {visible.map((wolf) => {
              const selected = pending === wolf.key;
              return (
                <button
                  key={wolf.key}
                  type="button"
                  onClick={() => setPending(wolf.key)}
                  className={cn(
                    'group relative flex flex-col items-center gap-1.5 rounded-xl border bg-card p-2 transition',
                    selected
                      ? 'border-primary ring-2 ring-primary/40'
                      : 'border-border/60 hover:border-primary/40',
                  )}
                >
                  <div className="relative h-20 w-20 overflow-hidden rounded-full bg-muted">
                    <img
                      src={wolf.src}
                      alt={wolf.label}
                      loading="lazy"
                      width={512}
                      height={512}
                      className="h-full w-full object-cover"
                    />
                    {selected && (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <span className="line-clamp-1 text-center text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                    {wolf.label}
                  </span>
                </button>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={saving || !pending}>
              {saving ? 'Salvando...' : 'Salvar avatar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
