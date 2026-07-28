import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
  'Access-Control-Max-Age': '86400',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });

const payloadSchema = z.object({
  form_id: z.string().trim().min(1).max(120).optional(),
  form_name: z.string().trim().min(1).max(200).default('Visão de Futuro'),
  client_name: z.string().trim().max(200).optional(),
  contact_name: z.string().trim().max(200).optional(),
  contact_email: z.string().trim().max(255).optional(),
  answers: z.record(z.string(), z.any()).default({}),
  form_snapshot: z.record(z.string(), z.any()).optional(),
});

export const Route = createFileRoute('/api/public/visao-submissions')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const secret = process.env.SOMUS_WEBHOOK_SECRET;
        if (!secret) return json({ error: 'webhook_not_configured' }, 500);

        const provided = request.headers.get('x-webhook-secret') ?? '';
        if (provided !== secret) return json({ error: 'unauthorized' }, 401);

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: 'invalid_json' }, 400);
        }

        const parsed = payloadSchema.safeParse(raw);
        if (!parsed.success) {
          return json({ error: 'invalid_payload', details: parsed.error.issues }, 400);
        }
        const data = parsed.data;

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

        // Um "share" externo agrupa todas as respostas vindas da plataforma Somus Visão.
        const token = `ext-${(data.form_id ?? 'visao-futuro').slice(0, 60)}`;

        const { error: shareError } = await supabaseAdmin
          .from('public_form_shares')
          .upsert(
            {
              token,
              form: ({
                id: data.form_id ?? 'visao-futuro',
                name: data.form_name,
                external: true,
                fields: [],
              }) as never,
            },
            { onConflict: 'token' },
          );
        if (shareError) {
          console.error('visao-submissions share error', shareError);
          return json({ error: 'share_failed', message: shareError.message }, 500);
        }

        const answers: Record<string, unknown> = { ...data.answers };
        if (data.client_name) answers['Cliente'] = data.client_name;
        if (data.contact_name) answers['Contato'] = data.contact_name;
        if (data.contact_email) answers['E-mail'] = data.contact_email;

        const { data: inserted, error } = await supabaseAdmin
          .from('public_form_submissions')
          .insert({
            token,
            form_id: data.form_id ?? 'visao-futuro',
            form_name: data.client_name
              ? `${data.form_name} — ${data.client_name}`
              : data.form_name,
            form_snapshot: (data.form_snapshot ?? { name: data.form_name, external: true }) as never,
            answers: answers as never,
            client_name: data.client_name ?? null,
            contact_name: data.contact_name ?? null,
            contact_email: data.contact_email ?? null,
          })
          .select('id, client_id')
          .single();

        if (error) {
          console.error('visao-submissions insert error', error);
          return json({ error: 'insert_failed', message: error.message }, 500);
        }

        return json({ ok: true, id: inserted.id, client_id: inserted.client_id ?? null }, 201);
      },
    },
  },
});
