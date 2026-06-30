-- Disabling the trigger temporarily to perform the update
ALTER TABLE public.profiles DISABLE TRIGGER prevent_profile_privilege_escalation_trg;

UPDATE public.profiles 
SET client_id = '2c52c3ab-23b9-4330-8111-e1c8e37e0d21' 
WHERE email = 'wilsoncamargos@gmail.com';

ALTER TABLE public.profiles ENABLE TRIGGER prevent_profile_privilege_escalation_trg;
