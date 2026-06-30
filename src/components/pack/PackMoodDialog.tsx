import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePackMood, Mood } from '@/hooks/use-pack-mood';
import { useProfile } from '@/hooks/use-profile';

const OPTIONS: { value: Mood; emoji: string; label: string; ring: string }[] = [
  { value: 'feliz', emoji: '🐺', label: 'Lobo Feliz', ring: 'hover:border-emerald-500/60 hover:bg-emerald-500/10' },
  { value: 'neutro', emoji: '🐺', label: 'Lobo Neutro', ring: 'hover:border-amber-500/60 hover:bg-amber-500/10' },
  { value: 'triste', emoji: '🐺', label: 'Lobo Triste', ring: 'hover:border-rose-500/60 hover:bg-rose-500/10' },
];

const FACE: Record<Mood, string> = { feliz: '😄', neutro: '😐', triste: '😢' };

export function PackMoodDialog() {
  const { needsCheckIn, setMood, dismissCheckIn } = usePackMood();
  const { profile } = useProfile();
  const [submitting, setSubmitting] = useState<Mood | null>(null);

  const firstName = profile?.full_name?.split(' ')[0] || 'Lobo';

  const handle = async (m: Mood) => {
    setSubmitting(m);
    try { await setMood(m); } finally { setSubmitting(null); }
  };

  return (
    <Dialog open={needsCheckIn} onOpenChange={(o) => { if (!o) dismissCheckIn(); }}>
      <DialogContent className="sm:max-w-md border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">🐺</span> Como está o Lobo hoje, {firstName}?
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            A força da Alcateia depende de cada um. Marque seu humor para alimentar a energia do grupo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-2">
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              disabled={submitting !== null}
              onClick={() => handle(opt.value)}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 border-slate-700 bg-slate-800/60 p-4 transition-all disabled:opacity-50 ${opt.ring}`}
            >
              <span className="text-4xl leading-none">{FACE[opt.value]}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">{opt.label}</span>
              {submitting === opt.value && <span className="text-[10px] text-slate-400">enviando...</span>}
            </button>
          ))}
        </div>

        <p className="text-center text-[11px] text-slate-400 italic">
          "Sozinho o lobo é forte, junto a alcateia é invencível."
        </p>

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={dismissCheckIn} className="text-slate-400 hover:text-white hover:bg-slate-800">
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
