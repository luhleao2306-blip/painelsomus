import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Calendar, UsersRound, FileText, Video, AlertCircle, Clock, CheckCircle2, ArrowRight, Building2, Briefcase, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPublicAta, type PublicAta } from '@/lib/atas-public.functions';

export const Route = createFileRoute('/p/ata/$ataId')({
  component: PublicAtaPage,
});

function PublicAtaPage() {
  const { ataId } = Route.useParams();
  const [ata, setAta] = useState<PublicAta | null | 'loading'>('loading');

  useEffect(() => {
    getPublicAta({ data: { id: ataId } }).then(setAta).catch(() => setAta(null));
  }, [ataId]);

  if (ata === 'loading') {
    return <div className="max-w-3xl mx-auto py-20 text-center text-sm text-muted-foreground">Carregando…</div>;
  }
  if (!ata) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-3">
        <h1 className="text-2xl font-bold">Ata não encontrada</h1>
        <p className="text-sm text-muted-foreground">Este link é inválido ou foi removido.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4 print:p-0">
      <div className="flex justify-end print:hidden">
        <Button size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="h-3.5 w-3.5" /> Imprimir / PDF
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {ata.clientName && (
            <Badge variant="secondary" className="gap-1 text-[10px]"><Building2 className="h-2.5 w-2.5" /> {ata.clientName}</Badge>
          )}
          {ata.projectName && (
            <Badge variant="outline" className="gap-1 text-[10px]"><Briefcase className="h-2.5 w-2.5" /> {ata.projectName}</Badge>
          )}
          <Badge variant="outline" className="gap-1 text-[10px]"><Calendar className="h-2.5 w-2.5" /> {new Date(ata.date).toLocaleDateString('pt-BR')}</Badge>
          <Badge variant="outline" className="gap-1 text-[10px]"><UsersRound className="h-2.5 w-2.5" /> {ata.attendees.length}</Badge>
        </div>
        <h1 className="text-2xl font-bold">{ata.title}</h1>
      </div>

      <Section title="Participantes" icon={UsersRound}>
        {ata.attendees.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {ata.attendees.map((a, i) => <Badge key={i} variant="secondary" className="text-[10px]">{a}</Badge>)}
          </div>
        ) : <Empty>—</Empty>}
      </Section>
      <Section title="Pauta" icon={FileText}><Body text={ata.agenda} /></Section>
      <Section title="Decisões" icon={CheckCircle2}><Body text={ata.decisions} /></Section>
      <Section title="Próximos passos" icon={ArrowRight}><Body text={ata.nextSteps} /></Section>
      <Section title="Pendências do cliente" icon={AlertCircle}><Body text={ata.clientPending} /></Section>
      <Section title="Pendências do time" icon={Clock}><Body text={ata.teamPending} /></Section>
      {ata.recordingLink && (
        <Section title="Gravação" icon={Video}>
          <a href={ata.recordingLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">{ata.recordingLink}</a>
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <Card className="border-border/40 shadow-none break-inside-avoid">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.18em] flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3 w-3" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">{children}</CardContent>
    </Card>
  );
}
function Body({ text }: { text?: string | null }) {
  if (!text || !text.trim()) return <Empty>—</Empty>;
  return <p className="text-sm whitespace-pre-wrap leading-snug">{text}</p>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs italic text-muted-foreground">{children}</p>;
}
