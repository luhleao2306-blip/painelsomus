import { type ReactNode, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Loader2, LogOut } from 'lucide-react';
import somusLogo from '@/assets/somus-logo.png';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { ClientAvatar } from '@/components/client/ClientAvatar';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Layout exclusivo do Portal do Cliente.
 * Sem sidebar e sem nenhum módulo interno — apenas o painel do cliente.
 */
export function ClientLayout({ children }: { children: ReactNode }) {
  const { profile, loading } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !profile) navigate({ to: '/login' as any });
  }, [loading, profile, navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Sessão encerrada.');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.location.href = '/login';
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <img src={somusLogo} alt="Somus Group" className="h-8 w-auto object-contain dark:invert" />
          <div className="hidden h-5 w-px bg-border sm:block" />
          <span className="hidden font-display text-[13px] font-semibold tracking-tight text-foreground sm:inline">
            Portal do Cliente
          </span>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <ClientAvatar
                name={profile?.full_name ?? profile?.email}
                photoUrl={(profile as any)?.avatar_url}
                size="sm"
              />
              <div className="leading-tight">
                <p className="max-w-[180px] truncate text-[12.5px] font-semibold text-foreground">
                  {profile?.full_name || 'Cliente'}
                </p>
                <p className="max-w-[180px] truncate text-[10.5px] text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sair"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">{children}</main>

      <footer className="border-t border-border/50 py-6">
        <p className="text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Somus Group
        </p>
      </footer>
    </div>
  );
}
