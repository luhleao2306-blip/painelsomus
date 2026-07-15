import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';
import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getRedirectPath } from '@/lib/auth-utils';
import { useProfile } from '@/hooks/use-profile';
import somusLogo from '@/assets/somus-logo.png';
import loginHero from '@/assets/login-hero.jpg';
import { ShieldCheck, LineChart, Layers, ArrowUpRight } from 'lucide-react';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { refreshProfileForUser, profile: currentProfile, authReady, loading: profileLoading } = useProfile();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Se já estiver logado (entrou direto em /login), redireciona com base no perfil
  useEffect(() => {
    if (!authReady || profileLoading || loading || hasRedirected) return;

    if (currentProfile) {
      setHasRedirected(true);
      const path = getRedirectPath(currentProfile.role);
      navigate({ to: path as any });
    }
  }, [authReady, profileLoading, currentProfile, navigate, loading, hasRedirected]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail) {
      toast.error('Informe seu e-mail.');
      return;
    }

    if (!normalizedPassword) {
      toast.error('Informe sua senha.');
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      toast.error('Informe seu nome completo.');
      return;
    }

    setLoading(true);

    try {
      const finishLogin = async (userId: string, message = 'Bem-vindo ao Somus Hub!') => {
        const profile = await refreshProfileForUser(userId);

        if (!profile) {
          toast.error('Perfil não encontrado. Tente entrar novamente em alguns segundos.');
          await supabase.auth.signOut();
          return false;
        }

        toast.success(message);
        navigate({ to: getRedirectPath(profile.role) as any });
        return true;
      };

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: normalizedPassword,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName.trim(),
              role: 'master',
            },
          },
        });

        if (error) {
          const alreadyExists = /already registered|already exists|user_already_exists/i.test(error.message);

          if (alreadyExists) {
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password: normalizedPassword,
            });

            if (!loginError && loginData.user) {
              await finishLogin(loginData.user.id, 'Essa conta já existia. Entramos com ela agora.');
              setLoading(false);
              return;
            }

            toast.error('Esse e-mail já tem cadastro. Use "Fazer login" ou "Esqueceu a senha?".');
            setMode('signin');
            setLoading(false);
            return;
          }

          toast.error(error.message);
          setLoading(false);
          return;
        }

        if (!data.session) {
          toast.success('Cadastro criado! Verifique seu e-mail para confirmar o acesso.');
          setMode('signin');
          setLoading(false);
          return;
        }

        await finishLogin(data.user!.id, 'Conta criada! Bem-vindo ao Somus Hub.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) {
        toast.error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        toast.error('Falha ao autenticar. Tente novamente.');
        setLoading(false);
        return;
      }

      await finishLogin(data.user.id);
      setLoading(false);
    } catch (err: any) {
      console.error('Auth error:', err);
      toast.error(err?.message || 'Ocorreu um erro ao processar sua solicitação.');
      setLoading(false);
    }
  };

  // Evita flash da tela de login enquanto a sessão está sendo restaurada
  // ou quando já existe um perfil logado (aguardando o redirect do useEffect).
  if (!authReady || profileLoading || currentProfile) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background">
      {/* Left panel: brand showcase */}
      <div className="relative hidden lg:flex lg:w-[55%] xl:w-1/2 flex-col justify-between bg-foreground text-background p-10 xl:p-14 overflow-hidden">
        {/* Hero background image */}
        <img
          src={loginHero}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-screen"
        />
        {/* Gradient veil for legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-foreground via-foreground/85 to-foreground/40" />
        {/* Fine grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        {/* Top: logo */}
        <div className="relative z-10 flex items-center justify-between">
          <img
            src={somusLogo}
            alt="Somus"
            className="h-8 w-auto object-contain invert"
          />
          <span className="hidden xl:inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-background/60">
            somos.group
          </span>

        </div>

        {/* Middle: headline centered */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
          <div className="space-y-5 max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-background/60">
              Somus Hub · Acesso seguro
            </p>
            <h1 className="text-5xl xl:text-[68px] font-black leading-[0.95] tracking-tight">
              Somus<br />
              <span className="italic font-extralight">Hub.</span>
            </h1>
            <p className="text-xl xl:text-2xl font-light text-background/80 leading-relaxed">
              Sua operação, <span className="italic font-extralight">centralizada.</span>
            </p>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="relative z-10 grid grid-cols-1 gap-3 pt-2">
          {[
            { icon: Layers, label: 'Visão completa', desc: 'Todos os seus projetos em tempo real' },
            { icon: LineChart, label: 'Decisões rápidas', desc: 'Indicadores e relatórios sempre à mão' },
            { icon: ShieldCheck, label: 'Seguro por padrão', desc: 'Acesso restrito e auditado' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-4 rounded-xl border border-background/10 bg-background/[0.04] backdrop-blur-sm p-4 hover:bg-background/[0.07] transition-colors">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/10 border border-background/10">
                <Icon className="h-4 w-4 text-background" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-background">{label}</p>
                <p className="text-xs text-background/60 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom: footer */}
        <div className="relative z-10">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-background/40 border-t border-background/10 pt-5">
            <span>&copy; 2026 Somus Consultoria</span>
            <span>v1.0 · Acesso restrito</span>
          </div>
        </div>
      </div>

      {/* Right panel: form */}
      <div className="flex flex-1 flex-col bg-background lg:items-center lg:justify-center lg:p-12">
        {/* Mobile hero — visible only on small screens */}
        <div className="relative lg:hidden h-[44vh] min-h-[300px] w-full overflow-hidden bg-foreground text-background">
          <img
            src={loginHero}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-screen"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-foreground/70 via-foreground/85 to-background" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="relative z-10 flex h-full flex-col justify-between p-6">
            <div className="flex items-center justify-between">
              <img src={somusLogo} alt="Somus" className="h-7 w-auto object-contain invert" />
              <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-background/60">
                Portal · Acesso seguro
              </span>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-background/60">
                Somus Hub
              </p>
              <h1 className="text-4xl font-black leading-[0.95] tracking-tight">
                Sua operação,<br />
                <span className="italic font-extralight">centralizada.</span>
              </h1>
            </div>
          </div>
        </div>

        <div className="w-full max-w-[420px] mx-auto px-6 pt-8 pb-10 sm:px-8 lg:p-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Mobile feature pills */}
          <div className="flex flex-wrap gap-2 mb-8 lg:hidden">
            {[
              { icon: Layers, label: 'Projetos' },
              { icon: LineChart, label: 'Relatórios' },
              { icon: ShieldCheck, label: 'Seguro' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5">
                <Icon className="h-3 w-3 text-foreground/70" />
                <span className="text-[11px] font-semibold text-foreground/80">{label}</span>
              </div>
            ))}
          </div>

          <div className="text-center mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">
              Somus Hub
            </p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mb-1">
              Sua operação, <span className="italic font-extralight">centralizada.</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-3">
              {mode === 'signin'
                ? 'Entre com suas credenciais para acessar o Somus Hub.'
                : 'Crie sua conta para acessar o Somus Hub.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {mode === 'signup' && (
              <div className="grid gap-2">
                <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-foreground/80">Nome completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome"
                  required
                  className="h-12 border-border bg-background"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-foreground/80">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@empresa.com.br"
                required
                className="h-12 border-border bg-background"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-foreground/80">Senha</Label>
                <Button
                  variant="link"
                  className="px-0 h-auto font-medium text-xs text-foreground hover:text-foreground/70"
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    const target = email.trim().toLowerCase();
                    if (!target) {
                      toast.error('Informe seu e-mail acima para receber o link de redefinição.');
                      return;
                    }
                    setLoading(true);
                    const { error } = await supabase.auth.resetPasswordForEmail(target, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    setLoading(false);
                    if (error) {
                      toast.error(error.message);
                    } else {
                      toast.success('Enviamos um link de redefinição para o seu e-mail.');
                    }
                  }}
                >
                  Esqueceu a senha?
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                required
                className="h-12 border-border bg-background"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 font-bold text-sm uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 transition-all"
              disabled={loading}
            >
              {loading ? 'Processando...' : mode === 'signin' ? 'Entrar no Portal' : 'Criar Conta'}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {mode === 'signin' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
              <button
                type="button"
                className="font-semibold text-foreground underline underline-offset-2 hover:opacity-70"
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                disabled={loading}
              >
                {mode === 'signin' ? 'Cadastre-se' : 'Fazer login'}
              </button>
            </p>

          </form>

          <p className="mt-12 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 lg:hidden">
            &copy; 2026 Somus &middot; Acesso restrito
          </p>
        </div>
      </div>
    </div>
  );
}
