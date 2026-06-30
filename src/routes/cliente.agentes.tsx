import { createFileRoute } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { useClientAgents } from '@/lib/client-portal-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/design-system/DesignSystem';
import { Bot, ExternalLink, Sparkles } from 'lucide-react';

export const Route = createFileRoute('/cliente/agentes')({ component: AgentesPage });

function AgentesPage() {
  const { data: agents = [], isLoading } = useClientAgents();
  const active = agents.filter(a => a.is_active);
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-1 pb-2 border-b border-border/40">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Inteligência artificial</span>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Agentes</h1>
          <p className="text-sm text-muted-foreground">Agentes de IA selecionados pela Somus para acelerar a sua operação.</p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : active.length === 0 ? (
          <EmptyState icon={Sparkles} title="Em breve" description="Nenhum agente disponibilizado para você ainda." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map(a => (
              <Card key={a.id} className="border-border/50 hover:border-primary/40 transition-colors">
                <CardContent className="p-5 flex flex-col gap-3 h-full">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{a.name}</h3>
                      {a.category && <Badge variant="secondary" className="text-[10px] mt-0.5">{a.category}</Badge>}
                    </div>
                  </div>
                  {a.description && <p className="text-sm text-muted-foreground line-clamp-3 flex-1">{a.description}</p>}
                  <Button asChild className="w-full mt-auto">
                    <a href={a.external_url} target="_blank" rel="noopener noreferrer">
                      Abrir agente <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
