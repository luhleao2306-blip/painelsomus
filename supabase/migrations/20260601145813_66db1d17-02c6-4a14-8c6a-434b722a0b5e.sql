-- Function to create a notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_type TEXT,
  p_link TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, description, type, link, entity_type, entity_id)
  VALUES (p_user_id, p_title, p_description, p_type, p_link, p_entity_type, p_entity_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Task Notifications
CREATE OR REPLACE FUNCTION public.on_task_change_notify()
RETURNS TRIGGER AS $$
DECLARE
  v_client_name TEXT;
  v_title TEXT;
  v_description TEXT;
  v_manager_id UUID;
BEGIN
  SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;
  
  -- Notification for new task
  IF TG_OP = 'INSERT' THEN
    IF NEW.assignee IS NOT NULL THEN
      PERFORM public.create_notification(
        NEW.assignee,
        'Nova tarefa atribuída',
        'Você foi atribuído à tarefa: ' || NEW.title || ' (' || v_client_name || ')',
        'task',
        '/tasks',
        'task',
        NEW.id
      );
    END IF;
  -- Notification for status change
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_title := 'Status da tarefa alterado';
    v_description := 'A tarefa "' || NEW.title || '" mudou para: ' || NEW.status;
    
    -- Notify assignee
    IF NEW.assignee IS NOT NULL THEN
      PERFORM public.create_notification(
        NEW.assignee,
        v_title,
        v_description,
        'task',
        '/tasks',
        'task',
        NEW.id
      );
    END IF;
    
    -- Notify project manager if exists
    SELECT manager_id INTO v_manager_id FROM public.clients WHERE id = NEW.client_id;
    IF v_manager_id IS NOT NULL AND (NEW.assignee IS NULL OR v_manager_id != NEW.assignee) THEN
       PERFORM public.create_notification(
        v_manager_id,
        v_title,
        v_description,
        'task',
        '/tasks',
        'task',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_task_change_notify ON public.tasks;
CREATE TRIGGER trg_on_task_change_notify
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.on_task_change_notify();

-- Trigger for Project Notifications
CREATE OR REPLACE FUNCTION public.on_project_insert_notify()
RETURNS TRIGGER AS $$
DECLARE
  v_client_name TEXT;
  v_manager_id UUID;
BEGIN
  SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;
  SELECT manager_id INTO v_manager_id FROM public.clients WHERE id = NEW.client_id;
  
  IF v_manager_id IS NOT NULL THEN
    PERFORM public.create_notification(
      v_manager_id,
      'Novo projeto cadastrado',
      'O projeto "' || NEW.name || '" foi iniciado para o cliente ' || v_client_name,
      'project',
      '/projects',
      'project',
      NEW.id
    );
  END IF;
  
  IF NEW.consultant_id IS NOT NULL AND (v_manager_id IS NULL OR NEW.consultant_id != v_manager_id) THEN
    PERFORM public.create_notification(
      NEW.consultant_id,
      'Novo projeto atribuído',
      'Você foi atribuído ao projeto "' || NEW.name || '" (' || v_client_name || ')',
      'project',
      '/projects',
      'project',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_project_insert_notify ON public.projects;
CREATE TRIGGER trg_on_project_insert_notify
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.on_project_insert_notify();

-- Trigger for Meeting Minutes Notifications
CREATE OR REPLACE FUNCTION public.on_minute_insert_notify()
RETURNS TRIGGER AS $$
DECLARE
  v_client_name TEXT;
  v_manager_id UUID;
  v_profile RECORD;
BEGIN
  SELECT name, manager_id INTO v_client_name, v_manager_id FROM public.clients WHERE id = NEW.client_id;
  
  -- Notify client users
  FOR v_profile IN (SELECT id FROM public.profiles WHERE client_id = NEW.client_id AND role = 'client') LOOP
    PERFORM public.create_notification(
      v_profile.id,
      'Nova ata de reunião disponível',
      'A ata da reunião "' || NEW.title || '" foi publicada.',
      'meeting',
      '/minutes',
      'meeting_minute',
      NEW.id
    );
  END LOOP;
  
  -- Notify manager
  IF v_manager_id IS NOT NULL THEN
     PERFORM public.create_notification(
      v_manager_id,
      'Nova ata registrada',
      'A ata "' || NEW.title || '" foi registrada para o cliente ' || v_client_name,
      'meeting',
      '/minutes',
      'meeting_minute',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_minute_insert_notify ON public.meeting_minutes;
CREATE TRIGGER trg_on_minute_insert_notify
AFTER INSERT ON public.meeting_minutes
FOR EACH ROW EXECUTE FUNCTION public.on_minute_insert_notify();

-- Trigger for Intelligent Central Notifications
CREATE OR REPLACE FUNCTION public.on_intelligent_central_insert_notify()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
  v_client_id UUID;
BEGIN
  -- Notify specific clients
  IF NEW.audience = 'specific_clients' THEN
    FOREACH v_client_id IN ARRAY NEW.audience_user_ids LOOP
      FOR v_profile IN (SELECT id FROM public.profiles WHERE client_id = v_client_id AND role = 'client') LOOP
        PERFORM public.create_notification(
          v_profile.id,
          'Novo recurso disponível',
          'Um novo item foi adicionado à sua Central Inteligente: ' || NEW.name,
          'system',
          NEW.link_url,
          'intelligent_central',
          NEW.id
        );
      END LOOP;
    END LOOP;
  -- Notify all clients
  ELSIF NEW.audience = 'all_clients' THEN
    FOR v_profile IN (SELECT id FROM public.profiles WHERE role = 'client') LOOP
      PERFORM public.create_notification(
        v_profile.id,
        'Novo recurso disponível',
        'Um novo item foi adicionado à Central Inteligente: ' || NEW.name,
        'system',
        NEW.link_url,
        'intelligent_central',
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_intelligent_central_insert_notify ON public.intelligent_central;
CREATE TRIGGER trg_on_intelligent_central_insert_notify
AFTER INSERT ON public.intelligent_central
FOR EACH ROW EXECUTE FUNCTION public.on_intelligent_central_insert_notify();
