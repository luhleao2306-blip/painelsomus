import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { listSomusAgents, sendSomusMessage } from '@/lib/somus-ia.functions';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/somus-ia/')({
  component: NewChatPage,
});

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

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || !selectedAgent || send.isPending) return;
    send.mutate(text);
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
      <div className="w-full max-w-2xl space-y-10 py-12">
        <div className="text-center space-y-4">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-[#f7d774] via-[#d4a72c] to-[#8a6a14] items-center justify-center mx-auto shadow-[0_0_40px_-8px_rgba(212,167,44,0.6)]">
            <span className="text-[#1a1305] font-bold text-2xl">S</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Como posso ajudar?
            </h1>
            <p className="text-sm text-white/50">
              Escolha um agente e comece a conversar
            </p>
          </div>
        </div>

        {activeAgents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <Bot className="h-8 w-8 mx-auto text-white/30 mb-3" />
            <p className="text-sm font-medium text-white/80">Nenhum agente disponível</p>
            <p className="text-xs text-white/40 mt-1">
              Peça a um administrador para cadastrar um agente.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {activeAgents.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAgent(a.id)}
                  className={cn(
                    'rounded-xl border p-3.5 text-left transition-all',
                    selectedAgent === a.id
                      ? 'border-[#d4a72c]/50 bg-[#d4a72c]/[0.08] shadow-[0_0_0_1px_rgba(212,167,44,0.3)]'
                      : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Bot className={cn('h-4 w-4', selectedAgent === a.id ? 'text-[#f7d774]' : 'text-white/50')} />
                    <span className="font-medium text-[13px] truncate text-white">{a.name}</span>
                  </div>
                  {a.description && (
                    <p className="text-[11px] text-white/40 mt-1.5 line-clamp-2">
                      {a.description}
                    </p>
                  )}
                </button>
              ))}
            </div>

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
                className="min-h-[60px] max-h-[200px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent text-white placeholder:text-white/30 pr-14 py-4"
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || send.isPending}
                className="absolute right-3 bottom-3 h-9 w-9 rounded-lg bg-gradient-to-br from-[#f7d774] to-[#d4a72c] text-[#1a1305] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_20px_-4px_rgba(212,167,44,0.6)] transition-all"
              >
                {send.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
