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
import { ShieldCheck, LineChart, Layers, ArrowRight } from 'lucide-react';

export const Route = createFileRoute('/login')({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: 'Login - Somus Hub' },
      { name: 'description', content: 'Acesse o Somus Hub com segurança.' },
      { property: 'og:title', content: 'Login - Somus Hub' },
      { property: 'og:description', content: 'Acesse o Somus Hub com segurança.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: 'Login - Somus Hub' },
      { name: 'twitter:description', content: 'Acesse o Somus Hub com segurança.' },
    ],
  }),
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

  if (!authReady || profileLoading || currentProfile) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
      {/* Left panel: brand showcase */}
      <div className="relative hidden lg:flex lg:w-[55%] xl:w-1/2 flex-col justify-between bg-[#0a0a0a] text-white p-10 xl:p-14 overflow-hidden">
        {/* Hero background image */}
        <img
          src={loginHero}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-screen"
        />
        {/* Gradient veil for legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0a0a0a]/90 to-[#0a0a0a]/50" />
        {/* Fine grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
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
          <span className="hidden xl:inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/50">
            somus.group
          </span>
        </div>

        {/* Middle: headline centered */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
          <div className="space-y-6 max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/50">
              Portal de Acesso · Somus Hub
            </p>
            <h1
              className="text-5xl xl:text-[72px] font-semibold leading-[0.95] tracking-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Somus<br />
              <span className="italic font-extralight">Hub.</span>
            </h1>
            <p className="text-xl xl:text-2xl font-light text-white/70 leading-relaxed">
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
            <div key={label} className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 hover:bg-white/[0.07] transition-colors">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/10">
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-white/60 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom: footer */}
        <div className="relative z-10">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/40 border-t border-white/10 pt-5">
            <span>&copy; 2026 Somus Group</span>
            <span>v3.0 · Acesso restrito</span>
          </div>
        </div>
      </div>

      {/* Right panel: form */}
      <div className="flex flex-1 flex-col bg-background lg:items-center lg:justify-center lg:p-12">
        {/* Mobile hero — visible only on small screens */}
        <div className="relative lg:hidden h-[44vh] min-h-[300px] w-full overflow-hidden bg-[#0a0a0a] text-white">
          <img
            src={loginHero}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-screen"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/70 via-[#0a0a0a]/85 to-background" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="relative z-10 flex h-full flex-col justify-between p-6">
            <div className="flex items-center justify-between">
              <img src={somusLogo} alt="Somus" className="h-7 w-auto object-contain invert" />
              <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/60">
                Portal · Acesso seguro
              </span>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">
                Somus Hub
              </p>
              <h1
                className="text-4xl font-semibold leading-[0.95] tracking-tight"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
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

          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">
              Somus Hub
            </p>
            <h2
              className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-1"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {mode === 'signin' ? 'Bem-vindo de volta' : 'Criar conta'}
            </h2>
            <p className="text-sm text-muted-foreground mt-3">
              {mode === 'signin'
                ? 'Entre com suas credenciais para acessar o Somus Hub.'
                : 'Preencha seus dados para começar a usar o Somus Hub.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold ml-1">
                  Nome completo
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome"
                  required
                  className="w-full px-5 py-4 h-auto bg-muted/30 border-border rounded-xl focus:ring-1 focus:ring-foreground text-sm placeholder:text-muted-foreground/50"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold ml-1">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@empresa.com.br"
                required
                className="w-full px-5 py-4 h-auto bg-muted/30 border-border rounded-xl focus:ring-1 focus:ring-foreground text-sm placeholder:text-muted-foreground/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold ml-1">
                  Senha
                </Label>
                <Button
                  variant="link"
                  className="px-0 h-auto text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground font-semibold"
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
                  Esqueceu?
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                required
                className="w-full px-5 py-4 h-auto bg-muted/30 border-border rounded-xl focus:ring-1 focus:ring-foreground text-sm placeholder:text-muted-foreground/50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-medium text-sm bg-foreground text-background hover:bg-foreground/90 transition-all flex items-center justify-center gap-2 group"
              disabled={loading}
            >
              {loading ? 'Processando...' : mode === 'signin' ? 'Entrar no Portal' : 'Criar Conta'}
              {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-2">
              {mode === 'signin' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
              <button
                type="button"
                className="font-semibold text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-all"
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
