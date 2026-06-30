import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useData } from '@/contexts/DataContext';
import { useProfile, UserRole } from '@/hooks/use-profile';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  FileText,
  UsersRound,
  Cpu,
  Settings,
} from 'lucide-react';

const navItems = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['master', 'project_manager', 'consultant'] },
  
  { title: 'Clientes', icon: Users, href: '/clients', roles: ['master', 'project_manager'] },
  
  { title: 'Tarefas', icon: CheckSquare, href: '/tasks', roles: ['master', 'project_manager', 'consultant', 'client'] },
  { title: 'Documentos', icon: FileText, href: '/documents', roles: ['master', 'project_manager', 'consultant', 'client'] },
  { title: 'Atas de Reunião', icon: UsersRound, href: '/meetings', roles: ['master', 'project_manager', 'consultant', 'client'] },
  { title: 'Central Inteligente', icon: Cpu, href: '/intelligent-central', roles: ['master', 'project_manager', 'consultant', 'client'] },
  { title: 'Configurações', icon: Settings, href: '/settings', roles: ['master', 'project_manager', 'consultant', 'client'] },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { role } = useProfile();
  const {
    filteredClients,
    filteredProjects,
    filteredTasks,
    filteredDocuments,
    filteredMinutes,
    filteredIntelligentCentral,
  } = useData();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        if (e.key === '/' && (e.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA/)) return;
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const visibleNav = useMemo(
    () => navItems.filter((n) => n.roles.includes(role as UserRole)),
    [role]
  );

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-1 hidden md:flex items-center max-w-md group"
      >
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          <div className="pl-10 pr-16 h-9 flex items-center rounded-md bg-muted/30 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
            Pesquisar...
          </div>
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar clientes, tarefas, documentos..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

          <CommandGroup heading="Navegação">
            {visibleNav.map((n) => (
              <CommandItem key={n.href} value={`nav ${n.title}`} onSelect={() => go(n.href)}>
                <n.icon className="mr-2 h-4 w-4" />
                {n.title}
              </CommandItem>
            ))}
          </CommandGroup>

          {filteredClients.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Clientes">
                {filteredClients.slice(0, 20).map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`cliente ${c.name} ${c.email ?? ''}`}
                    onSelect={() => go(`/clients/${c.id}`)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {false && filteredProjects.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Projetos">
                {filteredProjects.slice(0, 20).map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`projeto ${p.name}`}
                    onSelect={() => go(`/projects/${p.id}`)}
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    {p.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}


          {filteredTasks.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Tarefas">
                {filteredTasks.slice(0, 15).map((t) => (
                  <CommandItem
                    key={t.id}
                    value={`tarefa ${t.title}`}
                    onSelect={() => go('/tasks')}
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    {t.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {filteredDocuments.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Documentos">
                {filteredDocuments.slice(0, 15).map((d) => (
                  <CommandItem
                    key={d.id}
                    value={`documento ${d.name}`}
                    onSelect={() => go('/documents')}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {d.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {filteredMinutes.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Atas de Reunião">
                {filteredMinutes.slice(0, 10).map((m) => (
                  <CommandItem
                    key={m.id}
                    value={`ata ${m.title ?? m.agenda ?? ''}`}
                    onSelect={() => go('/meetings')}
                  >
                    <UsersRound className="mr-2 h-4 w-4" />
                    {m.title ?? m.agenda ?? 'Ata sem título'}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {filteredIntelligentCentral.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Central Inteligente">
                {filteredIntelligentCentral.slice(0, 10).map((i) => (
                  <CommandItem
                    key={i.id}
                    value={`central ${i.name}`}
                    onSelect={() => go('/intelligent-central')}
                  >
                    <Cpu className="mr-2 h-4 w-4" />
                    {i.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
