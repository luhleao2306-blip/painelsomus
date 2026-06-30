-- 1. Ajuste na função de trigger para segurança (search_path)
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 2. Políticas para Project Stages (Etapas)
CREATE POLICY "Stages viewable by project access" ON public.project_stages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id)
    );

-- 3. Políticas para Tasks (Tarefas)
CREATE POLICY "Tasks isolation" ON public.tasks
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'project_manager'))
        OR assignee = auth.uid()
        OR (client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid()) AND visible_to_client = true)
    );

-- 4. Políticas para Subtasks (Subtarefas)
CREATE POLICY "Subtasks viewable by task access" ON public.subtasks
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id)
    );

-- 5. Políticas para Documents (Documentos)
CREATE POLICY "Documents isolation" ON public.documents
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'project_manager'))
        OR owner_id = auth.uid()
        OR (client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid()) AND visible_to_client = true)
    );

-- 6. Políticas para Deliverables (Entregáveis)
CREATE POLICY "Deliverables isolation" ON public.deliverables
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'project_manager'))
        OR (client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid()) AND visible_to_client = true)
    );

-- 7. Políticas para Meeting Minutes (Atas)
CREATE POLICY "Meeting Minutes isolation" ON public.meeting_minutes
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'project_manager'))
        OR (client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid()) AND visible_to_client = true)
    );

-- 8. Políticas para Contracts (Contratos)
CREATE POLICY "Contracts isolation" ON public.contracts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'project_manager'))
        OR client_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
    );

-- 9. Políticas para Activity Logs (Logs)
CREATE POLICY "Logs viewable by self and admins" ON public.activity_logs
    FOR SELECT USING (
        user_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'project_manager'))
    );

-- 10. Permissões de escrita (Início: apenas Master e PM podem criar dados core)
CREATE POLICY "Write access for admins" ON public.clients FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'project_manager')));
CREATE POLICY "Write access for admins" ON public.projects FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'project_manager')));
CREATE POLICY "Write access for admins and assignees" ON public.tasks FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'project_manager'))
    OR assignee = auth.uid()
);
