GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_tracks TO authenticated;
GRANT ALL ON public.learning_tracks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_lessons TO authenticated;
GRANT ALL ON public.learning_lessons TO service_role;