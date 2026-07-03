import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { listSomusAgents, sendSomusMessage } from '@/lib/somus-ia.functions';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Loader2, ArrowUp, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/somus-ia/')({
  component: NewChatPage,
});

const PROTOCOLS = [
  { code: 'P.01', label: 'Sintetizar reunião' },
  { code: 'P.02', label: 'Plano de lançamento' },
  { code: 'P.03', label: 'Refinar apresentação' },
  { code: 'P.04', label: 'Redigir follow-up' },
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

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* HUD status bar */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-border/60 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground bg-background/40 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <span className="text-primary">◉ CANAL LIVRE</span>
          <span>NÓS ATIVOS · {String(activeAgents.length).padStart(2, '0')}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>UPLINK · OPENAI</span>
          <span className="tabular-nums">{ts}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-3xl py-10 space-y-10">
          {/* Orb */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative h-32 w-32">
              <div className="absolute inset-0 rounded-full border border-primary/20 animate-[spin_20s_linear_infinite]" />
              <div className="absolute inset-3 rounded-full border border-primary/30 animate-[spin_12s_linear_infinite_reverse]" />
              <div className="absolute inset-6 rounded-full border border-primary/40 animate-[spin_8s_linear_infinite]" />
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
              <div className="absolute inset-10 rounded-full bg-gradient-to-br from-primary to-primary/40 shadow-[0_0_60px_hsl(var(--primary)/0.6)]" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
            </div>

            <div className="text-center space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                Interface Neural
              </p>
              <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground">
                Estabelecer <span className="font-mono italic text-primary">/conexão</span>
              </h1>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Selecione um nó · transmita instrução
              </p>
            </div>
          </div>

          {activeAgents.length === 0 ? (
            <div className="border border-dashed border-border/70 bg-card/30 backdrop-blur-sm p-10 text-center font-mono">
              <Bot className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-[11px] uppercase tracking-[0.2em] text-foreground">Nó indisponível</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">
                Solicite configuração ao operador master
              </p>
            </div>
          ) : (
            <>
              {/* Node selector */}
              <div className="space-y-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground pl-1">
                  [ Nós Disponíveis ]
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {activeAgents.map((a, i) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAgent(a.id)}
                      className={cn(
                        'relative group text-left px-3 py-3 border transition-all overflow-hidden',
                        selectedAgent === a.id
                          ? 'border-primary bg-primary/[0.08] text-foreground shadow-[0_0_20px_hsl(var(--primary)/0.15)]'
                          : 'border-border/60 bg-card/30 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-card/50',
                      )}
                    >
                      {selectedAgent === a.id && (
                        <span className="absolute top-0 right-0 h-1.5 w-1.5 bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[9px] text-primary/80">
                          N.{String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                          ●online
                        </span>
                      </div>
                      <p className="text-[13px] font-medium truncate">{a.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Command input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground px-1">
                  <span>[ Transmissão ]</span>
                  <span>ENTER · enviar</span>
                </div>
                <div className="relative border border-border/70 bg-background/60 backdrop-blur-xl focus-within:border-primary/60 focus-within:shadow-[0_0_30px_hsl(var(--primary)/0.12)] transition-all">
                  <div className="absolute left-3 top-4 font-mono text-[11px] text-primary select-none">
                    ▸
                  </div>
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
                    placeholder="digite a instrução..."
                    disabled={send.isPending}
                    className="min-h-[64px] max-h-[220px] resize-none border-0 rounded-none focus-visible:ring-0 shadow-none bg-transparent text-[14px] font-mono placeholder:text-muted-foreground/50 pl-9 pr-14 py-4"
                  />
                  <button
                    onClick={() => handleSubmit()}
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
              </div>

              {/* Protocols */}
              <div className="space-y-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground pl-1">
                  [ Protocolos rápidos ]
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {PROTOCOLS.map((p) => (
                    <button
                      key={p.code}
                      onClick={() => handleSubmit(p.label)}
                      disabled={send.isPending}
                      className="group flex items-center gap-3 px-3 py-2.5 border border-border/50 hover:border-primary/40 bg-card/20 hover:bg-primary/[0.05] text-left transition-all disabled:opacity-50"
                    >
                      <Zap className="h-3 w-3 text-primary/60 group-hover:text-primary" />
                      <span className="font-mono text-[9px] text-primary/70">{p.code}</span>
                      <span className="text-[12px] text-muted-foreground group-hover:text-foreground">
                        {p.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
