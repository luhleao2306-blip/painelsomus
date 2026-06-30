CREATE OR REPLACE FUNCTION public.on_minute_insert_notify()
RETURNS TRIGGER AS $$
DECLARE
  v_client_name TEXT;
  v_manager_id UUID;
  v_profile RECORD;
BEGIN
  SELECT name, manager_id INTO v_client_name, v_manager_id FROM public.clients WHERE id = NEW.client_id;

  FOR v_profile IN (SELECT id FROM public.profiles WHERE client_id = NEW.client_id AND role = 'client') LOOP
    PERFORM public.create_notification(
      v_profile.id,
      'Nova ata de reunião disponível',
      'A ata da reunião "' || NEW.title || '" foi publicada.',
      'meeting',
      '/atas/' || NEW.id::text,
      'meeting_minute',
      NEW.id
    );
  END LOOP;

  IF v_manager_id IS NOT NULL THEN
     PERFORM public.create_notification(
      v_manager_id,
      'Nova ata registrada',
      'A ata "' || NEW.title || '" foi registrada para o cliente ' || v_client_name,
      'meeting',
      '/atas/' || NEW.id::text,
      'meeting_minute',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.on_intelligent_central_insert_notify()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
  v_client_id UUID;
  v_link TEXT;
BEGIN
  v_link := '/intelligent-central';

  IF NEW.audience = 'specific_clients' THEN
    FOREACH v_client_id IN ARRAY NEW.audience_user_ids LOOP
      FOR v_profile IN (SELECT id FROM public.profiles WHERE client_id = v_client_id AND role = 'client') LOOP
        PERFORM public.create_notification(
          v_profile.id,
          'Novo recurso disponível',
          'Um novo item foi adicionado à sua Central Inteligente: ' || NEW.name,
          'system',
          v_link,
          'intelligent_central',
          NEW.id
        );
      END LOOP;
    END LOOP;
  ELSIF NEW.audience = 'all_clients' THEN
    FOR v_profile IN (SELECT id FROM public.profiles WHERE role = 'client') LOOP
      PERFORM public.create_notification(
        v_profile.id,
        'Novo recurso disponível',
        'Um novo item foi adicionado à Central Inteligente: ' || NEW.name,
        'system',
        v_link,
        'intelligent_central',
        NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

UPDATE public.notifications
SET link = '/atas/' || entity_id::text
WHERE entity_type = 'meeting_minute' AND (link = '/minutes' OR link IS NULL);

UPDATE public.notifications
SET link = '/intelligent-central'
WHERE entity_type = 'intelligent_central'
  AND (link IS NULL OR link = '' OR (link NOT LIKE '/%' AND link NOT LIKE 'http%'));