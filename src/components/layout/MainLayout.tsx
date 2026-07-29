import React, { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
   
  FileText, 
  UsersRound, 
  Settings, 
  LogOut,
  Bell,
  Search,
  Cpu,
  DollarSign,
  TrendingUp,
  Timer,
  UserCog,
  Library,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  KeyRound,
  Briefcase as BriefcaseIcon,
  Trophy,
  Mountain,
  Music,
  Crosshair,
  ChevronDown,
  Image as ImageIcon,
  Award,
  Heart,
  ShoppingBag,
  Gift,
  Star,
  Bot,
  Target,
  Sparkles,
} from 'lucide-react';



import { useProfile, UserRole } from '@/hooks/use-profile';
import { NotificationsPopover } from '@/components/layout/NotificationsPopover';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarFooter
} from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import somusLogoUrl from '@/assets/somus-logo.png';
import { GlobalSearch } from '@/components/layout/GlobalSearch';

import { PackEnergyIndicator } from '@/components/pack/PackEnergyIndicator';
import { PackMoodDialog } from '@/components/pack/PackMoodDialog';
import {
  useMyGamificationProfile,
  getLevelInfo,
  EXCLUDED_FROM_GAMIFICATION_EMAILS,
  isSuperAdminAccess,
  POINTS_LABEL,
  usePins,
  useUserPins,
} from '@/lib/gamificacao-store';
import { useMyModuleOverrides, canAccessModule } from '@/lib/module-permissions';
import { LevelSeal } from '@/components/gamificacao/LevelSeal';
import { WolfAvatar } from '@/components/WolfAvatar';
import { ClientAvatar } from '@/components/client/ClientAvatar';

type NavItem = { title: string; icon: typeof LayoutDashboard; href: string; roles: UserRole[]; wip?: boolean };
type NavSection = { label: string; items: NavItem[] };

const getRoleName = (r: UserRole, email?: string | null) => {
  if (isSuperAdminAccess(email, r)) return 'Super Admin';
  switch (r) {
    case 'master': return 'Administrador';
    case 'project_manager': return 'Gerente';
    case 'consultant': return 'Consultor';
    case 'client': return 'Cliente';
  }
};

