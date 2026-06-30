import { createFileRoute } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, BookOpen, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

export const Route = createFileRoute('/system-docs')({
  head: () => ({
    meta: [
      { title: 'Documentação do Sistema — Portal Interno' },
      { name: 'description', content: 'Documentação completa do sistema com detalhes de cada módulo.' },
    ],
  }),
  component: SystemDocsPage,
});

type Module = {
  id: string;
  name: string;
  purpose: string;
  features: string[];
  roles: string[];
  routes: string[];
  permissions?: string[];
  notes?: string[];
};

const MODULES: Module[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    purpose: 'Visão geral consolidada para colaboradores, com foco em tarefas, atrasos, indicadores e frase motivacional do dia.',
    features: [
      'Painel de Foco com tarefas do dia e atrasadas do usuário logado',
      'Frase motivacional dinâmica',
      'Indicadores chave (KPIs) de clientes, projetos, tarefas e financeiro',
      'Seletor de período (semana, mês, trimestre)',
      'Atalhos rápidos para módulos críticos',
    ],
    roles: ['master', 'project_manager', 'consultant'],
    routes: ['/dashboard'],
  },
  {
    id: 'portal',
    name: 'Portal Interno (Cliente)',
    purpose: 'Área dedicada ao cliente final com seus projetos, tarefas, documentos, contratos e atas.',
    features: [
      'Resumo dos projetos do cliente',
      'Tarefas vinculadas ao cliente',
      'Acesso a documentos compartilhados',
      'Visualização de atas de reunião',
      'Acesso ao contrato vigente',
    ],
    roles: ['client', 'master'],
    routes: ['/portal'],
  },
  {
    id: 'clients',
    name: 'Clientes',
    purpose: 'CRUD completo de clientes da Somus, com vinculação de gestor responsável e dados comerciais.',
    features: [
      'Listagem, criação, edição e exclusão de clientes',
      'Atribuição de gestor (manager) e consultor',
      'Página de detalhes com projetos, contratos, atas e tarefas',
      'Histórico de relacionamento',
    ],
    roles: ['master', 'project_manager'],
    routes: ['/clients', '/clients/$clientId'],
  },
  {
    id: 'collaborators',
    name: 'Colaboradores',
    purpose: 'Gestão de usuários internos (master, project_manager, consultant) com papéis e status.',
    features: [
      'Cadastro de colaboradores',
      'Atribuição de papel (role) e status (ativo/inativo)',
      'Vínculo de consultor a clientes',
      'Convite por e-mail',
    ],
    roles: ['master', 'project_manager'],
    routes: ['/collaborators'],
    permissions: ['Apenas master pode alterar role, client_id, consultant_id e status (controle via trigger prevent_profile_privilege_escalation).'],
  },
  {
    id: 'projects',
    name: 'Projetos',
    purpose: 'Gestão de projetos vinculados a clientes, com escopo, status, cronograma e responsáveis.',
    features: [
      'Listagem e filtros por cliente, status e responsável',
      'Detalhes do projeto com tarefas, atas, documentos e tempo investido',
      'Atribuição de consultor responsável',
      'Notificação automática ao criar projeto (gestor + consultor)',
    ],
    roles: ['master', 'project_manager', 'consultant', 'client'],
    routes: ['/projects', '/projects/$projectId', '/clientes/$clienteId/projetos/$projetoId'],
  },
  {
    id: 'tasks',
    name: 'Tarefas',
    purpose: 'Gestão operacional de tarefas em formato lista enxuta e Kanban estilo ClickUp.',
    features: [
      'Visualização em lista compacta (alta densidade)',
      'Visualização Kanban por status',
      'Atribuição (assignee), prazo, prioridade e cliente',
      'Cronômetro de tempo investido com sessões (task_time_sessions)',
      'Bloqueio de conclusão sem tempo registrado (enforce_task_completion_time)',
      'Notificações automáticas de nova tarefa e mudança de status',
    ],
    roles: ['master', 'project_manager', 'consultant', 'client'],
    routes: ['/tasks'],
  },
  {
    id: 'time-report',
    name: 'Relatório de Tempo',
    purpose: 'Análise de tempo investido por colaborador, cliente, projeto e período.',
    features: [
      'Agrupamento por cliente / projeto / colaborador',
      'Filtros de período',
      'Exportação dos dados',
      'Base nas sessões de cronômetro de tarefas',
    ],
    roles: ['master', 'project_manager'],
    routes: ['/time-report'],
  },
  {
    id: 'contracts',
    name: 'Contratos',
    purpose: 'Gestão de contratos com clientes, incluindo valores recorrentes e únicos.',
    features: [
      'Cadastro de contrato com valor mensal (recorrente)',
      'Cadastro de valor único (projeto pontual)',
      'Vigência, status e cliente vinculado',
      'Página de detalhes com histórico',
    ],
    roles: ['master', 'project_manager', 'consultant', 'client'],
    routes: ['/contracts', '/contracts/$contractId'],
  },
  {
    id: 'financial-dashboard',
    name: 'Dashboard Financeiro',
    purpose: 'Visão financeira consolidada: MRR, receita única, projeção e inadimplência.',
    features: [
      'MRR (Monthly Recurring Revenue) a partir de contratos',
      'Receita única (projetos)',
      'Indicadores de crescimento',
      'Comparativos por período',
    ],
    roles: ['master', 'project_manager'],
    routes: ['/financial-dashboard'],
  },
  {
    id: 'sales-performance',
    name: 'Performance Comercial',
    purpose: 'Indicadores comerciais e funil de vendas.',
    features: [
      'Conversão por etapa',
      'Performance por consultor',
      'Histórico de vendas',
    ],
    roles: ['master', 'project_manager'],
    routes: ['/sales-performance'],
  },
  {
    id: 'documents',
    name: 'Documentos',
    purpose: 'Repositório de documentos com upload, categorização e compartilhamento por cliente/projeto.',
    features: [
      'Upload via bucket client-assets',
      'Categorização e tags',
      'Compartilhamento controlado por RLS',
      'Versionamento simples',
    ],
    roles: ['master', 'project_manager', 'consultant', 'client'],
    routes: ['/documents'],
  },
  {
    id: 'meetings',
    name: 'Atas de Reunião',
    purpose: 'Registro estruturado de atas de reuniões com clientes.',
    features: [
      'Cadastro de ata vinculada a cliente/projeto',
      'Notificação automática ao publicar (cliente + gestor)',
      'Histórico por projeto',
      'Edição colaborativa',
    ],
    roles: ['master', 'project_manager', 'consultant', 'client'],
    routes: ['/meetings', '/atas/$ataId', '/clientes/$clienteId/projetos/$projetoId/atas/$ataId'],
  },
  {
    id: 'intelligent-central',
    name: 'Central Inteligente',
    purpose: 'Hub de recursos, links, ferramentas e materiais entregues aos clientes.',
    features: [
      'Itens com audiência (all_clients ou specific_clients)',
      'Notificação automática ao publicar para o público-alvo',
      'Links externos e materiais internos',
    ],
    roles: ['master', 'project_manager', 'consultant', 'client'],
    routes: ['/intelligent-central'],
  },
  {
    id: 'info-center',
    name: 'Central de Informações',
    purpose: 'Base de conhecimento interno para colaboradores.',
    features: [
      'Artigos categorizados',
      'Busca interna',
      'Acesso restrito ao time',
    ],
    roles: ['master', 'project_manager', 'consultant'],
    routes: ['/info-center'],
  },
  {
    id: 'processes',
    name: 'Processos & POPs',
    purpose: 'Documentação de Procedimentos Operacionais Padrão (POPs) e processos internos.',
    features: [
      'Cadastro de processos',
      'Versionamento e responsáveis',
      'Vínculo com áreas',
    ],
    roles: ['master', 'project_manager', 'consultant'],
    routes: ['/processes'],
  },
  {
    id: 'settings',
    name: 'Configurações',
    purpose: 'Configurações da conta e preferências do usuário.',
    features: [
      'Perfil do usuário',
      'Preferências de notificação',
      'Segurança',
    ],
    roles: ['master', 'project_manager', 'consultant', 'client'],
    routes: ['/settings'],
  },
];

