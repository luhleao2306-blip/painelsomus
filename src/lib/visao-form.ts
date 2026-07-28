// Modelo do formulário "Visão de Futuro" (originalmente em somus-visao.lovable.app),
// recriado dentro do portal para que as respostas caiam direto no painel.

export type HorizonKey = '12m' | '36m' | '5a';

export const HORIZONS: { key: HorizonKey; label: string }[] = [
  { key: '12m', label: '12 meses' },
  { key: '36m', label: '36 meses' },
  { key: '5a', label: '5 anos' },
];

export type VisaoSection = {
  id: string;
  number: string;
  title: string;
  intro?: string;
  prompts?: string[];
  /** seção com 3 horizontes (textarea por horizonte) */
  horizons?: boolean;
  /** campos simples */
  fields?: { id: string; label: string; long?: boolean }[];
  /** três resultados inegociáveis por horizonte */
  results?: boolean;
};

export const VISAO_SECTIONS: VisaoSection[] = [
  {
    id: 'identificacao',
    number: '00',
    title: 'Identificação',
    fields: [
      { id: 'empresa', label: 'Nome do escritório / empresa' },
      { id: 'programa', label: 'Programa / frente de consultoria' },
      { id: 'nome', label: 'Seu nome' },
      { id: 'funcao', label: 'Sua função' },
      { id: 'email', label: 'E-mail (opcional)' },
      { id: 'horizontes_ref', label: 'Horizontes (mês/ano de referência)' },
    ],
  },
  {
    id: 'proposito',
    number: '01',
    title: 'Propósito, essência e direção',
    intro:
      'Antes do tamanho, a alma. O que o escritório quer construir, por que isso importa e qual tipo de projeto deseja assinar.',
    prompts: [
      'Por quais entregas, experiências ou resultados o escritório quer ser lembrado?',
      'O que o escritório faz de um jeito próprio, difícil de copiar?',
      'Se pudesse escolher 100% dos clientes e projetos, quais seriam?',
    ],
    horizons: true,
  },
  {
    id: 'modelo',
    number: '02',
    title: 'Modelo de negócio e receita',
    intro:
      'A ambição econômica do escritório: tamanho, margem, previsibilidade, fontes de receita e qualidade do crescimento.',
    prompts: [
      'Qual faturamento anual o escritório deseja em cada horizonte? E qual margem saudável precisa sustentar?',
      'Qual ticket médio, modelo de cobrança ou composição de receita faz sentido para esse posicionamento?',
      'Que novas fontes de receita podem existir sem ferir a essência do escritório?',
    ],
    horizons: true,
  },
  {
    id: 'carteira',
    number: '03',
    title: 'Carteira, clientes e canais de entrada',
    intro:
      'O mix ideal de clientes, projetos, indicações, canais comerciais e dependências que precisam ser reduzidas.',
    prompts: [
      'Qual seria o perfil de cliente ideal: tipo, localização, orçamento, maturidade e expectativa?',
      'Qual proporção saudável entre indicações, recorrência, canais digitais, parcerias e prospecção ativa?',
      'Quantos projetos ou contratos simultâneos o escritório consegue sustentar com qualidade?',
    ],
    horizons: true,
  },
  {
    id: 'equipe',
    number: '04',
    title: 'Equipe, estrutura e papéis de liderança',
    intro:
      'O time necessário para sustentar a visão: funções, senioridade, responsabilidades, liderança intermediária e autonomia.',
    prompts: [
      'Quais funções precisam existir para a operação não depender excessivamente dos sócios?',
      'Quais papéis de liderança precisam ser formados ou contratados?',
      'Como as decisões devem ser distribuídas entre sócios, liderança e equipe?',
    ],
    horizons: true,
  },
  {
    id: 'socios',
    number: '05',
    title: 'Papel dos sócios e da liderança',
    intro:
      'A visão precisa mostrar do que a liderança quer se libertar e onde sua presença realmente gera valor.',
    prompts: [
      'O que os sócios fazem hoje que não deveriam mais fazer em 12, 36 e 60 meses?',
      'Onde a liderança agrega valor de verdade: estratégia, criação, relacionamento, vendas, gestão ou cultura?',
      'Quantas horas por semana a liderança quer dedicar ao escritório, e fazendo o quê?',
    ],
    horizons: true,
  },
  {
    id: 'marca',
    number: '06',
    title: 'Marca, reputação e presença',
    intro: 'Como o mercado enxerga o escritório hoje e como deve passar a enxergar no futuro.',
    prompts: [
      'Que reputação o nome do escritório precisa carregar no mercado?',
      'Onde a marca precisa ser vista: mídia, eventos, publicações, redes, indicações, premiações ou parcerias?',
      'Qual frase você gostaria de ouvir de um cliente, parceiro ou colaborador sobre o escritório?',
    ],
    horizons: true,
  },
  {
    id: 'operacao',
    number: '07',
    title: 'Operação, processos e qualidade',
    intro:
      'Como o escritório funciona por dentro quando está maduro: previsibilidade, fluidez, método, indicadores e menos retrabalho.',
    prompts: [
      'Como uma demanda entra, avança e é entregue no escritório ideal?',
      'O que precisa parar de acontecer: atraso, retrabalho, ruído, refação, urgência artificial ou perda de margem?',
      'Como a liderança deve saber, sem perguntar o tempo todo, se tudo está no prazo, no padrão e com qualidade?',
    ],
    horizons: true,
  },
  {
    id: 'vida',
    number: '08',
    title: 'Vida, tempo e realização',
    intro:
      'O negócio precisa servir à vida dos sócios e da equipe, não consumir tudo. A visão também deve mostrar o tipo de vida que o escritório sustenta.',
    prompts: [
      'O que o escritório precisa permitir na vida pessoal: tempo, tranquilidade, segurança financeira, presença familiar ou liberdade?',
      'Como você quer se sentir ao acordar numa segunda-feira daqui a 5 anos?',
      "Qual será o sinal mais concreto de que 'deu certo'?",
    ],
    horizons: true,
  },
  {
    id: 'fechando',
    number: '09',
    title: 'Fechando a visão',
    intro:
      'Depois de percorrer as oito dimensões, destile tudo em poucas frases. Esta parte será usada como bússola do programa.',
    fields: [
      { id: 'visao_final', label: 'Visão final', long: true },
      { id: 'essencia', label: 'Essência', long: true },
      { id: 'direcao', label: 'Direção', long: true },
    ],
  },
  {
    id: 'resultados',
    number: '10',
    title: 'Os 3 resultados inegociáveis de cada horizonte',
    results: true,
  },
];

