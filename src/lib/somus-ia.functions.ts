import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

const OPENAI_BASE = 'https://api.openai.com/v1';

async function openai(path: string, init: RequestInit = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY não configurada');
  const res = await fetch(`${OPENAI_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text}`);
  }
  return res.json();
}

async function runAssistantAndWait(threadId: string, assistantId: string): Promise<string> {
  const run = await openai(`/threads/${threadId}/runs`, {
    method: 'POST',
    body: JSON.stringify({ assistant_id: assistantId }),
  });
  const runId = run.id as string;
  const started = Date.now();
  // Poll up to ~60s
  while (Date.now() - started < 60000) {
    await new Promise((r) => setTimeout(r, 1200));
    const status = await openai(`/threads/${threadId}/runs/${runId}`);
    if (status.status === 'completed') break;
    if (['failed', 'cancelled', 'expired'].includes(status.status)) {
      throw new Error(`Run ${status.status}: ${status.last_error?.message ?? ''}`);
    }
  }
  const msgs = await openai(`/threads/${threadId}/messages?order=desc&limit=1`);
  const first = msgs.data?.[0];
  const text =
    first?.content
      ?.filter((c: any) => c.type === 'text')
      .map((c: any) => c.text?.value ?? '')
      .join('\n\n') ?? '';
  return text;
}

// ───────────────────────────────────── agents

export const listSomusAgents = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('somus_agents')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertSomusAgent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1),
      description: z.string().optional().nullable(),
      openai_assistant_id: z.string().min(3),
      icon: z.string().optional().nullable(),
      sort_order: z.number().int().optional(),
      is_active: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const payload = { ...data };
    const { data: row, error } = data.id
      ? await context.supabase.from('somus_agents').update(payload).eq('id', data.id).select().single()
      : await context.supabase.from('somus_agents').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSomusAgent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('somus_agents').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ───────────────────────────────────── conversations

export const listSomusConversations = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('somus_conversations')
      .select('id, title, agent_id, last_message_at, created_at')
      .order('last_message_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getSomusConversation = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: conv, error } = await context.supabase
      .from('somus_conversations')
      .select('*')
      .eq('id', data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!conv) throw new Error('Conversa não encontrada');
    const { data: messages, error: mErr } = await context.supabase
      .from('somus_messages')
      .select('*')
      .eq('conversation_id', data.id)
      .order('created_at', { ascending: true });
    if (mErr) throw new Error(mErr.message);
    return { conversation: conv, messages: messages ?? [] };
  });

export const deleteSomusConversation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('somus_conversations').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ───────────────────────────────────── messaging

export const sendSomusMessage = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      conversationId: z.string().uuid().optional(),
      agentId: z.string().uuid(),
      content: z.string().min(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load agent
    const { data: agent, error: aErr } = await supabase
      .from('somus_agents')
      .select('*')
      .eq('id', data.agentId)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!agent) throw new Error('Agente não encontrado');

    // Load or create conversation
    let conversationId: string | undefined = data.conversationId;
    let threadId: string | null = null;

    if (conversationId) {
      const { data: conv } = await supabase
        .from('somus_conversations')
        .select('id, openai_thread_id')
        .eq('id', conversationId)
        .maybeSingle();
      if (!conv) throw new Error('Conversa não encontrada');
      threadId = conv.openai_thread_id;
    }

    if (!threadId) {
      const thread = await openai('/threads', { method: 'POST', body: '{}' });
      threadId = thread.id as string;

      if (!conversationId) {
        const title = data.content.slice(0, 60).replace(/\s+/g, ' ').trim() || 'Nova conversa';
        const { data: created, error: cErr } = await supabase
          .from('somus_conversations')
          .insert({
            user_id: userId,
            agent_id: data.agentId,
            title,
            openai_thread_id: threadId,
          })
          .select()
          .single();
        if (cErr) throw new Error(cErr.message);
        conversationId = created.id;
      } else {
        await supabase
          .from('somus_conversations')
          .update({ openai_thread_id: threadId, agent_id: data.agentId })
          .eq('id', conversationId);
      }
    }

    // Save user message
    await supabase.from('somus_messages').insert({
      conversation_id: conversationId,
      user_id: userId,
      role: 'user',
      content: data.content,
    });

    // Send to OpenAI thread
    await openai(`/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role: 'user', content: data.content }),
    });

    // Run + wait
    const reply = await runAssistantAndWait(threadId, agent.openai_assistant_id);

    // Save assistant message
    const { data: assistantMsg, error: amErr } = await supabase
      .from('somus_messages')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role: 'assistant',
        content: reply,
      })
      .select()
      .single();
    if (amErr) throw new Error(amErr.message);

    await supabase
      .from('somus_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    return { conversationId, assistantMessage: assistantMsg };
  });
