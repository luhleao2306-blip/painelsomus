import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getSomusConversation, sendSomusMessage, listSomusAgents } from '@/lib/somus-ia.functions';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUp, CircuitBoard, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export const Route = createFileRoute('/somus-ia/$conversationId')({
  component: ChatPage,
});

function fmtTime(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function ChatPage() {
  const { conversationId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const getFn = useServerFn(getSomusConversation);
  const sendFn = useServerFn(sendSomusMessage);
  const listAgentsFn = useServerFn(listSomusAgents);

  const { data, isLoading, error } = useQuery({
    queryKey: ['somus-ia', 'conversation', conversationId],
    queryFn: () => getFn({ data: { id: conversationId } }),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['somus-ia', 'agents'],
    queryFn: () => listAgentsFn({}),
  });

  const [input, setInput] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    taRef.current?.focus();
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages?.length]);

  const send = useMutation({
    mutationFn: (content: string) =>
      sendFn({
        data: {
          conversationId,
          agentId: data!.conversation.agent_id!,
          content,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['somus-ia', 'conversation', conversationId] });
      qc.invalidateQueries({ queryKey: ['somus-ia', 'conversations'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao enviar'),
  });

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="border border-destructive/40 bg-background/60 backdrop-blur-xl p-8 text-center max-w-md">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-destructive">
            ⚠ Sessão perdida
          </p>
          <Button
            variant="link"
            className="mt-2 font-mono text-xs"
            onClick={() => navigate({ to: '/somus-ia' })}
          >
            &gt; iniciar nova
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          Sincronizando canal...
        </div>
      </div>
    );
  }

  const agent = agents.find((a) => a.id === data.conversation.agent_id);
  const handleSubmit = () => {
    const v = input.trim();
    if (!v || send.isPending) return;
    send.mutate(v);
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* HUD header */}
      <header className="px-6 py-3 border-b border-border/60 flex items-center gap-4 bg-background/50 backdrop-blur-xl">
        <div className="relative h-8 w-8">
          <div className="absolute inset-0 rounded-md bg-primary/20 blur-md" />
          <div className="relative h-8 w-8 rounded-md border border-primary/50 bg-background flex items-center justify-center">
            <CircuitBoard className="h-3.5 w-3.5 text-primary" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium truncate">{data.conversation.title}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            NÓ · {agent?.name ?? '—'} · CANAL {conversationId.slice(0, 6)}
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          LIVE
        </div>
      </header>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {data.messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div key={m.id} className="animate-fade-in space-y-1.5">
                <div
                  className={cn(
                    'flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.24em]',
                    isUser ? 'justify-end text-muted-foreground' : 'text-primary/80',
                  )}
                >
                  {!isUser && <span className="h-px w-6 bg-primary/40" />}
                  <span>
                    {isUser ? '⟵ OPERADOR' : '⟶ ' + (agent?.name ?? 'IA')}
                  </span>
                  <span className="text-muted-foreground/60">·</span>
                  <span className="tabular-nums">
                    {String(idx + 1).padStart(3, '0')}
                  </span>
                  <span className="text-muted-foreground/60">·</span>
                  <span className="tabular-nums">{fmtTime(m.created_at)}</span>
                  {isUser && <span className="h-px w-6 bg-border" />}
                </div>

                <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
                  {!isUser && (
                    <div className="mt-0.5 h-7 w-7 shrink-0 border border-primary/40 bg-primary/[0.06] flex items-center justify-center">
                      <CircuitBoard className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[82%] px-4 py-3 border',
                      isUser
                        ? 'border-primary/40 bg-primary/[0.08] text-foreground'
                        : 'border-border/60 bg-card/40 backdrop-blur-sm text-foreground',
                    )}
                    style={{
                      clipPath: isUser
                        ? 'polygon(0 0, 100% 0, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                        : 'polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)',
                    }}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{m.content}</p>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-pre:my-2 prose-pre:bg-background/60 prose-pre:border prose-pre:border-border prose-code:text-primary prose-headings:text-foreground">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {isUser && (
                    <div className="mt-0.5 h-7 w-7 shrink-0 border border-border bg-muted/40 flex items-center justify-center">
                      <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {send.isPending && (
            <div className="animate-fade-in space-y-1.5">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.24em] text-primary/80">
                <span className="h-px w-6 bg-primary/40" />
                <span>⟶ {agent?.name ?? 'IA'} processando</span>
              </div>
              <div className="flex gap-3">
                <div className="mt-0.5 h-7 w-7 shrink-0 border border-primary/40 bg-primary/[0.06] flex items-center justify-center">
                  <CircuitBoard className="h-3.5 w-3.5 text-primary animate-pulse" />
                </div>
                <div className="px-4 py-3 border border-border/60 bg-card/40 backdrop-blur-sm flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <span className="inline-flex gap-1">
                    <span className="h-1 w-1 bg-primary animate-bounce" />
                    <span className="h-1 w-1 bg-primary animate-bounce [animation-delay:0.15s]" />
                    <span className="h-1 w-1 bg-primary animate-bounce [animation-delay:0.3s]" />
                  </span>
                  decodificando resposta
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="p-4 pb-5 bg-gradient-to-t from-background via-background/85 to-transparent">
        <div className="max-w-3xl mx-auto space-y-1.5">
          <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground px-1">
            <span className="text-primary/80">▸ TRANSMITIR</span>
            <span>ENTER · enviar · SHIFT+ENTER · quebra</span>
          </div>
          <div className="relative border border-border/70 bg-background/70 backdrop-blur-xl focus-within:border-primary/60 focus-within:shadow-[0_0_25px_hsl(var(--primary)/0.12)] transition-all">
            <Textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="instrução..."
              disabled={send.isPending}
              className="min-h-[56px] max-h-[220px] resize-none border-0 rounded-none focus-visible:ring-0 shadow-none bg-transparent text-[14px] font-mono placeholder:text-muted-foreground/50 pl-4 pr-14 py-4"
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || send.isPending}
              className="absolute right-2 bottom-2 h-10 w-10 border border-primary/50 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {send.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
              )}
            </button>
          </div>
          <p className="text-center font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 pt-1">
            SOMUS//IA · verifique informações críticas
          </p>
        </div>
      </div>
    </div>
  );
}