/** Todas as chaves de resposta do formulário, na ordem de exibição. */
export function visaoFieldKeys(): { key: string; label: string; section: string }[] {
  const out: { key: string; label: string; section: string }[] = [];
  for (const s of VISAO_SECTIONS) {
    if (s.fields) {
      for (const f of s.fields) out.push({ key: `${s.id}.${f.id}`, label: f.label, section: s.title });
    }
    if (s.horizons) {
      for (const h of HORIZONS) out.push({ key: `${s.id}.${h.key}`, label: h.label, section: s.title });
    }
    if (s.results) {
      for (const h of HORIZONS) {
        for (let i = 1; i <= 3; i++) {
          out.push({ key: `${s.id}.${h.key}.${i}`, label: `${h.label} — ${i}`, section: s.title });
        }
      }
    }
  }
  return out;
}

export function visaoProgress(answers: Record<string, any>): number {
  const keys = visaoFieldKeys();
  if (keys.length === 0) return 0;
  const filled = keys.filter(k => String(answers?.[k.key] ?? '').trim().length > 0).length;
  return Math.round((filled / keys.length) * 100);
}

export const FORM_TEMPLATES = [
  {
    key: 'visao_futuro',
    name: 'Visão de Futuro',
    description:
      'Diagnóstico estratégico em 8 dimensões, 3 horizontes (12 meses, 36 meses e 5 anos) e os resultados inegociáveis do escritório.',
    sections: VISAO_SECTIONS.length,
  },
] as const;
