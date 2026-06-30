import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { listSomusAgents, sendSomusMessage } from '@/lib/somus-ia.functions';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, Send, Bot, Loader2 } from 'lucide-react';
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
    <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 items-center justify-center mx-auto">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Como posso ajudar?</h1>
          <p className="text-sm text-muted-foreground">
            Escolha um agente e comece a conversar.
          </p>
        </div>

        {activeAgents.length === 0 ? (
          <Card className="p-6 text-center border-dashed">
            <Bot className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Nenhum agente disponível</p>
            <p className="text-xs text-muted-foreground mt-1">
              Peça a um administrador para cadastrar um agente em "Gerenciar agentes".
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {activeAgents.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAgent(a.id)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-all hover:bg-accent/50',
                    selectedAgent === a.id
                      ? 'border-amber-500/60 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-border',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-sm truncate">{a.name}</span>
                  </div>
                  {a.description && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                      {a.description}
                    </p>
                  )}
                </button>
              ))}
            </div>

            <Card className="p-2 shadow-lg border-border/60">
              <div className="flex items-end gap-2">
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
                  className="min-h-[52px] max-h-[200px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent"
                />
                <Button
                  size="icon"
                  onClick={handleSubmit}
                  disabled={!input.trim() || send.isPending}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  {send.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
