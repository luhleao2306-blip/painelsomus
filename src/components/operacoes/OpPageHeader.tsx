import type { ReactNode } from 'react';

export function OpPageHeader({
  eyebrow, title, description, actions, icon,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-5">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">
              {icon}
            </div>
          )}
          <h1 className="font-display text-[26px] font-semibold leading-none tracking-tight">{title}</h1>
        </div>
        {description && <p className="mt-2 max-w-2xl text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
