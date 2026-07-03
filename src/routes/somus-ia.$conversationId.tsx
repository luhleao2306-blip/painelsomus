import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getSomusConversation, sendSomusMessage, listSomusAgents } from '@/lib/somus-ia.functions';
import { useProfile } from '@/hooks/use-profile';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUp, User as UserIcon, Sparkles, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export const Route = createFileRoute('/somus-ia/$conversationId')({
  component: BoardPage,
});

type Pos = { x: number; y: number };

// Deterministic starting positions in a soft zig-zag
function defaultPos(index: number): Pos {
  const row = Math.floor(index / 2);
  const col = index % 2;
  const jitter = ((index * 47) % 40) - 20;
  return {
    x: 120 + col * 480 + jitter,
    y: 120 + row * 340 + (col === 1 ? 80 : 0),
  };
}

function BoardPage() {
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
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const [pan, setPan] = useState<Pos>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<
    | { type: 'card'; id: string; startX: number; startY: number; origX: number; origY: number }
    | { type: 'pan'; startX: number; startY: number; origX: number; origY: number }
    | null
  >(null);

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

  // Initialize positions when messages load / grow
  useEffect(() => {
    if (!data?.messages) return;
    setPositions((prev) => {
      const next = { ...prev };
      data.messages.forEach((m, i) => {
        if (!next[m.id]) next[m.id] = defaultPos(i);
      });
      return next;
    });
  }, [data?.messages]);

  const onCardPointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      if ((e.target as HTMLElement).closest('[data-nodrag]')) return;
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const pos = positions[id] ?? { x: 0, y: 0 };
      dragState.current = {
        type: 'card',
        id,
        startX: e.clientX,
        startY: e.clientY,
        origX: pos.x,
        origY: pos.y,
      };
    },
    [positions],
  );

  const onCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('[data-card]')) return;
      if ((e.target as HTMLElement).closest('[data-composer]')) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragState.current = {
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        origX: pan.x,
        origY: pan.y,
      };
    },
    [pan],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const st = dragState.current;
    if (!st) return;
    const dx = (e.clientX - st.startX) / (st.type === 'card' ? zoom : 1);
    const dy = (e.clientY - st.startY) / (st.type === 'card' ? zoom : 1);
    if (st.type === 'card') {
      setPositions((p) => ({ ...p, [st.id]: { x: st.origX + dx, y: st.origY + dy } }));
    } else {
      setPan({ x: st.origX + (e.clientX - st.startX), y: st.origY + (e.clientY - st.startY) });
    }
  }, [zoom]);

  const onPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  // Connectors between consecutive messages
  const connectors = useMemo(() => {
    if (!data?.messages) return [];
    const links: { from: string; to: string }[] = [];
    for (let i = 1; i < data.messages.length; i++) {
      links.push({ from: data.messages[i - 1].id, to: data.messages[i].id });
    }
    return links;
  }, [data?.messages]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center max-w-md">
          <p className="text-sm font-medium">Board não encontrado</p>
          <Button variant="link" className="mt-2" onClick={() => navigate({ to: '/somus-ia' })}>
            Iniciar novo board
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center gap-2 text-neutral-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando board...
      </div>
    );
  }

  const agent = agents.find((a) => a.id === data.conversation.agent_id);
  const submit = () => {
    const v = input.trim();
    if (!v || send.isPending) return;
    send.mutate(v);
    setInput('');
  };

  const CARD_W = 380;
  const CARD_H_EST = 240;

  return (
    <div className="relative flex-1 overflow-hidden bg-white select-none">
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #d4d4d4 1px, transparent 1px)',
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Board title chip */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur border border-neutral-200 pl-3 pr-4 py-1.5 shadow-sm">
        <div className="h-5 w-5 rounded-sm bg-neutral-900" />
        <p className="text-[13px] font-medium truncate max-w-[240px]">{data.conversation.title}</p>
        <span className="text-[11px] text-neutral-400">·</span>
        <span className="text-[11px] text-neutral-500">{agent?.name}</span>
      </div>

      {/* Zoom / view controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 rounded-full bg-white/90 backdrop-blur border border-neutral-200 px-1 py-1 shadow-sm">
        <button
          onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}
          className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-700 text-sm"
        >
          −
        </button>
        <span className="text-[11px] text-neutral-500 tabular-nums w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))}
          className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-700 text-sm"
        >
          +
        </button>
        <div className="w-px h-4 bg-neutral-200 mx-0.5" />
        <button
          onClick={resetView}
          className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-600"
          title="Centralizar"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* SVG connectors */}
          <svg
            className="absolute top-0 left-0 pointer-events-none overflow-visible"
            style={{ width: 1, height: 1 }}
          >
            {connectors.map((c) => {
              const a = positions[c.from];
              const b = positions[c.to];
              if (!a || !b) return null;
              const ax = a.x + CARD_W / 2;
              const ay = a.y + CARD_H_EST / 2;
              const bx = b.x + CARD_W / 2;
              const by = b.y + CARD_H_EST / 2;
              const midY = (ay + by) / 2;
              const path = `M ${ax} ${ay} C ${ax} ${midY}, ${bx} ${midY}, ${bx} ${by}`;
              return (
                <path
                  key={`${c.from}-${c.to}`}
                  d={path}
                  stroke="#d4d4d4"
                  strokeWidth={1.5}
                  fill="none"
                  strokeDasharray="4 4"
                />
              );
            })}
          </svg>

          {/* Cards */}
          {data.messages.map((m, i) => {
            const pos = positions[m.id] ?? defaultPos(i);
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                data-card
                onPointerDown={(e) => onCardPointerDown(e, m.id)}
                className={cn(
                  'absolute rounded-2xl border shadow-[0_4px_20px_-8px_rgba(0,0,0,0.12)] cursor-grab active:cursor-grabbing transition-shadow hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.2)]',
                  isUser
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-900 border-neutral-200',
                )}
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: CARD_W,
                }}
              >
                <div
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 border-b',
                    isUser ? 'border-white/10' : 'border-neutral-100',
                  )}
                >
                  <div
                    className={cn(
                      'h-5 w-5 rounded-full flex items-center justify-center',
                      isUser ? 'bg-white/15' : 'bg-neutral-900',
                    )}
                  >
                    {isUser ? (
                      <UserIcon className="h-3 w-3 text-white" />
                    ) : (
                      <Sparkles className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <p
                    className={cn(
                      'text-[11px] uppercase tracking-wider font-medium',
                      isUser ? 'text-white/70' : 'text-neutral-500',
                    )}
                  >
                    {isUser ? 'Você' : agent?.name ?? 'IA'}
                  </p>
                  <span
                    className={cn(
                      'ml-auto text-[10px] tabular-nums',
                      isUser ? 'text-white/50' : 'text-neutral-400',
                    )}
                  >
                    #{String(i + 1).padStart(2, '0')}
                  </span>
                </div>

                <div data-nodrag className="px-4 py-3 max-h-[320px] overflow-y-auto">
                  {isUser ? (
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </p>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-p:my-2 prose-headings:mt-3 prose-headings:mb-2 prose-pre:bg-neutral-50 prose-pre:border prose-pre:border-neutral-200 prose-code:text-neutral-900">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {send.isPending && (
            <div
              className="absolute rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm animate-pulse"
              style={{
                left: defaultPos(data.messages.length).x,
                top: defaultPos(data.messages.length).y,
                width: CARD_W,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-5 rounded-full bg-neutral-900 flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
                <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                  Pensando...
                </p>
              </div>
              <div className="space-y-2">
                <div className="h-2.5 bg-neutral-100 rounded w-full" />
                <div className="h-2.5 bg-neutral-100 rounded w-11/12" />
                <div className="h-2.5 bg-neutral-100 rounded w-8/12" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating composer */}
      <div
        data-composer
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-xl px-4"
      >
        <div className="relative rounded-2xl border border-neutral-300 bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] focus-within:border-neutral-900 transition">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Adicionar ao board..."
            disabled={send.isPending}
            className="min-h-[52px] max-h-[160px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent text-[14px] pr-12 pl-4 py-3.5 placeholder:text-neutral-400 text-neutral-900"
          />
          <button
            onClick={submit}
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
        <p className="text-center text-[10px] text-neutral-400 mt-2">
          Arraste os cards · segure e arraste o fundo para navegar · +/− para zoom
        </p>
      </div>
    </div>
  );
}
