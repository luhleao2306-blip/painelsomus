-- Allow anonymous inserts to op_form_answers so public forms can save results
ALTER TABLE public.op_form_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public inserts to op_form_answers"
ON public.op_form_answers
FOR INSERT
TO anon
WITH CHECK (true);

GRANT INSERT ON public.op_form_answers TO anon;
