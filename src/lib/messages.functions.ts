import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

export const sendConsultantMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Get the sender's profile
    const { data: sender, error: senderErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, consultant_id, client_id")
      .eq("id", userId)
      .maybeSingle();

    if (senderErr || !sender) {
      throw new Error("Perfil do remetente não encontrado");
    }

    // Determine recipients: the assigned consultant + all masters
    const recipientIds = new Set<string>();

    if (sender.consultant_id) {
      recipientIds.add(sender.consultant_id);
    }

    const { data: masters } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "master");

    masters?.forEach((m) => recipientIds.add(m.id));

    // Remove sender from recipients
    recipientIds.delete(userId);

    if (recipientIds.size === 0) {
      throw new Error("Nenhum destinatário disponível para sua mensagem.");
    }

    const senderName = sender.full_name || sender.email || "Cliente";
    const rows = Array.from(recipientIds).map((rid) => ({
      user_id: rid,
      title: `Mensagem de ${senderName}: ${data.subject}`,
      description: data.body,
      type: "message",
      link: "/dashboard",
      entity_type: "client_message",
      entity_id: sender.client_id ?? null,
    }));

    const { error: insertErr } = await supabaseAdmin
      .from("notifications")
      .insert(rows);

    if (insertErr) {
      throw new Error("Falha ao entregar a mensagem: " + insertErr.message);
    }

    return { delivered: rows.length };
  });