const TECH_STACK = [
  'Frontend: React 19 + TanStack Start v1 + TanStack Router + TanStack Query',
  'Build: Vite 7',
  'UI: Tailwind CSS v4 + shadcn/ui',
  'Tipografia: Sora (display) + Manrope (sans)',
  'Paleta: Cloud White (Apple-style, oklch tokens)',
  'Backend: Lovable Cloud (Supabase) — Postgres + Auth + Storage + RLS',
  'Server Logic: createServerFn (TanStack Start) com middleware requireSupabaseAuth',
  'PDF: jsPDF (client-side)',
];

const SECURITY = [
  'Autenticação por Supabase Auth (e-mail/senha)',
  'Roles persistidas em public.profiles.role (master, project_manager, consultant, client)',
  'Função has_role / is_collab_admin / is_manager para checagens SECURITY DEFINER',
  'Trigger prevent_profile_privilege_escalation impede que não-masters alterem campos privilegiados',
  'RLS habilitada em todas tabelas públicas',
  'Bucket privado client-assets para uploads',
];

const NOTIFICATIONS = [
  'Tabela notifications + função create_notification',
  'Triggers: on_task_change_notify, on_project_insert_notify, on_minute_insert_notify, on_intelligent_central_insert_notify',
  'Popover no header (NotificationsPopover) com tempo real',
];

