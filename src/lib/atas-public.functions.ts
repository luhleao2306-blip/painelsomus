import { createServerFn } from '@tanstack/react-start';

export type PublicAta = {
  id: string;
  title: string;
  date: string;
  attendees: string[];
  agenda: string | null;
  decisions: string | null;
  clientPending: string | null;
  teamPending: string | null;
  nextSteps: string | null;
  recordingLink: string | null;
  clientName: string | null;
  projectName: string | null;
};

export const getPublicAta = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<PublicAta | null> => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: m, error } = await supabaseAdmin
      .from('meeting_minutes')
      .select('id, title, meeting_date, attendees, agenda, decisions, client_pending, team_pending, next_steps, recording_link, client_id, project_id')
      .eq('id', data.id)
      .maybeSingle();
    if (error || !m) return null;

    let clientName: string | null = null;
    let projectName: string | null = null;
    if (m.client_id) {
      const { data: c } = await supabaseAdmin.from('clients').select('name').eq('id', m.client_id).maybeSingle();
      clientName = c?.name ?? null;
    }
    if (m.project_id) {
      const { data: p } = await supabaseAdmin.from('projects').select('name').eq('id', m.project_id).maybeSingle();
      projectName = p?.name ?? null;
    }

    return {
      id: m.id,
      title: m.title,
      date: m.meeting_date,
      attendees: (m.attendees ?? []) as string[],
      agenda: m.agenda,
      decisions: m.decisions,
      clientPending: m.client_pending,
      teamPending: m.team_pending,
      nextSteps: m.next_steps,
      recordingLink: m.recording_link,
      clientName,
      projectName,
    };
  });
