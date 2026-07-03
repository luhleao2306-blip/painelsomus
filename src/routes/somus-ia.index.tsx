import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { listSomusAgents, sendSomusMessage } from '@/lib/somus-ia.functions';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/somus-ia/')({
  component: NewChatPage,
});

const PAUTAS = [
  'Como estruturar a comunicação de um lançamento?',
  'Redija um e-mail formal de follow-up',
  'Quais melhorias posso fazer nesta apresentação?',
  'Resuma os pontos-chave da última reunião',
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
    onError: (e: any) => toast.error(e?.message ?? 'Erro'),
  });

  const handleSubmit = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || !selectedAgent || send.isPending) return;
    send.mutate(value);
    setInput('');
  };

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-12 py-12">
        {/* Masthead */}
        <div className="flex items-baseline justify-between border-b-2 border-foreground pb-3 mb-2">
          <p className="text-[10px] uppercase tracking-[0.32em]">Editorial · Vol. 01</p>
          <p className="text-[10px] uppercase tracking-[0.32em]">{today}</p>
        </div>
        <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.22em] text-muted-foreground border-b border-border pb-3 mb-14">
          <span>Uma publicação diária, sob demanda</span>
          <span>Preço: sua atenção</span>
        </div>

        {/* Hero headline */}
        <div className="text-center space-y-6 mb-16">
          <p className="text-[11px] uppercase tracking-[0.32em] text-primary">
            — Consulte o corpo editorial —
          </p>
          <h1 className="font-serif text-6xl md:text-7xl leading-[0.95] tracking-tight text-foreground">
            Qual pauta você <br />
            <span className="italic font-light">quer investigar</span> hoje?
          </h1>
          <p className="max-w-lg mx-auto text-[15px] leading-relaxed text-muted-foreground italic font-serif">
            Escolha um dos nossos colunistas, entregue uma pergunta e receba uma
            peça editorial escrita sob medida.
          </p>
        </div>

        {activeAgents.length === 0 ? (
          <div className="border-y-2 border-foreground py-12 text-center font-serif italic">
            <p className="text-lg">Nenhum colunista disponível.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Peça ao editor-chefe para convocar a equipe.
            </p>
          </div>
        ) : (
          <>
            {/* Editorial board */}
            <div className="mb-10">
              <div className="flex items-baseline justify-between border-b border-border pb-2 mb-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  Corpo editorial
                </p>
                <p className="font-serif italic text-xs text-muted-foreground">
                  {activeAgents.length} colunistas
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 divide-y divide-border">
                {activeAgents.map((a, i) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAgent(a.id)}
                    className={cn(
                      'group flex items-baseline gap-4 py-4 text-left transition',
                      selectedAgent === a.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'font-serif italic text-2xl w-8 shrink-0 tabular-nums',
                        selectedAgent === a.id ? 'text-primary' : '',
                      )}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-lg leading-tight">
                        {a.name}
                        {selectedAgent === a.id && (
                          <span className="ml-2 text-[9px] uppercase tracking-[0.24em] text-primary align-middle">
                            · em pauta
                          </span>
                        )}
                      </p>
                      {a.description && (
                        <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1 italic">
                          {a.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Editorial brief */}
            <div className="mb-10">
              <div className="flex items-baseline justify-between border-b border-border pb-2 mb-3">
                <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  Sua pauta
                </p>
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Enter · publicar
                </p>
              </div>
              <div className="relative border-t-2 border-b-2 border-foreground bg-background">
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
                  placeholder="Escreva sua pergunta, brief ou tema..."
                  disabled={send.isPending}
                  className="min-h-[120px] max-h-[280px] resize-none border-0 rounded-none focus-visible:ring-0 shadow-none bg-transparent font-serif text-xl italic leading-relaxed placeholder:text-muted-foreground/60 pl-4 pr-4 py-5"
                />
                <div className="flex items-center justify-between border-t border-border/60 px-3 py-2">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {input.length} caracteres
                  </span>
                  <button
                    onClick={() => handleSubmit()}
                    disabled={!input.trim() || send.isPending}
                    className="flex items-center gap-2 px-5 py-2 bg-foreground text-background text-[11px] uppercase tracking-[0.24em] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-foreground/85 transition"
                  >
                    {send.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                    Publicar edição →
                  </button>
                </div>
              </div>
            </div>

            {/* Suggested pautas */}
            <div>
              <div className="flex items-baseline justify-between border-b border-border pb-2 mb-3">
                <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  Pautas sugeridas
                </p>
              </div>
              <div className="divide-y divide-border">
                {PAUTAS.map((p, i) => (
                  <button
                    key={p}
                    onClick={() => handleSubmit(p)}
                    disabled={send.isPending}
                    className="group w-full flex items-baseline gap-6 py-4 text-left hover:bg-muted/30 transition disabled:opacity-50 px-2 -mx-2"
                  >
                    <span className="font-serif italic text-xl text-muted-foreground w-6 shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 font-serif text-lg text-foreground/90 group-hover:text-foreground">
                      “{p}”
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground opacity-0 group-hover:opacity-100 transition">
                      Encomendar →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
