import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getSomusConversation, sendSomusMessage, listSomusAgents } from '@/lib/somus-ia.functions';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export const Route = createFileRoute('/somus-ia/$conversationId')({
  component: ChatPage,
});

function fmt(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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
    onError: (e: any) => toast.error(e?.message ?? 'Erro'),
  });

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center font-serif italic max-w-md">
          <p className="text-2xl">Esta edição não existe.</p>
          <Button variant="link" className="mt-2" onClick={() => navigate({ to: '/somus-ia' })}>
            → Encomendar nova edição
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center gap-3 font-serif italic text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Recuperando edição...
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
      {/* Editorial header */}
      <header className="px-12 pt-10 pb-6 border-b-2 border-foreground">
        <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.32em] mb-3">
          <span>Coluna · {agent?.name ?? 'Redação'}</span>
          <span>{new Date(data.conversation.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl leading-[1.05] tracking-tight text-foreground max-w-3xl">
          {data.conversation.title}
        </h1>
      </header>

      {/* Editorial body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-12 py-10 space-y-14">
          {data.messages.map((m, idx) => {
            const isUser = m.role === 'user';
            const num = String(idx + 1).padStart(2, '0');

            if (isUser) {
              return (
                <section key={m.id} className="relative pl-8 border-l-2 border-primary animate-fade-in">
                  <div className="flex items-baseline gap-3 text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-3">
                    <span className="font-serif italic text-primary text-base normal-case tracking-normal">
                      §{num}
                    </span>
                    <span>Pergunta do leitor</span>
                    <span>·</span>
                    <span>{fmt(m.created_at)}</span>
                  </div>
                  <p className="font-serif text-2xl italic leading-snug text-foreground whitespace-pre-wrap">
                    “{m.content}”
                  </p>
                </section>
              );
            }

            return (
              <article key={m.id} className="animate-fade-in">
                <div className="flex items-baseline gap-3 text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-4 pb-3 border-b border-border">
                  <span className="font-serif italic text-foreground text-base normal-case tracking-normal">
                    §{num}
                  </span>
                  <span>Resposta editorial · {agent?.name ?? 'Redação'}</span>
                  <span>·</span>
                  <span>{fmt(m.created_at)}</span>
                </div>
                <div className="prose prose-lg dark:prose-invert max-w-none font-serif prose-p:leading-relaxed prose-p:text-foreground/90 prose-p:my-4 prose-headings:font-serif prose-headings:font-normal prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-primary prose-blockquote:italic prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-code:text-primary prose-code:font-mono">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </article>
            );
          })}

          {send.isPending && (
            <article className="animate-fade-in">
              <div className="flex items-baseline gap-3 text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-4 pb-3 border-b border-border">
                <span>Redigindo próxima resposta...</span>
              </div>
              <div className="space-y-3">
                <div className="h-3 bg-muted rounded animate-pulse w-11/12" />
                <div className="h-3 bg-muted rounded animate-pulse w-full" />
                <div className="h-3 bg-muted rounded animate-pulse w-9/12" />
                <div className="h-3 bg-muted rounded animate-pulse w-10/12" />
              </div>
            </article>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer as editorial footer */}
      <div className="border-t-2 border-foreground bg-background">
        <div className="max-w-3xl mx-auto px-12 py-4">
          <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
            <span>Continuar a pauta</span>
            <span>Enter · publicar</span>
          </div>
          <div className="relative border-t border-b border-foreground/60">
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
              placeholder="Escreva sua próxima pergunta..."
              disabled={send.isPending}
              className="min-h-[64px] max-h-[200px] resize-none border-0 rounded-none focus-visible:ring-0 shadow-none bg-transparent font-serif text-lg italic placeholder:text-muted-foreground/60 pl-2 pr-32 py-4"
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || send.isPending}
              className="absolute right-2 bottom-2 flex items-center gap-2 px-4 py-2 bg-foreground text-background text-[10px] uppercase tracking-[0.24em] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-foreground/85 transition"
            >
              {send.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Publicar →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
