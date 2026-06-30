import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getSomusConversation, sendSomusMessage, listSomusAgents } from '@/lib/somus-ia.functions';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, User as UserIcon, Sparkles, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export const Route = createFileRoute('/somus-ia/$conversationId')({
  component: ChatPage,
});

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
        <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-8 text-center max-w-md shadow-xl">
          <p className="text-sm font-medium text-foreground">Conversa não encontrada</p>
          <Button
            variant="link"
            className="mt-2"
            onClick={() => navigate({ to: '/somus-ia' })}
          >
            Iniciar nova conversa
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const agent = agents.find((a) => a.id === data.conversation.agent_id);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || send.isPending) return;
    send.mutate(text);
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="px-6 py-3.5 border-b border-border/60 flex items-center gap-3 bg-background/60 backdrop-blur-xl">
        <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
          <Sparkles className="h-4 w-4" strokeWidth={2.25} />
          <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-foreground truncate tracking-tight">{data.conversation.title}</p>
          <p className="text-[11px] text-muted-foreground">{agent?.name ?? 'Agente'} · SOMUS IA</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-7">
          {data.messages.map((m) => (
            <div
              key={m.id}
              className={cn('flex gap-3 animate-fade-in', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {m.role === 'assistant' && (
                <div className="relative h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-primary/20">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
                  <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[82%]',
                  m.role === 'user'
                    ? 'rounded-3xl rounded-tr-lg px-4 py-2.5 bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'rounded-3xl rounded-tl-lg px-4 py-2.5 bg-card/70 backdrop-blur-sm border border-border/60 text-foreground shadow-sm',
                )}
              >
                {m.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-pre:my-2 prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-headings:text-foreground">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{m.content}</p>
                )}
              </div>
              {m.role === 'user' && (
                <div className="h-8 w-8 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {send.isPending && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <div className="relative h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" strokeWidth={2.25} />
              </div>
              <div className="flex items-center gap-1.5 rounded-3xl rounded-tl-lg bg-card/70 backdrop-blur-sm border border-border/60 px-4 py-3.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="p-4 pb-5 bg-gradient-to-t from-background via-background/80 to-transparent">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl border border-border/70 bg-card/70 backdrop-blur-xl shadow-xl shadow-primary/[0.06] focus-within:border-primary/40 focus-within:shadow-primary/10 transition-all">
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
              placeholder="Envie uma mensagem…"
              disabled={send.isPending}
              className="min-h-[56px] max-h-[220px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent text-[15px] pr-14 pl-5 py-4 placeholder:text-muted-foreground/70"
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || send.isPending}
              className="absolute right-3 bottom-3 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:scale-105 enabled:active:scale-95 transition-all shadow-md shadow-primary/30"
            >
              {send.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
              )}
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-2.5">
            SOMUS IA pode cometer erros. Verifique informações importantes.
          </p>
        </div>
      </div>
    </div>
  );
}
