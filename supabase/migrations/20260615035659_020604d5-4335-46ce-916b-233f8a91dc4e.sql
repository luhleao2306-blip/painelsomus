CREATE TABLE public.task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_checklist_items_task ON public.task_checklist_items(task_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_checklist_items TO authenticated;
GRANT ALL ON public.task_checklist_items TO service_role;

ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

-- Mirror tasks visibility: managers/masters have full access; others can manage items on tasks they can see.
CREATE POLICY "Managers manage all checklist items"
ON public.task_checklist_items FOR ALL
TO authenticated
USING (public.is_manager())
WITH CHECK (public.is_manager());

CREATE POLICY "Users manage checklist on visible tasks"
ON public.task_checklist_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_checklist_items.task_id
      AND (
        t.assignee = (SELECT full_name FROM public.profiles WHERE id = auth.uid())
        OR t.client_id = public.get_my_client_id()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_checklist_items.task_id
      AND (
        t.assignee = (SELECT full_name FROM public.profiles WHERE id = auth.uid())
        OR t.client_id = public.get_my_client_id()
      )
  )
);

CREATE TRIGGER set_task_checklist_items_updated_at
BEFORE UPDATE ON public.task_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();