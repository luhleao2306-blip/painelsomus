ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT ARRAY[]::text[];
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON public.tasks USING gin (tags);