-- Tabela de Perfis
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('master', 'project_manager', 'consultant', 'client')),
    client_id UUID, -- Vinculado se for cliente
    consultant_id UUID, -- Vinculado se aplicável
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Clientes
CREATE TABLE public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    industry TEXT,
    responsible_name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Pendente', 'Em Pausa')),
    manager_id UUID REFERENCES public.profiles(id), -- Consultor responsável
    manager_name TEXT, -- Nome do Gerente de conta
    contract_start DATE,
    contract_end DATE,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Vincular client_id em profiles após criar clients
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_client FOREIGN KEY (client_id) REFERENCES public.clients(id);

-- Tabela de Projetos
CREATE TABLE public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Planejamento' CHECK (status IN ('Planejamento', 'Em andamento', 'Finalizando', 'Concluído', 'Em Pausa')),
    priority TEXT DEFAULT 'Média' CHECK (priority IN ('Baixa', 'Média', 'Alta', 'Crítica')),
    start_date DATE,
    deadline DATE,
    consultant_id UUID REFERENCES public.profiles(id),
    manager_name TEXT,
    progress INTEGER DEFAULT 0,
    visible_to_client BOOLEAN DEFAULT true,
    current_stage_index INTEGER DEFAULT 0,
    team_size INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Etapas do Projeto
CREATE TABLE public.project_stages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL,
    status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em andamento', 'Concluído')),
    responsible TEXT,
    approver TEXT,
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Tarefas
CREATE TABLE public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    stage_id UUID REFERENCES public.project_stages(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assignee UUID REFERENCES public.profiles(id),
    demand_type TEXT CHECK (demand_type IN ('Cliente', 'Time', 'Aprovação', 'Administrativo', 'Estratégico')),
    priority TEXT CHECK (priority IN ('Baixa', 'Média', 'Alta', 'Crítica')),
    status TEXT DEFAULT 'Backlog' CHECK (status IN ('Backlog', 'A fazer', 'Em andamento', 'Aguardando cliente', 'Aguardando time', 'Em revisão', 'Aprovado', 'Concluído', 'Cancelado')),
    start_date DATE,
    deadline DATE,
    visible_to_client BOOLEAN DEFAULT true,
    delay_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Subtarefas
CREATE TABLE public.subtasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    assignee TEXT,
    status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Concluído')),
    deadline DATE,
    demand_type TEXT,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Documentos
CREATE TABLE public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    external_link TEXT,
    file_path TEXT,
    version TEXT DEFAULT '1.0',
    visible_to_client BOOLEAN DEFAULT true,
    download_enabled BOOLEAN DEFAULT true,
    file_type TEXT,
    file_size TEXT,
    owner_id UUID REFERENCES public.profiles(id),
    is_contract BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Entregáveis
CREATE TABLE public.deliverables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    link TEXT,
    file_path TEXT,
    status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Entregue', 'Aprovado', 'Atrasado')),
    forecast_date DATE,
    actual_date DATE,
    visible_to_client BOOLEAN DEFAULT true,
    download_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Atas de Reunião
CREATE TABLE public.meeting_minutes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
    attendees TEXT[], -- Array de nomes ou referências
    agenda TEXT,
    decisions TEXT,
    client_pending TEXT,
    team_pending TEXT,
    next_steps TEXT,
    recording_link TEXT,
    file_path TEXT,
    visible_to_client BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Contratos
CREATE TABLE public.contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    file_path TEXT,
    status TEXT DEFAULT 'Vigente' CHECK (status IN ('Vigente', 'Encerrado', 'Em Renovação')),
    start_date DATE,
    end_date DATE,
    download_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Logs de Atividade
CREATE TABLE public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Políticas Básicas de RLS (Exemplo simplificado para validação)

-- Profiles: Usuário vê o próprio perfil; Master/Gerente vê todos.
CREATE POLICY "Profiles viewable by self and managers" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'project_manager')));

-- Clientes: Master/Gerente vê todos; Consultor vê os seus; Cliente vê o seu.
CREATE POLICY "Clients isolation" ON public.clients
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'project_manager'))
        OR manager_id = auth.uid()
        OR id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
    );

-- Projetos: Segue a lógica de Clientes + filtro de visibilidade para o cliente.
CREATE POLICY "Projects isolation" ON public.projects
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'project_manager'))
        OR consultant_id = auth.uid()
        OR (client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid()) AND visible_to_client = true)
    );

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