function SystemDocsPage() {
  const handleDownload = () => {
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 48;
      const maxWidth = pageWidth - margin * 2;
      let y = margin;

      const ensureSpace = (needed: number) => {
        if (y + needed > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      const writeTitle = (text: string, size = 22) => {
        ensureSpace(size + 16);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(size);
        doc.setTextColor(20, 20, 30);
        doc.text(text, margin, y);
        y += size + 6;
      };

      const writeSubtitle = (text: string) => {
        ensureSpace(20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(59, 130, 246);
        doc.text(text, margin, y);
        y += 18;
      };

      const writeParagraph = (text: string) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(40, 40, 50);
        const lines = doc.splitTextToSize(text, maxWidth);
        for (const line of lines) {
          ensureSpace(14);
          doc.text(line, margin, y);
          y += 14;
        }
      };

      const writeBullets = (items: string[]) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(40, 40, 50);
        for (const item of items) {
          const lines = doc.splitTextToSize(`• ${item}`, maxWidth - 12);
          for (const line of lines) {
            ensureSpace(14);
            doc.text(line, margin + 8, y);
            y += 14;
          }
        }
      };

      const hr = () => {
        ensureSpace(20);
        doc.setDrawColor(220, 222, 230);
        doc.setLineWidth(0.6);
        doc.line(margin, y, pageWidth - margin, y);
        y += 14;
      };

      // Capa
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(34);
      doc.text('Documentação do Sistema', margin, 220);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text('Somus — Portal Interno', margin, 252);
      doc.setFontSize(11);
      doc.setTextColor(180, 190, 210);
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, 280);
      doc.addPage();
      y = margin;

      // Sumário
      writeTitle('Sumário');
      writeBullets([
        '1. Visão Geral',
        '2. Stack Tecnológica',
        '3. Segurança e Permissões',
        '4. Sistema de Notificações',
        '5. Módulos do Sistema',
        '6. Estrutura de Dados (resumo)',
      ]);
      hr();

      writeTitle('1. Visão Geral', 18);
      writeParagraph(
        'O Portal Interno da Somus é uma plataforma de gestão de clientes, projetos, tarefas, contratos, documentos, atas e indicadores financeiros/comerciais. ' +
        'Atende quatro perfis: master, project_manager, consultant e client, com controle de acesso por papel e RLS no banco.'
      );
      hr();

      writeTitle('2. Stack Tecnológica', 18);
      writeBullets(TECH_STACK);
      hr();

      writeTitle('3. Segurança e Permissões', 18);
      writeBullets(SECURITY);
      hr();

      writeTitle('4. Sistema de Notificações', 18);
      writeBullets(NOTIFICATIONS);
      hr();

      writeTitle('5. Módulos do Sistema', 18);
      MODULES.forEach((m, idx) => {
        writeSubtitle(`5.${idx + 1}. ${m.name}`);
        writeParagraph(`Propósito: ${m.purpose}`);
        writeParagraph('Funcionalidades:');
        writeBullets(m.features);
        writeParagraph(`Perfis com acesso: ${m.roles.join(', ')}`);
        writeParagraph(`Rotas: ${m.routes.join(', ')}`);
        if (m.permissions?.length) {
          writeParagraph('Permissões específicas:');
          writeBullets(m.permissions);
        }
        if (m.notes?.length) {
          writeParagraph('Notas:');
          writeBullets(m.notes);
        }
        y += 6;
      });
      hr();

      writeTitle('6. Estrutura de Dados (resumo)', 18);
      writeBullets([
        'profiles — usuários (id, full_name, email, role, status, client_id, consultant_id)',
        'clients — clientes da Somus (name, manager_id, dados comerciais)',
        'projects — projetos (client_id, consultant_id, status, escopo)',
        'tasks — tarefas (client_id, project_id, assignee, status, prioridade, time_invested_seconds)',
        'task_time_sessions — sessões do cronômetro (task_id, duration_seconds)',
        'contracts — contratos (client_id, valor mensal, valor único, vigência)',
        'documents — documentos (storage: client-assets)',
        'meeting_minutes — atas de reunião',
        'intelligent_central — recursos compartilhados com clientes (audience, audience_user_ids)',
        'notifications — notificações por usuário (title, description, type, link)',
      ]);

      // Rodapés
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(140, 145, 160);
        doc.text(`Somus · Portal Interno · ${i}/${pageCount}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
      }

      doc.save(`somus-portal-documentacao-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF gerado com sucesso');
    } catch (e) {
      console.error(e);
      toast.error('Falha ao gerar PDF');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Documentação</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Documentação do Sistema</h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Visão completa do Portal Interno da Somus: stack, segurança, notificações e detalhes por módulo. Baixe o PDF para consulta offline.
            </p>
          </div>
          <Button onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Baixar PDF completo
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <BookOpen className="h-4 w-4 text-primary" /> Módulos documentados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{MODULES.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-primary" /> Stack
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">React 19 · TanStack Start · Tailwind v4 · Lovable Cloud</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Download className="h-4 w-4 text-primary" /> Exportação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">PDF A4 com capa, sumário e detalhamento por módulo</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {MODULES.map((m) => (
            <Card key={m.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{m.name}</CardTitle>
                  <div className="flex flex-wrap gap-1">
                    {m.roles.map((r) => (
                      <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>
                    ))}
                  </div>
                </div>
                <CardDescription className="text-xs">{m.purpose}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Funcionalidades</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-sm">
                    {m.features.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Rotas</p>
                  <p className="text-xs font-mono text-muted-foreground break-all">{m.routes.join(' · ')}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
