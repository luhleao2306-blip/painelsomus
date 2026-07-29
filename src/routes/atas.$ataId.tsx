import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, Download, Video, Pencil, Printer, Link2, History, Flag,
} from 'lucide-react';
import { toast } from 'sonner';
import somusLogo from '@/assets/somus-logo.png';

export const Route = createFileRoute('/atas/$ataId')({
  component: function AtaRouteComponent() {
    const { ataId } = Route.useParams();
    return <AtaPage ataId={ataId} />;
  },
});

export function AtaPage({ ataId }: { ataId: string }) {
  const navigate = useNavigate();
  const { role } = useProfile();
  const { minutes, clients, projects, getDownloadUrl } = useData();
  const [responsibleName, setResponsibleName] = useState<string>('—');

  const minute = minutes.find(m => m.id === ataId);

  if (!minute) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
          <h1 className="text-2xl font-black">Ata não encontrada</h1>
          <p className="text-sm text-muted-foreground">Esta ata não existe ou foi removida.</p>
          <Button onClick={() => navigate({ to: '/meetings' })}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Atas
          </Button>
        </div>
      </MainLayout>
    );
  }

  const client = clients.find(c => c.id === minute.clientId);
  const project = projects.find(p => p.id === minute.projectId);

  useEffect(() => {
    const id = minute?.internalResponsibleId;
    if (!id) { setResponsibleName('—'); return; }
    let cancelled = false;
    supabase.from('profiles').select('full_name').eq('id', id).maybeSingle()
      .then(({ data }) => { if (!cancelled) setResponsibleName(data?.full_name ?? '—'); });
    return () => { cancelled = true; };
  }, [minute?.internalResponsibleId]);

  const canDownload = !!minute.filePath && (role !== 'client' || minute.downloadEnabled);

  const handleDownload = async () => {
    if (!minute.filePath) return;
    const url = await getDownloadUrl(minute.filePath);
    if (url) window.open(url, '_blank');
    else toast.error('Não foi possível gerar o link de download');
  };

  const ref = `${(client?.name || 'ATA').toUpperCase().replace(/\s+/g, '-').slice(0, 14)}-${new Date(minute.date).toISOString().slice(0, 10)}`;
  const issuedAt = new Date().toLocaleDateString('pt-BR');
  const meetingDate = new Date(minute.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <MainLayout>
      {/* Action bar — hidden on print */}
      <div className="max-w-4xl mx-auto mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/meetings' })} className="gap-2 -ml-2 h-8 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Button>
        <div className="flex-1" />
        {(role === 'master' || role === 'project_manager') && (
          <Button size="sm" variant="outline" onClick={() => navigate({ to: '/meetings', hash: `edit-${ataId}` })} className="gap-1.5 h-8 text-xs">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
        )}
        {canDownload && (
          <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5 h-8 text-xs">
            <Download className="h-3.5 w-3.5" /> Anexo
          </Button>
        )}
        {minute.recordingLink && (
          <Button size="sm" variant="outline" asChild className="gap-1.5 h-8 text-xs">
            <a href={minute.recordingLink} target="_blank" rel="noopener noreferrer">
              <Video className="h-3.5 w-3.5" /> Vídeo
            </a>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const url = `${window.location.origin}/p/ata/${ataId}`;
            navigator.clipboard.writeText(url).then(
              () => toast.success('Link público copiado!'),
              () => toast.error('Falha ao copiar')
            );
          }}
          className="gap-1.5 h-8 text-xs"
        >
          <Link2 className="h-3.5 w-3.5" /> Link público
        </Button>
        <Button size="sm" onClick={() => window.print()} className="gap-1.5 h-8 text-xs">
          <Printer className="h-3.5 w-3.5" /> PDF
        </Button>
      </div>

      {/* DOCUMENT */}
      <article className="ata-doc max-w-4xl mx-auto bg-white text-slate-900 shadow-sm border border-slate-200 print:border-0 print:shadow-none">
        {/* Header */}
        <header className="px-10 pt-10 pb-6 border-b-4 border-gradient bg-white">
          <div className="flex items-start justify-between gap-6">
            <img src={somusLogo} alt="Somus" className="h-12 w-auto object-contain dark:invert" />
            <div className="text-right">
              <p className="text-[11px] font-bold tracking-[0.2em] text-slate-600">ATA DE REUNIÃO</p>
              <p className="text-[11px] text-slate-500 mt-1">Ref. {ref}</p>
              <p className="text-[11px] text-slate-500">Emitido em {issuedAt}</p>
            </div>
          </div>
          <div className="h-1 mt-4 bg-gradient-to-r from-emerald-400 via-sky-500 to-blue-700 rounded-full" />
        </header>

        {/* Title block */}
        <section className="px-10 pt-8">
          <p className="text-[11px] font-bold tracking-[0.2em] text-blue-700">
            {(client?.name || 'CLIENTE').toUpperCase()} · CONSULTORIA SOMUS
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mt-2 leading-tight">
            {minute.title}
          </h1>
          {project?.name && (
            <p className="text-lg text-slate-500 mt-2">{project.name}</p>
          )}
        </section>

        {/* Info grid */}
        <section className="px-10 pt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoCard label="Cliente" value={client?.name ?? '—'} />
          <InfoCard label="Data da reunião" value={meetingDate} />
          <InfoCard label="Projeto" value={project?.name ?? '—'} />
          <InfoCard label="Formato" value="Reunião estratégica" />
          <InfoCard label="Participantes" value={minute.attendees?.join(' · ') || '—'} />
          <InfoCard label="Responsável Somus" value={responsibleName} />
        </section>

        {/* Sections */}
        <section className="px-10 pt-10 pb-10 space-y-8">
          <DocSection n="01" title="Contexto da reunião">
            <Body text={minute.agenda} fallback="Nenhum contexto registrado." />
          </DocSection>

          <DocSection n="02" title="Assuntos discutidos e decisões">
            <Body text={minute.decisions} fallback="Nenhuma decisão registrada." />
          </DocSection>

          <DocSection n="03" title="Próximos passos">
            <Body text={minute.nextSteps} fallback="Nenhum próximo passo registrado." />
          </DocSection>

          <DocSection n="04" title="Pendências">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PendingBox tone="team" title="Equipe — Modblue" text={minute.teamPending} />
              <PendingBox tone="client" title={`Cliente — ${client?.name ?? '—'}`} text={minute.clientPending} />
            </div>
          </DocSection>

          {minute.filePath && (
            <DocSection n="05" title="Anexos">
              <div className="flex items-center gap-3">
                <p className="text-sm text-slate-600 break-all flex-1">{minute.filePath.split('/').pop()}</p>
                {canDownload && (
                  <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5 h-8 text-xs shrink-0 print:hidden">
                    <Download className="h-3.5 w-3.5" /> Baixar
                  </Button>
                )}
              </div>
            </DocSection>
          )}
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 px-10 py-4 flex items-center justify-between text-[11px] text-slate-500">
          <span className="font-semibold">modblue · Somus Hub — Gestão Imersiva</span>
          <span>Documento confidencial</span>
        </footer>
      </article>

      <div className="max-w-4xl mx-auto mt-6 print:hidden">
        <RevisionsSection ataId={ataId} />
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white; }
          .ata-doc { max-width: none !important; margin: 0 !important; }
        }
      `}</style>
    </MainLayout>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
      <p className="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-1 leading-snug">{value}</p>
    </div>
  );
}

function DocSection({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-400/20 text-emerald-600">
          <Flag className="h-3.5 w-3.5" />
        </span>
        <span className="text-[10px] font-bold text-slate-400 tracking-widest">{n}</span>
        <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
      </div>
      <div className="pt-3">{children}</div>
    </div>
  );
}

function PendingBox({ tone, title, text }: { tone: 'team' | 'client'; title: string; text?: string | null }) {
  const ring = tone === 'team' ? 'border-blue-200 bg-blue-50/40' : 'border-emerald-200 bg-emerald-50/40';
  const label = tone === 'team' ? 'text-blue-700' : 'text-emerald-700';
  return (
    <div className={`rounded-lg border ${ring} p-4`}>
      <p className={`text-[10px] font-bold tracking-[0.2em] uppercase ${label}`}>{title}</p>
      <div className="mt-2">
        <Body text={text} fallback="Nenhuma pendência." />
      </div>
    </div>
  );
}

function Body({ text, fallback }: { text?: string | null; fallback: string }) {
  if (!text || !text.trim()) return <p className="text-sm italic text-slate-400">{fallback}</p>;
  // Bullet-style: split by newlines, render as list when multiline
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return (
      <ul className="space-y-1.5">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
            <span className="text-emerald-500 mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>{l.replace(/^[-•*]\s*/, '')}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{text}</p>;
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Título',
  date: 'Data',
  agenda: 'Pauta',
  decisions: 'Decisões',
  next_steps: 'Próximos passos',
  client_pending: 'Pendências do cliente',
  team_pending: 'Pendências do time',
  attendees: 'Participantes',
  recording_link: 'Link da gravação',
  status: 'Status',
  project_id: 'Projeto',
  internal_responsible_id: 'Responsável interno',
};

type Revision = {
  id: string;
  edited_at: string;
  edited_by_name: string | null;
  changes: Record<string, { old: unknown; new: unknown }>;
};

function RevisionsSection({ ataId }: { ataId: string }) {
  const [revs, setRevs] = useState<Revision[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.from('meeting_minute_revisions')
      .select('id, edited_at, edited_by_name, changes')
      .eq('minute_id', ataId)
      .order('edited_at', { ascending: false })
      .then(({ data }) => { if (!cancelled) setRevs((data ?? []) as Revision[]); });
    return () => { cancelled = true; };
  }, [ataId]);

  return (
    <div className="rounded-lg border border-border/40 bg-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] flex items-center gap-1.5 text-muted-foreground mb-2">
        <History className="h-3 w-3" /> Histórico de edições
      </p>
      {revs === null ? (
        <p className="text-xs italic text-muted-foreground">Carregando…</p>
      ) : revs.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">Nenhuma edição registrada.</p>
      ) : (
        <ul className="space-y-2">
          {revs.map(r => {
            const fields = Object.keys(r.changes ?? {});
            return (
              <li key={r.id} className="border-l-2 border-border pl-3 py-1">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <strong className="text-foreground font-medium">{r.edited_by_name ?? 'Usuário'}</strong>
                  <span>•</span>
                  <span>{new Date(r.edited_at).toLocaleString('pt-BR')}</span>
                </div>
                <p className="text-xs mt-0.5">
                  Alterou: {fields.length === 0
                    ? <em className="text-muted-foreground">—</em>
                    : fields.map(f => FIELD_LABELS[f] ?? f).join(', ')}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
