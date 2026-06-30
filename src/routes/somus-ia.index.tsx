import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { listSomusAgents, sendSomusMessage } from '@/lib/somus-ia.functions';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, Loader2, Sparkles, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/somus-ia/')({
  component: NewChatPage,
});

const SUGGESTIONS = [
  'Resuma os principais pontos de uma reunião',
  'Crie um plano de comunicação para um lançamento',
  'Sugira melhorias para uma apresentação',
  'Gere um e-mail profissional de follow-up',
];

function NewChatPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listAgentsFn = useServerFn(listSomusAgents);
  const sendFn = useServerFn(sendSomusMessage);

  const { data: agents = [] } = useQuery({
    queryKey: ['somus-ia', 'agents'],
    queryFn: () => listAgentsFn({}),
  });

  const activeAgents = agents.filter((a) => a.is_active);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!selectedAgent && activeAgents.length > 0) setSelectedAgent(activeAgents[0].id);
  }, [activeAgents, selectedAgent]);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  const send = useMutation({
    mutationFn: (content: string) =>
      sendFn({ data: { agentId: selectedAgent!, content } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['somus-ia', 'conversations'] });
      navigate({
        to: '/somus-ia/$conversationId',
        params: { conversationId: res.conversationId },
      });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao enviar'),
  });

  const handleSubmit = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || !selectedAgent || send.isPending) return;
    send.mutate(value);
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
      <div className="w-full max-w-2xl space-y-10 py-12 animate-fade-in">
        <div className="text-center space-y-5">
          <div className="relative inline-flex h-20 w-20 mx-auto items-center justify-center">
            <span className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-primary to-primary/60 blur-2xl opacity-40" />
            <div className="relative h-20 w-20 rounded-[28px] bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-2xl shadow-primary/30 ring-1 ring-inset ring-white/10">
              <Sparkles className="h-9 w-9" strokeWidth={2} />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text">
              Como posso ajudar?
            </h1>
            <p className="text-[15px] text-muted-foreground">
              Sua inteligência artificial pessoal, treinada pela Somus
            </p>
          </div>
        </div>

        {activeAgents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 backdrop-blur-sm p-10 text-center">
            <Bot className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">Nenhum agente disponível</p>
            <p className="text-xs text-muted-foreground mt-1">
              Peça a um administrador para cadastrar um agente.
            </p>
          </div>
        ) : (
          <>
            {/* Agent picker */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {activeAgents.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAgent(a.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all',
                    selectedAgent === a.id
                      ? 'border-primary/40 bg-primary/10 text-foreground shadow-sm'
                      : 'border-border/70 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card hover:border-border',
                  )}
                >
                  <Bot className={cn('h-3.5 w-3.5', selectedAgent === a.id ? 'text-primary' : '')} />
                  {a.name}
                </button>
              ))}
            </div>

            {/* Composer */}
            <div className="relative rounded-3xl border border-border/70 bg-card/70 backdrop-blur-xl shadow-2xl shadow-primary/[0.06] focus-within:border-primary/40 focus-within:shadow-primary/10 transition-all">
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
                placeholder="Envie uma mensagem para SOMUS IA…"
                disabled={send.isPending}
                className="min-h-[64px] max-h-[220px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent text-[15px] pr-14 pl-5 py-5 placeholder:text-muted-foreground/70"
              />
              <button
                onClick={() => handleSubmit()}
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

            {/* Suggestions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSubmit(s)}
                  disabled={send.isPending}
                  className="text-left rounded-xl border border-border/60 bg-card/40 hover:bg-card hover:border-border px-4 py-3 text-[13px] text-muted-foreground hover:text-foreground transition-all hover:shadow-sm disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
