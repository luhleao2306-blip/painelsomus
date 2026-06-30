import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/design-system/DesignSystem';
import {
  BookOpen,
  Search,
  TrendingUp,
  Megaphone,
  Wallet,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/cliente/glossario')({ component: GlossaryPage });

type GlossaryTerm = {
  id: string;
  term: string;
  definition: string;
  example: string | null;
  category: string;
  display_order: number;
};

const CATEGORIES: Array<{
  key: string;
  label: string;
  tagline: string;
  icon: LucideIcon;
  ring: string;
  border: string;
  badge: string;
  iconBg: string;
  gradient: string;
  accent: string;
}> = [
  {
    key: 'Comercial & Vendas',
    label: 'Comercial & Vendas',
    tagline: 'Pipeline, conversão e geração de receita.',
    icon: TrendingUp,
    ring: 'ring-[#1ED3CE]/30',
    border: 'border-[#1ED3CE]/40 hover:border-[#1ED3CE]/70',
    badge: 'bg-[#1ED3CE]/15 text-[#0a8a86] dark:text-[#1ED3CE] border-[#1ED3CE]/30',
    iconBg: 'bg-[#1ED3CE]/15 text-[#0a8a86] dark:text-[#1ED3CE]',
    gradient: 'from-[#1ED3CE]/15 via-[#1ED3CE]/5 to-transparent',
    accent: '#1ED3CE',
  },
  {
    key: 'Marketing & Tráfego',
    label: 'Marketing & Tráfego',
    tagline: 'Aquisição, mídia paga e marca.',
    icon: Megaphone,
    ring: 'ring-[#006EFF]/30',
    border: 'border-[#006EFF]/40 hover:border-[#006EFF]/70',
    badge: 'bg-[#006EFF]/15 text-[#006EFF] border-[#006EFF]/30',
    iconBg: 'bg-[#006EFF]/15 text-[#006EFF]',
    gradient: 'from-[#006EFF]/15 via-[#006EFF]/5 to-transparent',
    accent: '#006EFF',
  },
  {
    key: 'Financeiro',
    label: 'Financeiro',
    tagline: 'Saúde financeira, margens e fluxo de caixa.',
    icon: Wallet,
    ring: 'ring-emerald-500/30',
    border: 'border-emerald-500/40 hover:border-emerald-500/70',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    iconBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    gradient: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
    accent: '#10b981',
  },
  {
    key: 'Gestão, OKRs & Pessoas',
    label: 'Gestão, OKRs & Pessoas',
    tagline: 'Estratégia, metas e desenvolvimento de time.',
    icon: Target,
    ring: 'ring-violet-500/30',
    border: 'border-violet-500/40 hover:border-violet-500/70',
    badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
    iconBg: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
    gradient: 'from-violet-500/15 via-violet-500/5 to-transparent',
    accent: '#8b5cf6',
  },
];

function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-foreground rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function GlossaryPage() {
  const [query, setQuery] = useState('');

  const { data: terms = [], isLoading } = useQuery({
    queryKey: ['glossary_terms_global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('glossary_terms' as any)
        .select('id, term, definition, example, category, display_order')
        .order('category', { ascending: true })
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as GlossaryTerm[];
    },
  });

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return terms;
    return terms.filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q) ||
        (t.example ?? '').toLowerCase().includes(q),
    );
  }, [terms, q]);

  const byCategory = useMemo(() => {
    const map = new Map<string, GlossaryTerm[]>();
    for (const t of filtered) {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    }
    return map;
  }, [filtered]);

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-[#1ED3CE]/10 via-[#006EFF]/5 to-violet-500/10 p-8">
          <div className="relative z-10 space-y-3">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" /> Referência compartilhada
            </span>
            <h1 className="font-display text-4xl font-semibold tracking-tight">Glossário de Gestão</h1>
            <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
              Os principais termos de gestão que usamos no dia a dia da sua operação — explicados de forma simples.
            </p>
            <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
              <Badge variant="secondary" className="font-mono">{terms.length} termos</Badge>
              {q && <span>· {filtered.length} resultado{filtered.length === 1 ? '' : 's'} para "{query}"</span>}
            </div>
          </div>
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#006EFF]/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-[#1ED3CE]/10 blur-3xl" />
        </div>

        {/* Sticky search */}
        <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border/40">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar termo ou definição..."
              className="pl-9 h-11"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-lg border border-border/40 bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhum termo encontrado"
            description={q ? `Tente outra busca além de "${query}".` : 'Em breve adicionaremos termos ao glossário.'}
          />
        ) : (
          <div className="space-y-10">
            {CATEGORIES.map((cat) => {
              const items = byCategory.get(cat.key) ?? [];
              if (items.length === 0) return null;
              const Icon = cat.icon;
              return (
                <section key={cat.key} className="space-y-4">
                  {/* Theme header */}
                  <div
                    className={cn(
                      'relative overflow-hidden rounded-xl border bg-gradient-to-r p-5',
                      cat.border,
                      cat.gradient,
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', cat.iconBg)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-display text-xl font-semibold tracking-tight">{cat.label}</h2>
                          <Badge variant="outline" className={cn('text-[10px]', cat.badge)}>
                            {items.length} {items.length === 1 ? 'termo' : 'termos'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{cat.tagline}</p>
                      </div>
                    </div>
                  </div>

                  {/* Cards grid */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((t) => (
                      <Card
                        key={t.id}
                        className={cn(
                          'group relative overflow-hidden border bg-card/60 backdrop-blur-sm transition-all hover:shadow-md hover:-translate-y-0.5',
                          cat.border,
                        )}
                      >
                        <div
                          className="absolute left-0 top-0 h-full w-1"
                          style={{ backgroundColor: cat.accent }}
                        />
                        <CardContent className="p-5 space-y-2.5 pl-6">
                          <h3 className="font-semibold text-base leading-snug">
                            {highlight(t.term, q)}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {highlight(t.definition, q)}
                          </p>
                          {t.example && (
                            <div
                              className={cn(
                                'mt-2 rounded-md border-l-2 px-3 py-2 text-xs italic text-muted-foreground/90',
                              )}
                              style={{ borderColor: cat.accent, backgroundColor: `${cat.accent}10` }}
                            >
                              <span className="font-semibold not-italic mr-1">Ex.:</span>
                              {highlight(t.example, q)}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
