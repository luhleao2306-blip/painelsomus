import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getSomusConversation, sendSomusMessage, listSomusAgents } from '@/lib/somus-ia.functions';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2, User as UserIcon } from 'lucide-react';
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
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center max-w-md">
          <p className="text-sm font-medium text-white">Conversa não encontrada</p>
          <Button
            variant="link"
            className="mt-2 text-[#f7d774]"
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
        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
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
      <header className="px-6 py-4 border-b border-white/5 flex items-center gap-3 bg-[#0a0a0a]/80 backdrop-blur">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#f7d774] via-[#d4a72c] to-[#8a6a14] flex items-center justify-center shadow-[0_0_20px_-4px_rgba(212,167,44,0.4)]">
          <span className="text-[#1a1305] font-bold text-sm">S</span>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white truncate">{data.conversation.title}</p>
          <p className="text-[11px] text-white/40">{agent?.name ?? 'Agente'}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {data.messages.map((m) => (
            <div
              key={m.id}
              className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {m.role === 'assistant' && (
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#f7d774] via-[#d4a72c] to-[#8a6a14] flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_15px_-4px_rgba(212,167,44,0.4)]">
                  <span className="text-[#1a1305] font-bold text-[11px]">S</span>
                </div>
              )}
              <div
                className={cn(
                  'max-w-[80%]',
                  m.role === 'user'
                    ? 'rounded-2xl rounded-tr-md px-4 py-2.5 bg-gradient-to-br from-[#d4a72c] to-[#b8901f] text-[#1a1305]'
                    : 'text-white/90',
                )}
              >
                {m.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-pre:my-2 prose-pre:bg-white/[0.04] prose-pre:border prose-pre:border-white/10 prose-code:text-[#f7d774] prose-a:text-[#f7d774] prose-strong:text-white prose-headings:text-white">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed font-medium">{m.content}</p>
                )}
              </div>
              {m.role === 'user' && (
                <div className="h-8 w-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <UserIcon className="h-3.5 w-3.5 text-white/60" />
                </div>
              )}
            </div>
          ))}

          {send.isPending && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#f7d774] via-[#d4a72c] to-[#8a6a14] flex items-center justify-center shrink-0 shadow-[0_0_15px_-4px_rgba(212,167,44,0.4)]">
                <span className="text-[#1a1305] font-bold text-[11px]">S</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d4a72c] animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#d4a72c] animate-bounce [animation-delay:0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#d4a72c] animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="p-4 bg-gradient-to-t from-[#0a0a0a] to-transparent">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] focus-within:border-white/20 transition-colors">
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
              placeholder="Envie uma mensagem..."
              disabled={send.isPending}
              className="min-h-[52px] max-h-[200px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent text-white placeholder:text-white/30 pr-14 py-3.5"
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || send.isPending}
              className="absolute right-2.5 bottom-2.5 h-9 w-9 rounded-lg bg-gradient-to-br from-[#f7d774] to-[#d4a72c] text-[#1a1305] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_20px_-4px_rgba(212,167,44,0.6)] transition-all"
            >
              {send.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
