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
import loginHeroAsset from '@/assets/login-hero-dark.png.asset.json';
import { ShieldCheck, LineChart, Layers, ArrowRight, User, Lock, Eye, EyeOff } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);

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
    <div
      className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#050505] text-white"
      style={{ fontFamily: "'Inter Tight', sans-serif" }}
    >
      {/* Fundo full-bleed */}
      <img
        src={loginHeroAsset.url}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-[#050505]/45" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/70" />

      {/* Topo */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10 sm:py-8">
        <img src={somusLogo} alt="Somus" className="h-6 w-auto object-contain invert sm:h-7" />
        <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/55 sm:text-[11px]">
          somus.group
        </span>
      </header>




      {/* Conteúdo central */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-[344px] text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/55">
            Portal de acesso
          </p>
          <h1
            className="mt-4 pb-2 text-[52px] leading-[1] tracking-tight sm:text-[64px]"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Somus<br />
            <span className="italic font-light">Hub.</span>
          </h1>
          <p className="mt-4 text-base font-light text-white/75 sm:text-lg">
            Sua operação, <span className="italic">centralizada.</span>
          </p>


          <form onSubmit={handleSubmit} className="mt-10 space-y-5 text-left">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/55">
                  Nome completo
                </Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    required
                    className="h-[52px] w-full rounded-xl border-white/15 bg-white/[0.05] pl-11 pr-4 text-sm text-white backdrop-blur-md placeholder:text-white/35 focus-visible:border-white/40 focus-visible:ring-0"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/55">
                E-mail
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@empresa.com.br"
                  required
                  className="h-[52px] w-full rounded-xl border-white/15 bg-white/[0.05] pl-11 pr-4 text-sm text-white backdrop-blur-md placeholder:text-white/35 focus-visible:border-white/40 focus-visible:ring-0"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/55">
                  Senha
                </Label>
                <button
                  type="button"
                  disabled={loading}
                  className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/55 transition-colors hover:text-white"
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
                    if (error) toast.error(error.message);
                    else toast.success('Enviamos um link de redefinição para o seu e-mail.');
                  }}
                >
                  Esqueceu?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  className="h-[52px] w-full rounded-xl border-white/15 bg-white/[0.05] pl-11 pr-12 text-sm text-white backdrop-blur-md placeholder:text-white/35 focus-visible:border-white/40 focus-visible:ring-0"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 transition-colors hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="group flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/95 text-sm font-medium text-black transition-all hover:bg-white hover:shadow-lg hover:shadow-white/10"
              disabled={loading}
            >
              {loading ? 'Processando...' : mode === 'signin' ? 'Entrar no Portal' : 'Criar Conta'}
              {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
            </Button>

            <div className="flex items-center gap-4 pt-1">
              <span className="h-px flex-1 bg-white/15" />
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 text-[9px] uppercase tracking-widest text-white/50">
                ou
              </span>
              <span className="h-px flex-1 bg-white/15" />
            </div>

            <p className="text-center text-[13px] text-white/70">
              {mode === 'signin' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
              <button
                type="button"
                className="font-semibold text-white underline underline-offset-4"
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                disabled={loading}
              >
                {mode === 'signin' ? 'Cadastre-se' : 'Fazer login'}
              </button>
            </p>
          </form>
        </div>
      </main>

      {/* Rodapé */}
      <footer className="relative z-10 flex items-center justify-between px-6 pb-6 text-[9px] uppercase tracking-[0.25em] text-white/40 sm:px-10 sm:pb-8 sm:text-[10px]">
        <span>&copy; 2026 Somus Group</span>
        <span>v3.0 &middot; Acesso restrito</span>
      </footer>
    </div>
  );
}

