import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import somusLogo from '@/assets/somus-logo.png';

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash; the client picks it up
    // automatically and emits a PASSWORD_RECOVERY event. We wait for it so the
    // user can set a new password instead of being redirected as "logged in".
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });

    // If the user already has a session (e.g. refreshed the page), allow reset too.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não conferem.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Limpa a flag de troca obrigatória (se existir)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ must_change_password: false } as never).eq('id', user.id);
    }

    toast.success('Senha redefinida com sucesso! Faça login novamente.');
    await supabase.auth.signOut();
    setLoading(false);
    navigate({ to: '/login' });
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-center mb-8">
          <img src={somusLogo} alt="Somus" className="h-8 w-auto object-contain dark:invert" />
        </div>

        <div className="text-center mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">
            Somus Hub
          </p>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mb-1">
            Redefinir <span className="italic font-extralight">senha.</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-3">
            {ready
              ? 'Escolha uma nova senha para acessar o Somus Hub.'
              : 'Validando seu link de redefinição...'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-foreground/80">
              Nova senha
            </Label>
            <Input
              id="password"
              type="password"
              required
              className="h-12 border-border bg-background"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || !ready}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm" className="text-xs font-bold uppercase tracking-wider text-foreground/80">
              Confirmar senha
            </Label>
            <Input
              id="confirm"
              type="password"
              required
              className="h-12 border-border bg-background"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading || !ready}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 font-bold text-sm uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 transition-all"
            disabled={loading || !ready}
          >
            {loading ? 'Salvando...' : 'Redefinir senha'}
          </Button>
        </form>
      </div>
    </div>
  );
}
