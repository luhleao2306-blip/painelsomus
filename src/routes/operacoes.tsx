import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Workflow,
  LayoutDashboard,
  FolderKanban,
  LayoutTemplate,
  ClipboardList,
  TrendingUp,
  KeyRound,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import somusLogoUrl from '@/assets/somus-logo.png';

export const Route = createFileRoute('/operacoes')({
  component: OperacoesPage,
  head: () => ({
    meta: [
      { title: 'Operações — Somus' },
      { name: 'description', content: 'Central de operações da Somus — projetos, tarefas, modelos e formulários.' },
    ],
  }),
});

type Section = {
  key: string;
  title: string;
  description: string;
  icon: typeof Workflow;
  to?: string;
  external?: boolean;
  badge?: string;
};

const sections: Section[] = [
  {
    key: 'painel',
    title: 'Visão Geral',
    description: 'Indicadores gerais: projetos ativos, tarefas por status, atrasos e carga do time.',
    icon: LayoutDashboard,
    badge: 'Em breve',
  },
  {
    key: 'pastas',
    title: 'Pastas & Projetos',
    description: 'Hierarquia Pasta → Projeto → Seção → Tarefa, no estilo Asana. Lista, Kanban e Gantt.',
    icon: FolderKanban,
    badge: 'Em breve',
  },
  {
    key: 'modelos',
    title: 'Modelos',
    description: 'Templates de projeto reutilizáveis (ex: Agente IA SDR + LP) para acelerar novos clientes.',
    icon: LayoutTemplate,
    badge: 'Em breve',
  },
  {
    key: 'briefings',
    title: 'Briefings',
    description: 'Gere links únicos de briefing por cliente e acompanhe o preenchimento em tempo real.',
    icon: FileText,
    to: '/briefings',
  },
  {
    key: 'formularios',
    title: 'Formulários',
    description: 'Construtor de formulários padrão (briefing, tráfego pago) associáveis a projetos.',
    icon: ClipboardList,
    badge: 'Em breve',
  },
  {
    key: 'performance',
    title: 'Performance do Time',
    description: 'Tarefas concluídas, atrasos, tempo médio e taxa de entrega por pessoa.',
    icon: TrendingUp,
    to: '/team-performance',
  },
  {
    key: 'senhas',
    title: 'Senhas',
    description: 'Cofre de credenciais de clientes (Meta Ads, Kommo, hospedagem) com criptografia.',
    icon: KeyRound,
    to: '/passwords',
  },
];

function OperacoesPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 lg:px-6">
        <button
          type="button"
          onClick={() => navigate({ to: '/dashboard' as any })}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>
        <div className="mx-1 hidden h-4 w-px bg-border sm:block" />
        <img src={somusLogoUrl} alt="Somus" className="h-6 w-auto object-contain dark:invert" />
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-primary" />
          <span className="font-display text-sm font-semibold tracking-tight">Operações</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mx-auto w-full max-w-[1200px] space-y-8">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
              <Workflow className="h-3 w-3" />
              Central de Operações
            </span>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Gestão operacional da Somus
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Aqui a alcateia controla projetos, tarefas, modelos e demandas — no espírito Asana,
              mas com a nossa identidade. Escolha um módulo para começar.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((s) => {
              const Icon = s.icon;
              const clickable = !!s.to;
              const content = (
                <div className="group relative flex h-full flex-col gap-3 rounded-xl border border-border/70 bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    {s.badge ? (
                      <span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {s.badge}
                      </span>
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display text-base font-semibold tracking-tight">
                      {s.title}
                    </h3>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                </div>
              );
              if (clickable) {
                return (
                  <Link key={s.key} to={s.to as any} className="block">
                    {content}
                  </Link>
                );
              }
              return (
                <div key={s.key} className="opacity-70">
                  {content}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-5 text-[13px] text-muted-foreground">
            <strong className="text-foreground">Próximos passos:</strong> construção completa das
            áreas de Pastas, Modelos, Formulários e Painel (clone funcional do Asana), conforme
            especificação. Enquanto isso, Briefings, Performance e Senhas já estão disponíveis
            aqui na Central de Operações.
          </div>
        </div>
      </main>
    </div>
  );
}