const navigationSections: NavSection[] = [

  {
    label: 'Operação',
    items: [
      { title: 'Painel de Operações', icon: LayoutDashboard, href: '/operacoes', roles: ['master', 'project_manager', 'consultant'] },
      { title: 'Agenda', icon: CalendarDays, href: '/agenda', roles: ['master', 'project_manager', 'consultant', 'client'] },
      { title: 'Meu Painel', icon: LayoutDashboard, href: '/cliente/painel', roles: ['client'] },
      { title: 'Atas de Reunião', icon: UsersRound, href: '/meetings', roles: ['client'] },
      { title: 'Documentos', icon: FileText, href: '/documents', roles: ['client'] },
      { title: 'Meus Formulários', icon: FileText, href: '/cliente/formularios', roles: ['client'] },


      { title: 'Cofre de Senhas', icon: KeyRound, href: '/operacoes/senhas', roles: ['master', 'project_manager', 'consultant'] },
    ],
  },
  // "Gestão de Clientes" removida do menu: Atas e Documentos vivem dentro de cada cliente
  // (/clients/$clientId). Metas Estratégicas, Trilha de Aprendizagem e Glossário foram
  // retirados do menu interno (rotas preservadas).


  {
    label: 'Relacionamento',
    items: [
      { title: 'Clientes', icon: Users, href: '/clients', roles: ['master', 'project_manager', 'consultant'] },
      { title: 'Portal do Cliente', icon: Bot, href: '/portal-cliente', roles: ['master', 'project_manager'] },
      { title: 'Formulários de Clientes', icon: FileText, href: '/registrations', roles: ['master', 'project_manager', 'consultant'] },
      { title: 'Visão de Clientes', icon: FileText, href: '/formularios', roles: ['master', 'project_manager', 'consultant'] },
      { title: 'Colaboradores', icon: UserCog, href: '/collaborators', roles: ['master', 'project_manager', 'consultant'] },

    ],
  },
  // Seções "Comercial" e "Financeiro" ocultas temporariamente da sidebar.
  // As rotas e o banco de dados permanecem intactos para reativação futura.

  {
    label: 'Alcateia',
    items: [
      { title: 'A Alcateia (Cultura)', icon: Mountain, href: '/alcateia', roles: ['master', 'project_manager', 'consultant'] },
      // { title: 'Playlist Somus', icon: Music, href: '/alcateia/playlist', roles: ['master', 'project_manager', 'consultant'] }, // oculto por enquanto
      { title: 'Dashboard', icon: Trophy, href: '/gamificacao', roles: ['master', 'project_manager', 'consultant'] },
      { title: 'Galeria do Lobo', icon: ImageIcon, href: '/gamificacao/galeria-do-lobo', roles: ['master', 'project_manager', 'consultant'] },
      { title: 'Pins & Conquistas', icon: Award, href: '/gamificacao/pins', roles: ['master', 'project_manager', 'consultant'] },
      { title: 'Hábitos Saudáveis', icon: Heart, href: '/gamificacao/habitos', roles: ['master', 'project_manager', 'consultant'] },
      { title: 'Loja da Alcateia', icon: ShoppingBag, href: '/gamificacao/loja', roles: ['master', 'project_manager', 'consultant'] },
      { title: 'Resgates', icon: Gift, href: '/gamificacao/resgates', roles: ['master', 'project_manager', 'consultant'] },
      { title: 'Reconhecimentos', icon: Star, href: '/gamificacao/estrela-do-lider', roles: ['master', 'project_manager', 'consultant'] },
    ],
  },

  {
    label: 'Conhecimento',
    items: [
      { title: 'Central de Informações', icon: Library, href: '/info-center', roles: ['master', 'project_manager', 'consultant'], wip: true },

      { title: 'Central Inteligente', icon: Cpu, href: '/intelligent-central', roles: ['master', 'project_manager', 'consultant'], wip: true },
      { title: 'SOMUS IA', icon: Sparkles, href: '/somus-ia', roles: ['master', 'project_manager', 'consultant', 'client'], wip: true },
      // { title: 'Trilha da Alcateia', icon: BookOpenCheck, href: '/knowledge-trail', roles: ['master', 'project_manager', 'consultant'] }, // oculto até ter conteúdo
    ],
  },

  {
    label: 'Sistema',
    items: [
      
      { title: 'Configurações', icon: Settings, href: '/settings', roles: ['master', 'project_manager', 'consultant'] },
    ],
  },
];

