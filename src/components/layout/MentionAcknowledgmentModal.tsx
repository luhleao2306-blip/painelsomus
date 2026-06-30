import { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@tanstack/react-router';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AtSign, CheckCircle2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/use-profile';
import { toast } from 'sonner';

interface MentionNotification {
  id: string;
  title: string;
  description: string | null;
  link: string | null;
  entity_id: string | null;
  created_at: string;
}

/**
 * Persistent blocking modal: while the current user has unread @mention
 * notifications, this modal stays open until each one is explicitly
 * acknowledged ("Confirmar leitura"). Mounted globally in the root layout.
 */
export function MentionAcknowledgmentModal() {
  const { profile } = useProfile();
  const router = useRouter();
  const [items, setItems] = useState<MentionNotification[]>([]);

  const load = useCallback(async () => {
    if (!profile?.id) { setItems([]); return; }
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, description, link, entity_id, created_at')
      .eq('user_id', profile.id)
      .eq('type', 'mention')
      .eq('read', false)
      .order('created_at', { ascending: true });
    if (!error && data) setItems(data as MentionNotification[]);
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`mentions-ack-${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, load]);

  const acknowledge = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) {
      toast.error('Não foi possível confirmar a leitura');
      return;
    }
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  const openItem = async (n: MentionNotification) => {
    await acknowledge(n.id);
    if (n.link) {
      if (n.link.startsWith('http')) {
        window.open(n.link, '_blank');
      } else {
        router.history.push(n.link);
      }
    }
  };

  const open = items.length > 0;
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => { /* blocking: cannot dismiss */ }}>
      <DialogContent
        className="max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AtSign className="h-5 w-5 text-primary" />
            Você foi mencionado{items.length > 1 ? ` (${items.length})` : ''}
          </DialogTitle>
          <DialogDescription>
            Confirme a leitura de cada menção para continuar usando o sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {items.map((n) => (
            <div key={n.id} className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
              <p className="text-sm font-medium">{n.title}</p>
              {n.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.description}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {n.link && (
                  <Button size="sm" variant="outline" onClick={() => openItem(n)}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Abrir tarefa
                  </Button>
                )}
                <Button size="sm" onClick={() => acknowledge(n.id)}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Confirmar leitura
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
