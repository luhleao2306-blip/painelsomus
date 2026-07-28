import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { VISAO_SECTIONS, HORIZONS, visaoProgress } from '@/lib/visao-form';

export type ClientFormRequest = {
  id: string;
  token: string;
  template_key: string;
  template_name: string;
  client_id: string | null;
  client_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  status: 'pending' | 'submitted';
  answers: Record<string, any>;
  progress: number;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
};

function shortToken(len = 10): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => chars[b % chars.length]).join('');
}

export function formPublicUrl(token: string) {
  return `${window.location.origin}/vf/${token}`;
}

export function useClientFormRequests(clientId?: string) {
  return useQuery({
    queryKey: ['client-form-requests', clientId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('client_form_requests' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (clientId) q = q.eq('client_id', clientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ClientFormRequest[];
    },
  });
}

export function useCreateFormRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      template_key: string;
      template_name: string;
      client_id?: string | null;
      client_name?: string | null;
      contact_name?: string | null;
      contact_email?: string | null;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const token = shortToken();
      const { data, error } = await supabase
        .from('client_form_requests' as any)
        .insert({
          token,
          template_key: input.template_key,
          template_name: input.template_name,
          client_id: input.client_id || null,
          client_name: input.client_name || null,
          contact_name: input.contact_name || null,
          contact_email: input.contact_email || null,
          created_by: userData.user?.id ?? null,
        } as any)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as ClientFormRequest;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-form-requests'] }),
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao gerar o formulário'),
  });
}

export function useDeleteFormRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_form_requests' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-form-requests'] }),
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao excluir'),
  });
}

export function useLinkFormToClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; client_id: string | null }) => {
      const { error } = await supabase
        .from('client_form_requests' as any)
        .update({ client_id: input.client_id } as any)
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-form-requests'] }),
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao vincular cliente'),
  });
}

export { visaoProgress };

/* ---------------------------------- PDF ---------------------------------- */

export function exportVisaoPDF(req: ClientFormRequest) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 60;

  const ensure = (needed = 40) => {
    if (y > pageH - needed) {
      doc.addPage();
      y = 60;
    }
  };

  const write = (text: string, size: number, bold: boolean, color = 0) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(text || '—', pageW - marginX * 2);
    lines.forEach((ln: string) => {
      ensure(60);
      doc.text(ln, marginX, y);
      y += size + 4;
    });
    doc.setTextColor(0);
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SOMUS', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(req.template_name, pageW - marginX, y, { align: 'right' });
  doc.setTextColor(0);
  y += 22;
  doc.setDrawColor(220);
  doc.line(marginX, y, pageW - marginX, y);
  y += 26;

  write(req.client_name || 'Cliente não identificado', 14, true);
  write(
    `${req.contact_name ?? '—'} · ${req.contact_email ?? '—'} · ${
      req.submitted_at ? new Date(req.submitted_at).toLocaleString('pt-BR') : 'em preenchimento'
    }`,
    9,
    false,
    120,
  );
  y += 12;

  for (const s of VISAO_SECTIONS) {
    ensure(90);
    write(`${s.number} · ${s.title}`, 12, true);
    if (s.fields) {
      for (const f of s.fields) {
        write(f.label, 9, true, 110);
        write(String(req.answers?.[`${s.id}.${f.id}`] ?? '—'), 11, false);
        y += 4;
      }
    }
    if (s.horizons) {
      for (const h of HORIZONS) {
        write(h.label, 9, true, 110);
        write(String(req.answers?.[`${s.id}.${h.key}`] ?? '—'), 11, false);
        y += 4;
      }
    }
    if (s.results) {
      for (const h of HORIZONS) {
        write(h.label, 9, true, 110);
        for (let i = 1; i <= 3; i++) {
          write(`${i}. ${String(req.answers?.[`${s.id}.${h.key}.${i}`] ?? '—')}`, 11, false);
        }
        y += 4;
      }
    }
    y += 10;
  }

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Somus Group · portal.somus.group', pageW / 2, pageH - 24, { align: 'center' });

  const name = (req.client_name || 'formulario').replace(/\s+/g, '_');
  doc.save(`${name}_${req.template_key}.pdf`);
}

/* ------------------------- Respostas de links públicos ------------------------- */

export type PublicSubmission = {
  id: string;
  token: string;
  form_id: string | null;
  form_name: string | null;
  form_snapshot: any;
  answers: Record<string, any>;
  submitted_at: string;
  client_id?: string | null;
  client_name?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
};

export function usePublicSubmissions() {
  return useQuery({
    queryKey: ['public-form-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_form_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PublicSubmission[];
    },
  });
}

/** Exclui uma resposta recebida (somente usuários internos). */
export function useDeletePublicSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('public_form_submissions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['public-form-submissions'] });
      qc.invalidateQueries({ queryKey: ['my-public-form-submissions'] });
      toast.success('Resposta excluída');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao excluir a resposta'),
  });
}

/** Respostas vinculadas ao cliente logado (RLS filtra pelo client_id do perfil). */
export function useMyPublicSubmissions() {
  return useQuery({
    queryKey: ['my-public-form-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_form_submissions')
        .select('*')
        .not('client_id', 'is', null)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PublicSubmission[];
    },
  });
}


export function submissionFields(sub: PublicSubmission): { label: string; value: string }[] {
  const fields: any[] = sub.form_snapshot?.fields ?? [];
  if (fields.length > 0) {
    return fields.map(f => ({
      label: f.label ?? f.name ?? f.id,
      value: formatAnswer(sub.answers?.[f.id] ?? sub.answers?.[f.label]),
    }));
  }
  return Object.entries(sub.answers ?? {}).map(([k, v]) => ({ label: k, value: formatAnswer(v) }));
}

function formatAnswer(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  return String(v);
}

/** Nome do respondente inferido das respostas (nome / empresa / cliente / e-mail). */
export function submissionRespondent(sub: PublicSubmission): string {
  const entries = submissionFields(sub);
  const hit = (re: RegExp) =>
    entries.find(e => re.test(e.label.toLowerCase()) && e.value !== '—')?.value;
  return (
    hit(/(empresa|escrit|cliente|raz[aã]o)/) ||
    hit(/nome/) ||
    hit(/e-?mail/) ||
    'Não identificado'
  );
}

export function exportSubmissionPDF(sub: PublicSubmission) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 60;

  const write = (text: string, size: number, bold: boolean, color = 0) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.splitTextToSize(text || '—', pageW - marginX * 2).forEach((ln: string) => {
      if (y > pageH - 60) { doc.addPage(); y = 60; }
      doc.text(ln, marginX, y);
      y += size + 4;
    });
    doc.setTextColor(0);
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SOMUS', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(sub.form_name ?? 'Formulário', pageW - marginX, y, { align: 'right' });
  doc.setTextColor(0);
  y += 22;
  doc.setDrawColor(220);
  doc.line(marginX, y, pageW - marginX, y);
  y += 26;

  write(submissionRespondent(sub), 14, true);
  write(new Date(sub.submitted_at).toLocaleString('pt-BR'), 9, false, 120);
  y += 12;

  for (const f of submissionFields(sub)) {
    write(f.label, 9, true, 110);
    write(f.value, 11, false);
    y += 6;
  }

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Somus Group · portal.somus.group', pageW / 2, pageH - 24, { align: 'center' });
  doc.save(`${submissionRespondent(sub).replace(/\s+/g, '_')}_${sub.form_name ?? 'formulario'}.pdf`);
}
