import React, { useEffect, useState, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, ExternalLink, Inbox } from 'lucide-react';
import { useRouter } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/use-profile';
import { toast } from 'sonner';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export function NotificationsPopover() {
  const { profile } = useProfile();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = items.filter((i) => !i.read).length;

  const fetchItems = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (!error && data) setItems(data as Notification[]);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    fetchItems();
    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        () => fetchItems(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, fetchItems]);

  const markAsRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    if (!profile?.id || unreadCount === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', profile.id)
      .eq('read', false);
    if (error) toast.error('Não foi possível marcar como lidas');
    else toast.success('Todas as notificações marcadas como lidas');
  };

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) {
      toast.error('Não foi possível excluir');
      fetchItems();
    }
  };

  const clearAll = async () => {
    if (!profile?.id || items.length === 0) return;
    const previous = items;
    setItems([]);
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', profile.id);
    if (error) {
      toast.error('Não foi possível limpar');
      setItems(previous);
    } else {
      toast.success('Notificações limpas');
    }
  };


  const openItem = async (n: Notification) => {
    if (!n.read) await markAsRead(n.id);
    if (n.link) {
      setOpen(false);
      if (n.link.startsWith('http')) {
        window.open(n.link, '_blank', 'noopener,noreferrer');
      } else {
        router.history.push(n.link);
      }
    }
  };

  const typeBadge = (type: string) => {
    const map: Record<string, { label: string; className: string }> = {
      project: { label: 'Projeto', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
      task: { label: 'Tarefa', className: 'bg-purple-500/15 text-purple-700 dark:text-purple-300' },
      meeting: { label: 'Reunião', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
      document: { label: 'Documento', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
      contract: { label: 'Contrato', className: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' },
      comment: { label: 'Comentário', className: 'bg-pink-500/15 text-pink-700 dark:text-pink-300' },
      status: { label: 'Status', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
      system: { label: 'Sistema', className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300' },
    };
    const meta = map[type] ?? map.system;
    return (
      <Badge variant="outline" className={cn('text-[10px] border-transparent', meta.className)}>
        {meta.label}
      </Badge>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:bg-secondary transition-colors"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h4 className="font-semibold text-sm">Notificações</h4>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} não lida(s)` : 'Tudo em dia'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 text-xs gap-1">
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </Button>
            )}
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-8 text-xs gap-1 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
          </div>
        </div>
        <Separator />

        <ScrollArea className="max-h-[420px]">
          {loading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">Nenhuma notificação</p>
              <p className="text-xs text-muted-foreground mt-1">
                Você verá aqui novidades de tarefas e mais.
              </p>
            </div>
          ) : (
            <TooltipProvider>
              <ul className="divide-y">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      'group relative px-4 py-3 hover:bg-muted/40 transition-colors',
                      !n.read && 'bg-primary/5',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          'mt-1.5 h-2 w-2 rounded-full shrink-0',
                          n.read ? 'bg-transparent' : 'bg-primary',
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => openItem(n)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {typeBadge(n.type)}
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(n.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <p
                          className={cn(
                            'text-sm leading-snug',
                            !n.read ? 'font-semibold' : 'font-medium text-muted-foreground',
                          )}
                        >
                          {n.title}
                        </p>
                        {n.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {n.description}
                          </p>
                        )}
                        {n.link && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-primary mt-1">
                            <ExternalLink className="h-3 w-3" />
                            Abrir item
                          </span>
                        )}
                      </button>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.read && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => markAsRead(n.id)}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Marcar como lida</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => deleteItem(n.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </TooltipProvider>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
