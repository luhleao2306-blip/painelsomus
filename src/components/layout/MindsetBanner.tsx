import { useEffect, useMemo, useState } from 'react';
import { useLocation } from '@tanstack/react-router';

type Topic = {
  key: string;
  label: string;
  phrases: string[];
};

// Ensinos da Alcateia — cultura Somus
const TOPICS: Topic[] = [
  {
    key: 'financeiro',
    label: 'Lealdade da Alcateia',
    phrases: [
      'O lobo cuida da caça hoje para alimentar a alcateia amanhã.',
      'Cada contrato bem cuidado é um inverno garantido para o bando.',
      'Disciplina financeira é a pelagem que protege a alcateia do frio.',
      'O lobo alfa sabe: cuidar do território é cuidar dos seus.',
    ],
  },
  {
    key: 'comercial',
    label: 'Caça da Alcateia',
    phrases: [
      'Lobos não caçam sozinhos — cercam juntos.',
      'A presa do dia nasce do rastro de ontem.',
      'Paciência no rastreio, precisão no bote.',
      'Toda grande caça começa com uma conversa silenciosa entre lobos.',
    ],
  },
  {
    key: 'projetos',
    label: 'Marcha da Alcateia',
    phrases: [
      'A alcateia caminha no ritmo do mais cansado, mas chega junta.',
      'Entrega feita é território conquistado.',
      'O combinado nunca sai caro — entre lobos, a palavra é uivo.',
      'Quem documenta a trilha, ensina a alcateia inteira.',
    ],
  },
  {
    key: 'clientes',
    label: 'Confiança do Bando',
    phrases: [
      'Lobo bom escuta antes de uivar.',
      'A confiança da alcateia se constrói em cada caça compartilhada.',
      'Cliente bem ouvido é parceiro de matilha.',
      'Quem encanta o bando, retém o território.',
    ],
  },
  {
    key: 'tarefas',
    label: 'Foco do Lobo',
    phrases: [
      'O lobo solitário foca uma presa por vez — e a derruba.',
      'Curiosidade afia os sentidos. Foco afia a presa.',
      'Disciplina vence motivação em toda alcateia.',
      'Pequenas caças diárias alimentam grandes invernos.',
    ],
  },
  {
    key: 'agenda',
    label: 'Tempo da Alcateia',
    phrases: [
      'Sua agenda é o mapa do território da alcateia.',
      'Reunião sem pauta é uivo no vazio.',
      'O lobo alfa bloqueia tempo para o estratégico.',
      'Pontualidade é respeito pela matilha.',
    ],
  },
  {
    key: 'contratos',
    label: 'Pacto entre Lobos',
    phrases: [
      'Contrato claro evita disputa de território.',
      'O pacto assinado hoje protege a alcateia amanhã.',
      'Entre lobos, a palavra vale — entre humanos, vale o contrato.',
      'Transparência contratual é lealdade de matilha.',
    ],
  },
  {
    key: 'conhecimento',
    label: 'Sabedoria da Alcateia',
    phrases: [
      'Lobo que aprende todo dia, lidera a próxima caça.',
      'Conhecimento compartilhado fortalece toda a matilha.',
      'A alcateia ensina filhote por filhote — assim multiplica.',
      'Curiosidade é o que separa o lobo do cão.',
    ],
  },
  {
    key: 'dashboard',
    label: 'Uivo do Dia',
    phrases: [
      'Sozinho o lobo é forte, junto a alcateia é invencível.',
      'O lobo alfa não grita — ele caminha à frente.',
      'Cada uivo encontra um eco na alcateia.',
      'Lealdade primeiro. Resultado em seguida. Sempre nessa ordem.',
      'A alcateia que caça unida, vence o inverno mais longo.',
    ],
  },
];

const DEFAULT_TOPIC = TOPICS[TOPICS.length - 1];

function pickTopic(pathname: string): Topic {
  const p = pathname.toLowerCase();
  if (p.startsWith('/financial') || p.startsWith('/sales-performance')) return TOPICS[0];
  if (p.startsWith('/comercial')) return TOPICS[1];
  if (
    p.startsWith('/projects') || p.startsWith('/projetos') ||
    p.startsWith('/processes') || p.startsWith('/time-report')
  ) return TOPICS[2];
  if (
    p.startsWith('/clients') || p.startsWith('/clientes') ||
    p.startsWith('/registrations') || p.startsWith('/collaborators')
  ) return TOPICS[3];
  if (p.startsWith('/tasks')) return TOPICS[4];
  if (p.startsWith('/agenda') || p.startsWith('/meetings') || p.startsWith('/atas')) return TOPICS[5];
  if (p.startsWith('/contracts') || p.startsWith('/contrato')) return TOPICS[6];
  if (
    p.startsWith('/documents') || p.startsWith('/info-center') ||
    p.startsWith('/knowledge-trail') || p.startsWith('/intelligent-central') ||
    p.startsWith('/system-docs')
  ) return TOPICS[7];
  return DEFAULT_TOPIC;
}

export function MindsetBanner() {
  const { pathname } = useLocation();
  const topic = useMemo(() => pickTopic(pathname), [pathname]);
  const [idx, setIdx] = useState(0);

  useEffect(() => { setIdx(0); }, [topic.key]);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % topic.phrases.length);
    }, 7000);
    return () => clearInterval(id);
  }, [topic.phrases.length]);

  return (
    <div className="mb-6 relative overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white shadow-xl">
      {/* Pegadas de lobo sutis no fundo */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, white 1px, transparent 2px), radial-gradient(circle at 60% 70%, white 1px, transparent 2px), radial-gradient(circle at 85% 20%, white 1px, transparent 2px)",
          backgroundSize: '120px 120px',
        }}
      />
      {/* Lua */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 h-24 w-24 rounded-full bg-gradient-to-br from-slate-200/20 to-slate-400/5 blur-xl pointer-events-none" />

      <div className="relative flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm text-2xl border border-white/10">
            🐺
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orange-300/90">
              {topic.label}
            </p>
            <p className="mt-1 text-base font-semibold leading-snug transition-opacity duration-500 sm:text-lg">
              "{topic.phrases[idx]}"
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {topic.phrases.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === idx ? 'w-6 bg-orange-300' : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
