ALTER TABLE public.op_folders ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.op_tasks ADD COLUMN IF NOT EXISTS client_visible boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.client_useful_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  description text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_useful_links TO authenticated;
GRANT ALL ON public.client_useful_links TO service_role;
ALTER TABLE public.client_useful_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_useful_links internal write" ON public.client_useful_links
  FOR ALL TO authenticated USING (public.is_internal_user()) WITH CHECK (public.is_internal_user());

CREATE POLICY "client_useful_links client read" ON public.client_useful_links
  FOR SELECT TO authenticated USING (client_id = public.get_my_client_id());

CREATE TRIGGER client_useful_links_updated_at BEFORE UPDATE ON public.client_useful_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.get_my_client_demands()
RETURNS TABLE(
  id text,
  name text,
  project_name text,
  folder_name text,
  situation text,
  due_date date,
  delivered_at date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    p.name AS project_name,
    f.name AS folder_name,
    CASE WHEN t.status = 'concluido' THEN 'entregue' ELSE 'em_andamento' END AS situation,
    t.due_date,
    CASE WHEN t.status = 'concluido' THEN t.updated_at::date ELSE NULL END AS delivered_at
  FROM public.op_tasks t
  JOIN public.op_sections s ON s.id = t.section_id
  JOIN public.op_projects p ON p.id = s.project_id
  JOIN public.op_folders f ON f.id = p.folder_id
  WHERE t.client_visible = true
    AND f.client_id IS NOT NULL
    AND f.client_id = public.get_my_client_id()
  ORDER BY (t.status = 'concluido'), t.due_date NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.get_my_client_demands() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_client_demands() TO authenticated;