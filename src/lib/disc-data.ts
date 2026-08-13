
export type DISCValue = 'D' | 'I' | 'S' | 'C';

export interface DISCQuestion {
  id: number;
  text: string;
  options: {
    type: DISCValue;
    text: string;
  }[];
}

export interface DISCProfileInfo {
  name: string;
  description: string;
  strengths: string[];
  challenges: string[];
  communication: string;
  leadership: string;
  motivation: string;
  idealEnvironment: string;
  valueToOrganization: string;
}

export const DISC_QUESTIONS_RAW: { text: string; options: Record<DISCValue, string> }[] = [
  { text: "Diante de uma nova situação, eu...", options: { D: "Assumo o comando quando ninguém mais o faz", I: "Animo as pessoas ao meu redor", S: "Mantenho a calma em situações tensas", C: "Verifico os detalhes antes de agir" } },
  { text: "No dia a dia, eu prefiro...", options: { D: "Competir e vencer", I: "Conhecer pessoas novas", S: "Rotinas estáveis", C: "Seguir procedimentos claros" } },
  { text: "Quando preciso decidir, eu...", options: { D: "Tomo decisões rapidamente", I: "Expresso entusiasmo com facilidade", S: "Escuto com paciência até o fim", C: "Analiso prós e contras com cuidado" } },
  { text: "Ao me expressar, eu...", options: { D: "Sou direto ao dizer o que penso", I: "Convenço com argumentos animados", S: "Evito conflitos sempre que posso", C: "Baseio minhas opiniões em fatos" } },
  { text: "O que mais me motiva é...", options: { D: "Buscar novos desafios", I: "Ser otimista mesmo sob pressão", S: "Ser leal a quem confio", C: "Ser exigente com a qualidade" } },
  { text: "Eu gosto de...", options: { D: "Assumir riscos calculados", I: "Ser o centro das conversas", S: "Ajudar discretamente", C: "Organizar e planejar" } },
  { text: "No trabalho em equipe, eu...", options: { D: "Pressiono por resultados rápidos", I: "Crio um clima leve e divertido", S: "Mantenho a constância no trabalho", C: "Garanto que tudo esteja correto" } },
  { text: "Diante de problemas, eu...", options: { D: "Não tenho medo de confrontar", I: "Me adapto facilmente a grupos", S: "Prefiro mudanças graduais", C: "Prefiro decisões baseadas em dados" } },
  { text: "Meu foco principal é...", options: { D: "O objetivo final acima de tudo", I: "Motivar as pessoas", S: "Manter o time unido", C: "Fazer certo da primeira vez" } },
  { text: "Eu valorizo ter...", options: { D: "Autonomia e poder de decisão", I: "Reconhecimento social", S: "Segurança e estabilidade", C: "Clareza nas regras" } },
  { text: "Um traço que me descreve é...", options: { D: "Impaciência com a lentidão", I: "Falo mais do que escuto", S: "Cedo para manter a paz", C: "Sou crítico quando algo está impreciso" } },
  { text: "Eu lidero...", options: { D: "Pelo exemplo e pela iniciativa", I: "Pela inspiração e carisma", S: "Pelo apoio e estabilidade", C: "Pela competência e padrão" } },
  { text: "Eu prefiro...", options: { D: "Resolver agora a esperar", I: "Colaborar a trabalhar sozinho", S: "Ambientes harmoniosos", C: "Processos bem definidos" } },
  { text: "Em relação à mudança, eu...", options: { D: "Encaro como oportunidade", I: "Encaro com bom humor", S: "Valorizo a previsibilidade", C: "Valorizo a precisão e o método" } },
  { text: "Sou movido por...", options: { D: "Metas ambiciosas", I: "Interação e energia", S: "Relações de confiança", C: "Excelência técnica" } },
  { text: "Ao conduzir uma tarefa, eu...", options: { D: "Delego e cobro com firmeza", I: "Engajo as pessoas com entusiasmo", S: "Acompanho com atenção e cuidado", C: "Documento e padronizo o trabalho" } },
  { text: "Sob pressão, eu...", options: { D: "Fico mais assertivo", I: "Busco apoio dos outros", S: "Fico mais reservado", C: "Recorro a regras e dados" } },
  { text: "Quando negocio, eu...", options: { D: "Defendo minhas posições com vigor", I: "Crio rapport e empatia", S: "Busco o consenso", C: "Baseio-me em evidências" } },
  { text: "Em relação ao que existe, eu...", options: { D: "Gosto de quebrar o status quo", I: "Gosto de gerar ideias novas em grupo", S: "Prefiro aperfeiçoar o que funciona", C: "Prefiro melhorar com base em análise" } },
  { text: "Eu me comunico de forma...", options: { D: "Breve e objetiva", I: "Expressiva", S: "Calma e acolhedora", C: "Precisa e formal" } },
  { text: "No grupo, eu sou aquele que...", options: { D: "Aceita responsabilidades difíceis", I: "Contagia com energia positiva", S: "É o ponto de equilíbrio", C: "É a referência de qualidade" } },
  { text: "Uma característica minha é...", options: { D: "Urgência por progresso", I: "Facilidade para improvisar", S: "Paciência para repetir tarefas", C: "Disciplina para revisar tudo" } },
  { text: "Diante de obstáculos, eu...", options: { D: "Não desisto", I: "Recupero rápido de frustrações", S: "Mantenho a serenidade", C: "Antecipo riscos antes que ocorram" } },
  { text: "Eu prefiro...", options: { D: "Liderar a ser liderado", I: "Inspirar a controlar", S: "Cooperar a competir", C: "Analisar a opinar" } },
  { text: "Eu construo valor ao...", options: { D: "Cobrar alto desempenho", I: "Criar conexões genuínas", S: "Construir confiança ao longo do tempo", C: "Entregar soluções robustas e testadas" } },
  { text: "Minha prioridade é...", options: { D: "A vitória", I: "O relacionamento", S: "A estabilidade", C: "A correção" } },
  { text: "Por natureza, eu sou...", options: { D: "Competitivo", I: "Comunicativo", S: "Cooperativo", C: "Cauteloso" } },
  { text: "O que eu mais quero é...", options: { D: "Impacto e resultado", I: "Reconhecimento e influência", S: "Pertencimento e segurança", C: "Domínio técnico e ordem" } },
  { text: "Quando algo dá errado, eu...", options: { D: "Assumo o controle e redireciono", I: "Tento manter o ânimo do time", S: "Procuro estabilizar a situação", C: "Investigo a causa raiz" } },
  { text: "Meu ritmo de trabalho é...", options: { D: "Acelerado e orientado a metas", I: "Dinâmico e variado", S: "Constante e previsível", C: "Metódico e detalhado" } },
  { text: "Em reuniões, eu...", options: { D: "Vou direto ao ponto e decido", I: "Trago energia e ideias", S: "Ouço e busco harmonia", C: "Trago dados e questiono premissas" } },
  { text: "Eu me sinto realizado quando...", options: { D: "Atinjo um resultado difícil", I: "Sou reconhecido pelo grupo", S: "Ajudo o time a prosperar", C: "Entrego algo impecável" } },
  { text: "Diante de regras, eu...", options: { D: "Questiono se atrapalham o resultado", I: "Adapto conforme o contexto social", S: "Sigo para manter a estabilidade", C: "Respeito e valorizo a estrutura" } },
  { text: "Ao liderar uma mudança, eu...", options: { D: "Imponho o ritmo e a direção", I: "Vendo a visão e empolgo as pessoas", S: "Cuido da transição com calma", C: "Planejo cada etapa com rigor" } },
  { text: "Meu maior receio é...", options: { D: "Perder o controle ou a vantagem", I: "Ser rejeitado ou ignorado", S: "Conflitos e instabilidade", C: "Cometer erros ou ser criticado" } },
  { text: "Eu aprendo melhor...", options: { D: "Na prática, testando rápido", I: "Discutindo e trocando com pessoas", S: "Com tempo e acompanhamento", C: "Estudando a fundo e estruturando" } },
  { text: "Em um projeto novo, eu primeiro...", options: { D: "Defino metas e parto para a ação", I: "Reúno pessoas e gero entusiasmo", S: "Organizo o time e os papéis", C: "Mapeio requisitos e riscos" } },
  { text: "As pessoas me veem como alguém...", options: { D: "Determinado e exigente", I: "Carismático e otimista", S: "Confiável e paciente", C: "Preciso e analítico" } },
  { text: "Quando há urgência, eu...", options: { D: "Tomo a frente e decido por todos", I: "Mobilizo o grupo rapidamente", S: "Mantenho a equipe estável", C: "Garanto que nada seja esquecido" } },
  { text: "Meu estilo de feedback é...", options: { D: "Direto e focado em resultados", I: "Caloroso e encorajador", S: "Cuidadoso e respeitoso", C: "Detalhado e fundamentado" } },
];