// Mapa de acesso por rota. Master tem acesso total.
const routeAccess: { prefix: string; roles: UserRole[] }[] = [
  { prefix: '/dashboard', roles: ['master', 'project_manager', 'consultant', 'client'] },
  { prefix: '/clients', roles: ['master', 'project_manager', 'consultant'] },
  { prefix: '/formularios', roles: ['master', 'project_manager', 'consultant'] },
  { prefix: '/cliente/formularios', roles: ['master', 'project_manager', 'consultant', 'client'] },
  { prefix: '/collaborators', roles: ['master', 'project_manager', 'consultant'] },

  { prefix: '/projects-overview', roles: ['master', 'project_manager', 'consultant'] },
  { prefix: '/projects', roles: ['master', 'project_manager', 'consultant', 'client'] },
  { prefix: '/briefing', roles: ['master', 'project_manager', 'consultant', 'client'] },
  { prefix: '/tasks', roles: ['master', 'project_manager', 'consultant', 'client'] },
  { prefix: '/time-report', roles: ['master', 'project_manager', 'consultant'] },
  { prefix: '/sales-performance', roles: ['master', 'project_manager', 'consultant'] },
  { prefix: '/comercial', roles: ['master', 'project_manager', 'consultant'] },
  { prefix: '/gamificacao', roles: ['master', 'project_manager', 'consultant'] },

  { prefix: '/documents', roles: ['master', 'project_manager', 'consultant', 'client'] },
  { prefix: '/meetings', roles: ['master', 'project_manager', 'consultant', 'client'] },
  { prefix: '/agenda', roles: ['master', 'project_manager', 'consultant', 'client'] },
  { prefix: '/intelligent-central', roles: ['master', 'project_manager', 'consultant'] },
  { prefix: '/info-center', roles: ['master', 'project_manager', 'consultant'] },
  { prefix: '/knowledge-trail', roles: ['master', 'project_manager', 'consultant'] },
  { prefix: '/system-docs', roles: ['master', 'project_manager', 'consultant'] },
  { prefix: '/settings', roles: ['master', 'project_manager', 'consultant', 'client'] },
  
  { prefix: '/briefings', roles: ['master', 'project_manager', 'consultant'] },
  { prefix: '/team-performance', roles: ['master', 'project_manager', 'consultant'] },
  { prefix: '/missoes', roles: ['master', 'project_manager', 'consultant'] },
  { prefix: '/cliente/glossario', roles: ['master', 'project_manager', 'consultant', 'client'] },
  { prefix: '/cliente/trilhas', roles: ['master', 'project_manager', 'consultant', 'client'] },
  { prefix: '/cliente/metas', roles: ['client'] },
  { prefix: '/cliente/painel', roles: ['master', 'project_manager', 'consultant', 'client'] },
  { prefix: '/portal-cliente', roles: ['master', 'project_manager'] },
  { prefix: '/somus-ia', roles: ['master', 'project_manager', 'consultant', 'client'] },
];

function getHomeForRole(role: UserRole): string {
  if (role === 'client') return '/agenda';
  return '/operacoes';
}


