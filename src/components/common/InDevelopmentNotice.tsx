import { Construction } from 'lucide-react';

interface InDevelopmentNoticeProps {
  module: string;
}

export function InDevelopmentNotice({ module }: InDevelopmentNoticeProps) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Construction className="h-6 w-6" />
      </div>
      <h1 className="font-display text-xl font-semibold tracking-tight">
        {module} em desenvolvimento
      </h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        Esta área está sendo construída para oferecer a melhor experiência.
        Em breve você poderá acessar todas as funcionalidades.
      </p>
    </div>
  );
}
