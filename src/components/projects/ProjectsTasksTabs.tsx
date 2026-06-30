import { Link, useRouterState } from '@tanstack/react-router';
import { Briefcase, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/projects', label: 'Projetos', icon: Briefcase },
  { to: '/tasks', label: 'Tarefas', icon: CheckSquare },
];

export function ProjectsTasksTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1">
      {tabs.map((t) => {
        const active = pathname === t.to || pathname.startsWith(`${t.to}/`);
        const Icon = t.icon;

        if (t.to === '/tasks') {
          return (
            <Link
              key={t.to}
              to="/tasks"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-all',
                active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </Link>
          );
        }

        return (
          <Link
            key={t.to}
            to="/projects"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-all',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