function CollapsibleNavSection({
  section,
  pathname,
}: {
  section: NavSection;
  pathname: string;
}) {
  const hasActive = section.items.some(
    (item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/')),
  );
  const storageKey = `nav-section:${section.label}`;
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem(storageKey);
    if (saved === null) return true;
    return saved === '1';
  });
  // Mantém aberto automaticamente quando a rota ativa pertence ao grupo.
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);
  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, next ? '1' : '0');
      }
      return next;
    });
  };
  return (
    <SidebarGroup>
      <SidebarGroupLabel asChild className="px-1 group-data-[collapsible=icon]:hidden">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
        >
          <span className="truncate">{section.label}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
          />
        </button>
      </SidebarGroupLabel>
      <SidebarGroupContent
        className={!open ? 'hidden group-data-[collapsible=icon]:block' : ''}
      >
          <SidebarMenu className="gap-0.5">
            {section.items.map((item) => {
              const active =
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={item.title}
                    className="h-9 rounded-lg px-3 text-[13px] font-medium transition-all duration-150 hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground data-[active=true]:shadow-sm"
                  >
                    <Link to={item.href as any} className="flex items-center gap-2.5">
                      <item.icon className="h-[18px] w-[18px] shrink-0 opacity-80" />
                      <span className="truncate">{item.title}</span>
                      {item.wip && (
                        <Badge
                          variant="outline"
                          className="ml-auto shrink-0 border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide text-amber-600 group-data-[collapsible=icon]:hidden dark:text-amber-400"
                        >
                          Em construção
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function MainLayout({ children }: { children: ReactNode }) {
  const { role, profile, loading } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: overrides } = useMyModuleOverrides(profile?.id);

  // Helper: dada uma rota, decide se o usuário pode acessar levando em conta
  // o cargo + overrides do super admin. Master ignora overrides.
  // Um bloqueio em prefixo ancestral (ex.: /financeiro) bloqueia todos os
  // sub-módulos (/financeiro/indicadores, etc.).
  const resolveOverride = (href: string): boolean | undefined => {
    if (!overrides) return undefined;
    // 1) Se QUALQUER ancestral está bloqueado, bloqueia.
    for (const [k, v] of overrides.entries()) {
      if (v === false && (k === href || href.startsWith(k + '/'))) return false;
    }
    // 2) Override exato.
    if (overrides.has(href)) return overrides.get(href);
    // 3) Override liberando em ancestral propaga aos filhos.
    for (const [k, v] of overrides.entries()) {
      if (v === true && href.startsWith(k + '/')) return true;
    }
    return undefined;
  };

  const isInternal = role === 'master' || role === 'project_manager' || role === 'consultant';
  const canSee = (href: string, roles: UserRole[]) => {
    const roleAllows = roles.includes(role);
    // Client-exclusive items must never appear in non-client sidebars,
    // even for super admin, to avoid duplication com "Gestão de Clientes".
    const clientOnly = roles.length === 1 && roles[0] === 'client';
    if (clientOnly && role !== 'client') return false;
    // Todos os colaboradores internos enxergam tudo, como o master admin.
    if (isInternal) return true;
    if (isSuperAdminAccess(profile?.email, role)) return true;
    return canAccessModule(roleAllows, resolveOverride(href));
  };

  useEffect(() => {
    if (!loading && !profile) {
      navigate({ to: '/login' as any });
      return;
    }
    if (!loading && profile) {
      if ((profile as any).must_change_password && location.pathname !== '/reset-password') {
        navigate({ to: '/reset-password' as any });
        return;
      }
      const match = routeAccess.find(r => location.pathname.startsWith(r.prefix));
      if (match && !isSuperAdminAccess(profile.email, role) && !isInternal) {
        const ov = resolveOverride(location.pathname);
        const allowed = canAccessModule(match.roles.includes(role), ov);
        if (!allowed) {
          toast.error('Você não tem permissão para acessar essa área.');
          navigate({ to: getHomeForRole(role) as any });
        }
      }
    }
  }, [loading, profile, role, location.pathname, navigate, overrides]);

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredSections = navigationSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => canSee(item.href, item.roles)),
    }))
    .filter(section => section.items.length > 0);


  const isOperationsArea = location.pathname.startsWith('/operacoes');

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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar variant={isOperationsArea ? "sidebar" : "inset"} collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
          <SidebarHeader className="px-4 pt-5 pb-3">
            <Link
              to={'/tv' as any}
              title="Abrir Painel de TV"
              className="flex items-center gap-2.5 px-1 rounded-md hover:bg-sidebar-accent/50 transition-colors"
            >
              <img src={somusLogoUrl} alt="Somus" className="h-7 w-auto object-contain dark:invert" />
              <span className="truncate font-display text-[13px] font-semibold tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
                Portal Interno
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent
            className="px-2 py-2"
            ref={(el) => {
              if (!el) return;
              const saved = Number(sessionStorage.getItem('sidebar-scroll') || '0');
              if (saved && el.scrollTop !== saved) el.scrollTop = saved;
              el.onscroll = () => sessionStorage.setItem('sidebar-scroll', String(el.scrollTop));
            }}
          >
            {filteredSections.map((section) => (
              <CollapsibleNavSection
                key={section.label}
                section={section}
                pathname={location.pathname}
              />
            ))}
          </SidebarContent>


          <SidebarFooter className="border-t border-sidebar-border p-2">
            <UserSidebarFooter
              profile={profile}
              role={role}
              onSettings={() => navigate({ to: '/settings' as any })}
              onLogout={handleLogout}
            />
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex min-h-0 flex-1 flex-col bg-background">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 lg:px-6">
            <SidebarTrigger className="-ml-1 h-8 w-8" />
            <div className="mx-1 hidden h-4 w-px bg-border sm:block" />

            <GlobalSearch />




            <div className="ml-auto flex items-center gap-2">
              {role !== 'client' && <PackEnergyIndicator />}
              <Badge variant="secondary" className="hidden h-6 border-none bg-primary/10 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-primary sm:inline-flex">
                {getRoleName(role, profile?.email)}
              </Badge>
              <ThemeToggle />
              <NotificationsPopover />
            </div>
          </header>

          <main className={isOperationsArea ? 'flex-1 overflow-y-auto bg-background px-8 py-6 sm:px-12 lg:px-16 lg:py-8' : 'flex-1 overflow-y-auto bg-background px-4 py-6 sm:px-6 lg:px-8 lg:py-8'}>
            {isOperationsArea ? (
              children
            ) : (
              <div className="mx-auto w-full max-w-[1400px]">
                {children}
              </div>
            )}
          </main>
          {role !== 'client' && <PackMoodDialog />}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function UserSidebarFooter({
  profile,
  role,
  onSettings,
  onLogout,
}: {
  profile: any;
  role: UserRole;
  onSettings: () => void;
  onLogout: () => void;
}) {
  const internalRoles: UserRole[] = ['master', 'project_manager', 'consultant'];
  const isInternal = internalRoles.includes(role);
  const excluded = new Set(EXCLUDED_FROM_GAMIFICATION_EMAILS.map((e: string) => e.toLowerCase()));
  const participates = isInternal && profile?.email && !excluded.has(String(profile.email).toLowerCase());
  // Sempre busca o perfil de gamificação para refletir o nível atual no selo,
  // mesmo para usuários que não competem (ex: dono da alcateia).
  const { data: gamProfile } = useMyGamificationProfile(profile?.id);
  const { data: pins = [] } = usePins();
  const { data: myPins = [] } = useUserPins(profile?.id);
  const stars = gamProfile?.total_stars ?? 0;
  // Dono da alcateia (excluído da competição) sempre é Lenda da Alcateia.
  const fallbackLevelName = excluded.has(String(profile?.email ?? '').toLowerCase())
    ? 'Lenda da Alcateia'
    : null;
  const lvl = getLevelInfo((gamProfile as any)?.current_level ?? fallbackLevelName);

  const unlockedSet = new Set(myPins.map((p: any) => p.pin_id));
  const myUnlockedPins = pins.filter((p: any) => unlockedSet.has(p.id));
  const featuredPin = myUnlockedPins.sort((a: any, b: any) => {
    const order: Record<string, number> = { legendary: 4, gold: 3, silver: 2, bronze: 1 };
    return (order[b.rarity] ?? 0) - (order[a.rarity] ?? 0);
  })[0];

  return (
    <div className="space-y-1.5">
      {participates && (
        <button
          type="button"
          onClick={onSettings}
          className="flex w-full items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2 py-1.5 text-left transition-colors hover:bg-primary/10"
          title={`${lvl.current.name} · ${stars} ${POINTS_LABEL}`}
        >
          <LevelSeal levelName={lvl.current.name} size="xs" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[11px] font-semibold text-foreground">{lvl.current.name}</p>
            <p className="truncate text-[10px] text-muted-foreground">{stars} {POINTS_LABEL}</p>
          </div>
        </button>
      )}
      <div className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-sidebar-accent/60">
        <button
          type="button"
          onClick={onSettings}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 text-left cursor-pointer"
        >
          {role === 'client' ? (
            <ClientAvatar
              name={profile?.full_name ?? profile?.email}
              photoUrl={(profile as any)?.avatar_url}
              size="sm"
            />
          ) : (
            <WolfAvatar
              avatarKey={(profile as any)?.avatar_key}
              seed={profile?.id ?? profile?.email}
              name={profile?.full_name ?? profile?.email}
              size="sm"
              featuredPin={featuredPin ?? null}
            />
          )}

          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[12.5px] font-semibold text-foreground">{profile?.full_name || 'Usuário'}</span>
            <span className="truncate text-[10.5px] text-muted-foreground">{getRoleName(role, profile?.email)}</span>
          </div>
        </button>
        <Button variant="ghost" size="icon" onClick={onLogout} className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive">
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

