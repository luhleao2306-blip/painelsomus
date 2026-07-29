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
import { ArrowRight } from 'lucide-react';

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
      <div className="flex min-h-screen w-full items-center justify-center" style={{ backgroundColor: '#0f0f0f' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 md:p-8"
      style={{ backgroundColor: '#0f0f0f', fontFamily: "'Inter Tight', sans-serif" }}
    >
      <div className="max-w-6xl w-full flex flex-col md:flex-row min-h-[700px] rounded-3xl overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]">
        {/* Left Hero Panel */}
        <div
          className="hidden md:flex md:w-1/2 relative flex-col justify-between p-16 overflow-hidden"
          style={{ backgroundColor: '#121212' }}
        >
          <div
            className="absolute -top-[10%] -right-[10%] w-[80%] h-[80%] rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom right, rgba(255,255,255,0.05), transparent)' }}
          />
          <div
            className="absolute bottom-0 left-0 w-full h-1/2 pointer-events-none"
            style={{ background: 'linear-gradient(to top, #000000, transparent)' }}
          />

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <img
                src={somusLogo}
                alt="Somus"
                className="h-10 w-auto object-contain invert"
              />
              <span className="text-white font-medium tracking-[0.3em] uppercase text-sm">
                Somus Group
              </span>
            </div>
          </div>

          <div className="relative z-10">
            <h2
              className="text-6xl text-white font-light leading-tight mb-6"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Elevando <br />
              <span className="italic">o padrão</span>
            </h2>
            <p className="text-zinc-500 max-w-sm leading-relaxed font-light">
              Acesse o ecossistema Somus para gestão estratégica, operações centralizadas e crescimento dos seus projetos.
            </p>
          </div>

          <div className="relative z-10 flex gap-8 text-[10px] uppercase tracking-widest text-zinc-600 font-medium">
            <span>Estratégia</span>
            <span>Operações</span>
            <span>Crescimento</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="w-full md:w-1/2 bg-white flex flex-col justify-center p-8 md:p-20 relative">
          <div className="md:hidden mb-12">
            <div className="flex items-center gap-3">
              <img
                src={somusLogo}
                alt="Somus"
                className="h-8 w-auto object-contain"
              />
              <span className="text-black font-medium tracking-[0.2em] uppercase text-xs">
                Somus Group
              </span>
            </div>
          </div>

          <div className="max-w-sm w-full mx-auto">
            <div className="mb-10">
              <h1
                className="text-3xl font-medium text-zinc-900 mb-2"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                {mode === 'signin' ? 'Bem-vindo de volta' : 'Criar conta'}
              </h1>
              <p className="text-zinc-500 text-sm">
                {mode === 'signin'
                  ? 'Entre com suas credenciais para acessar o Somus Hub.'
                  : 'Preencha seus dados para começar a usar o Somus Hub.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="fullName"
                    className="text-[11px] uppercase tracking-widest text-zinc-400 font-semibold ml-1"
                  >
                    Nome completo
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    className="w-full px-5 py-4 h-auto bg-zinc-50 border-zinc-100 rounded-xl focus:ring-1 focus:ring-black focus:bg-white text-sm placeholder:text-zinc-300 text-zinc-800"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-[11px] uppercase tracking-widest text-zinc-400 font-semibold ml-1"
                >
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@empresa.com.br"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full px-5 py-4 h-auto bg-zinc-50 border-zinc-100 rounded-xl focus:ring-1 focus:ring-black focus:bg-white text-sm placeholder:text-zinc-300 text-zinc-800"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label
                    htmlFor="password"
                    className="text-[11px] uppercase tracking-widest text-zinc-400 font-semibold ml-1"
                  >
                    Senha
                  </Label>
                  <Button
                    variant="link"
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
                    className="text-[11px] uppercase tracking-widest text-zinc-400 hover:text-black transition-colors font-semibold p-0 h-auto"
                  >
                    Esqueceu?
                  </Button>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full px-5 py-4 h-auto bg-zinc-50 border-zinc-100 rounded-xl focus:ring-1 focus:ring-black focus:bg-white text-sm placeholder:text-zinc-300 text-zinc-800"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-4 h-auto rounded-xl font-medium tracking-wide hover:bg-zinc-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group shadow-lg shadow-black/5"
              >
                {loading ? 'Processando...' : mode === 'signin' ? 'Entrar no Portal' : 'Criar Conta'}
                {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-zinc-100">
              <p className="text-center text-zinc-400 text-xs">
                {mode === 'signin' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="text-black font-medium underline underline-offset-4 decoration-zinc-200 hover:decoration-black transition-all"
                >
                  {mode === 'signin' ? 'Cadastre-se' : 'Fazer login'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