export function getDeterministicShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let m = result.length, t, i;
  while (m) {
    i = Math.floor(Math.abs(Math.sin(seed++)) * m--);
    t = result[m];
    result[m] = result[i];
    result[i] = t;
  }
  return result;
}

export const DISC_PROFILES: Record<string, DISCProfileInfo> = {
  D: {
    name: "O Diretor",
    description: "Perfil dominante, focado em resultados e eficiência. Toma decisões rápidas e aprecia desafios e autonomia.",
    strengths: ["Orientação para resultados", "Liderança nata", "Decisão sob pressão", "Foco em metas"],
    challenges: ["Pode ser impaciente", "Dificuldade em delegar autoridade", "Pode parecer insensível"],
    communication: "Direta, breve e objetiva.",
    leadership: "Liderança por comando e direção clara.",
    motivation: "Resultados, poder e superação de desafios.",
    idealEnvironment: "Dinâmico, competitivo e com autonomia.",
    valueToOrganization: "Impulsiona o time a bater metas e superar obstáculos."
  },
  I: {
    name: "O Influenciador",
    description: "Perfil comunicativo, entusiasmado e otimista. Valoriza relacionamentos e tem grande poder de persuasão.",
    strengths: ["Comunicação persuasiva", "Otimismo contagiante", "Facilidade em criar redes", "Criatividade"],
    challenges: ["Dificuldade com detalhes técnicos", "Pode se dispersar facilmente", "Necessidade constante de aprovação"],
    communication: "Expressiva, entusiasmada e amigável.",
    leadership: "Liderança por inspiração e carisma.",
    motivation: "Reconhecimento social e interação com pessoas.",
    idealEnvironment: "Social, colaborativo e criativo.",
    valueToOrganization: "Mantém o clima positivo e engaja o time na visão."
  },
  S: {
    name: "O Estável",
    description: "Perfil paciente, leal e bom ouvinte. Busca harmonia, segurança e prefere rotinas previsíveis.",
    strengths: ["Lealdade e confiabilidade", "Paciência e escuta ativa", "Trabalho em equipe", "Persistência"],
    challenges: ["Resistência a mudanças bruscas", "Dificuldade em dizer não", "Pode evitar conflitos necessários"],
    communication: "Calma, acolhedora e atenciosa.",
    leadership: "Liderança por apoio e estabilidade.",
    motivation: "Segurança, lealdade e ambiente harmonioso.",
    idealEnvironment: "Previsível, seguro e sem conflitos.",
    valueToOrganization: "Traz estabilidade e consistência operacional ao grupo."
  },
  C: {
    name: "O Analítico",
    description: "Perfil detalhista, preciso e sistemático. Baseia-se em fatos e dados para garantir a qualidade e conformidade.",
    strengths: ["Precisão técnica", "Pensamento analítico", "Organização e método", "Foco na qualidade"],
    challenges: ["Perfeccionismo excessivo", "Pode ser excessivamente crítico", "Dificuldade em agir sem todos os dados"],
    communication: "Precisa, formal e baseada em fatos.",
    leadership: "Liderança pela competência e padrão de qualidade.",
    motivation: "Precisão, excelência técnica e ordem.",
    idealEnvironment: "Estruturado, organizado e com clareza de regras.",
    valueToOrganization: "Garante que os processos sejam seguidos com perfeição."
  },
  DI: {
    name: "O Resultante",
    description: "Combina a dominância do D com a influência do I. São dinâmicos, ambiciosos e altamente persuasivos.",
    strengths: ["Alta energia", "Persuasão estratégica", "Iniciativa rápida", "Foco em expansão"],
    challenges: ["Pode ser autoritário", "Impaciência com processos lentos", "Pode negligenciar detalhes"],
    communication: "Assertiva e motivadora.",
    leadership: "Liderança carismática e voltada para ação.",
    motivation: "Conquistas rápidas e reconhecimento.",
    idealEnvironment: "Ambiente de alto crescimento e desafios.",
    valueToOrganization: "Abre novos mercados e acelera o crescimento."
  },
  DC: {
    name: "O Criativo",
    description: "Une a força do D com a precisão do C. Foca em resultados através de soluções inteligentes e estruturadas.",
    strengths: ["Resolução técnica de problemas", "Foco em eficiência", "Independência", "Visão sistêmica"],
    challenges: ["Pode parecer frio ou distante", "Exigência extrema", "Dificuldade em lidar com emoções"],
    communication: "Lógica, direta e técnica.",
    leadership: "Liderança focada em competência e resultados.",
    motivation: "Eficiência máxima e soluções inovadoras.",
    idealEnvironment: "Onde o raciocínio lógico e a autonomia reinam.",
    valueToOrganization: "Cria sistemas eficientes e resolve problemas complexos."
  },
  DS: {
    name: "O Realizador",
    description: "Combina a direção do D com a constância do S. São persistentes, focados e entregam resultados com consistência.",
    strengths: ["Persistência", "Confiabilidade", "Foco em metas de longo prazo", "Equilíbrio entre ação e paciência"],
    challenges: ["Pode ser teimoso", "Dificuldade em mudar de rumo se já começou", "Pode guardar frustrações"],
    communication: "Objetiva mas respeitosa.",
    leadership: "Liderança firme e constante.",
    motivation: "Estabilidade com progresso e reconhecimento da entrega.",
    idealEnvironment: "Onde o esforço persistente é valorizado.",
    valueToOrganization: "Garante que os projetos cheguem ao fim com sucesso."
  },
  ID: {
    name: "O Promotor",
    description: "Influenciador com toque de dominância. Grande habilidade em vender ideias e liderar através do entusiasmo.",
    strengths: ["Networking poderoso", "Iniciativa social", "Capacidade de inspirar", "Otimismo orientado a resultados"],
    challenges: ["Pode exagerar promessas", "Falta de acompanhamento", "Pode dominar as conversas"],
    communication: "Vibrante, persuasiva e confiante.",
    leadership: "Liderança entusiasmada que puxa o time.",
    motivation: "Novidades, prestígio e liberdade de ação.",
    idealEnvironment: "Onde possa influenciar e estar em destaque.",
    valueToOrganization: "Promove a marca e atrai talentos/clientes."
  },
  IC: {
    name: "O Avaliador",
    description: "Influenciador com base analítica. Combina carisma com a necessidade de verificar se as coisas fazem sentido.",
    strengths: ["Comunicação clara", "Capacidade de explicar dados", "Equilíbrio social e técnico", "Criatividade estruturada"],
    challenges: ["Indecisão entre intuição e lógica", "Pode procrastinar por análise", "Sensibilidade a críticas técnicas"],
    communication: "Explicativa, amigável e fundamentada.",
    leadership: "Liderança que ensina e inspira.",
    motivation: "Entendimento profundo e aprovação social.",
    idealEnvironment: "Onde possa aprender e compartilhar conhecimento.",
    valueToOrganization: "Faz a ponte entre a estratégia e a execução técnica."
  },
  IS: {
    name: "O Relacional",
    description: "Influenciador estável. Focado totalmente no bem-estar das pessoas e na harmonia do time.",
    strengths: ["Empatia profunda", "Mediação de conflitos", "Colaboração genuína", "Escuta generosa"],
    challenges: ["Dificuldade em cobrar resultados", "Pode ser passivo demais", "Tende a evitar qualquer atrito"],
    communication: "Suave, empática e calorosa.",
    leadership: "Liderança servidora e acolhedora.",
    motivation: "Ajudar os outros e ter harmonia no grupo.",
    idealEnvironment: "Acolhedor, colaborativo e de baixo estresse.",
    valueToOrganization: "É a 'cola' que mantém a cultura e o time unidos."
  },
  SD: {
    name: "O Especialista",
    description: "Estável com foco em resultados. Trabalha duro nos bastidores para garantir que os objetivos sejam alcançados.",
    strengths: ["Foco na execução", "Lealdade aos objetivos", "Resiliência", "Trabalho silencioso e eficaz"],
    challenges: ["Pode se sobrecarregar por não delegar", "Dificuldade em expressar discórdia", "Lentidão em iniciar mudanças"],
    communication: "Prudente e focada na tarefa.",
    leadership: "Liderança pelo suporte e exemplo constante.",
    motivation: "Cumprir o dever e ter segurança.",
    idealEnvironment: "Focado, produtivo e estável.",
    valueToOrganization: "Executa a estratégia com perfeição e lealdade."
  },
  SI: {
    name: "O Conselheiro",
    description: "Estável influenciador. Ótimo em aconselhar e apoiar as pessoas de forma calma e inspiradora.",
    strengths: ["Suporte emocional", "Paciência pedagógica", "Comunicação gentil", "Confiabilidade social"],
    challenges: ["Tende a absorver o estresse alheio", "Pode demorar a tomar decisões", "Falta de assertividade"],
    communication: "Incentivadora e tranquila.",
    leadership: "Liderança que guia e desenvolve pessoas.",
    motivation: "Desenvolvimento humano e paz.",
    idealEnvironment: "Onde o apoio mútuo é a regra.",
    valueToOrganization: "Mentor natural que desenvolve a equipe."
  },
  SC: {
    name: "O Técnico",
    description: "Estável analítico. Extremamente confiável e metódico na execução de processos técnicos.",
    strengths: ["Atenção aos detalhes", "Metodologia rigorosa", "Constância técnica", "Organização documental"],
    challenges: ["Excesso de formalismo", "Resistência a improvisos", "Pode se perder em micro-detalhes"],
    communication: "Documentada, lenta e precisa.",
    leadership: "Liderança focada no cumprimento de normas.",
    motivation: "Ordem, clareza e previsibilidade técnica.",
    idealEnvironment: "Onde existam manuais e processos claros.",
    valueToOrganization: "Mantém a qualidade e os padrões técnicos sem falhas."
  },
  CD: {
    name: "O Perfeccionista",
    description: "Analítico com foco em resultados. Busca a excelência absoluta e não aceita nada menos que o melhor.",
    strengths: ["Padrões altíssimos", "Visão crítica aguçada", "Determinação técnica", "Eficiência lógica"],
    challenges: ["Hiper-crítico consigo e com os outros", "Dificuldade em soltar o controle", "Pode ser inflexível"],
    communication: "Direta, exigente e baseada em dados.",
    leadership: "Liderança exigente e voltada para a perfeição.",
    motivation: "Excelência absoluta e controle de qualidade.",
    idealEnvironment: "Onde a competência técnica é soberana.",
    valueToOrganization: "Eleva o nível de entrega de toda a organização."
  },
  CI: {
    name: "O Facilitador",
    description: "Analítico influenciador. Usa dados e organização para facilitar a vida das pessoas e do grupo.",
    strengths: ["Organização social", "Explicação de processos", "Habilidade didática", "Atenção às necessidades do grupo"],
    challenges: ["Pode se preocupar demais com a opinião alheia", "Perda de tempo em detalhes explicativos", "Dificuldade em confrontar"],
    communication: "Didática, clara e atenciosa.",
    leadership: "Liderança que organiza e explica caminhos.",
    motivation: "Clareza, organização e utilidade social.",
    idealEnvironment: "Estruturado mas com espaço para trocas.",
    valueToOrganization: "Transforma complexidade em processos compreensíveis."
  },
  CS: {
    name: "O Planejador",
    description: "Analítico estável. O perfil ideal para planejar e garantir a execução segura de projetos complexos.",
    strengths: ["Planejamento detalhado", "Gestão de riscos", "Paciência analítica", "Organização de longo prazo"],
    challenges: ["Pode ser excessivamente cauteloso", "Demora excessiva no planejamento", "Medo de mudanças de plano"],
    communication: "Estruturada, calma e detalhada.",
    leadership: "Liderança planejada e segura.",
    motivation: "Planos bem feitos e execução sem sobressaltos.",
    idealEnvironment: "Onde o planejamento e a segurança são valorizados.",
    valueToOrganization: "Minimiza riscos e garante a viabilidade dos projetos."
  }
};
