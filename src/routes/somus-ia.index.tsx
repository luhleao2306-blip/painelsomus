import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { listSomusAgents, sendSomusMessage } from '@/lib/somus-ia.functions';
import { useProfile } from '@/hooks/use-profile';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/somus-ia/')({
  component: NewBoardPage,
});

const IDEAS = [
  'Brainstorm de nomes para produto',
  'Mapa de stakeholders do projeto',
  'Fluxo de onboarding',
  'Análise SWOT rápida',
];

function NewBoardPage() {
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

  const submit = (text?: string) => {
    const v = (text ?? input).trim();
    if (!v || !selectedAgent || send.isPending) return;
    send.mutate(v);
    setInput('');
  };

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Dot grid canvas */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #d4d4d4 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Center prompt */}
      <div className="relative h-full flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-lg mb-2">
              <span className="text-lg font-semibold tracking-tight">S</span>
            </div>
            <h1 className="text-3xl font-medium tracking-tight text-neutral-900">
              Board vazio.
            </h1>
            <p className="text-[14px] text-neutral-500">
              Comece com uma pergunta — vou espalhar as ideias no canvas.
            </p>
          </div>

          {activeAgents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white/60 p-8 text-center">
              <p className="text-sm font-medium">Nenhum agente disponível</p>
              <p className="text-xs text-neutral-500 mt-1">
                Peça a um administrador para cadastrar um agente.
              </p>
            </div>
          ) : (
            <>
              {/* Composer */}
              <div className="relative rounded-2xl border border-neutral-300 bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] focus-within:border-neutral-900 transition">
                <Textarea
                  ref={taRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder="Ex: quais riscos desse contrato?"
                  disabled={send.isPending}
                  className="min-h-[56px] max-h-[200px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent text-[15px] pr-12 pl-4 py-4 placeholder:text-neutral-400 text-neutral-900"
                />
                <button
                  onClick={() => submit()}
                  disabled={!input.trim() || send.isPending}
                  className="absolute right-2 bottom-2 h-9 w-9 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  {send.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Agent chips */}
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-neutral-500 mr-1">
                  Agente:
                </span>
                {activeAgents.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAgent(a.id)}
                    className={cn(
                      'text-[12px] px-2.5 py-1 rounded-full border transition',
                      selectedAgent === a.id
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-500',
                    )}
                  >
                    {a.name}
                  </button>
                ))}
              </div>

              {/* Ideas */}
              <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                {IDEAS.map((i) => (
                  <button
                    key={i}
                    onClick={() => submit(i)}
                    disabled={send.isPending}
                    className="text-[12px] px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition disabled:opacity-50"
                  >
                    {i}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
