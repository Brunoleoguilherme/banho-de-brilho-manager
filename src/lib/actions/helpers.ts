import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

/** Converte strings vazias ("") vindas dos formulários em null antes de salvar. */
export function emptyToNull<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key] = typeof value === "string" && value.trim() === "" ? null : value;
  }
  return out;
}

export async function logActivity(params: {
  entity_type: string;
  entity_id?: string | null;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("activity_logs").insert({
      entity_type: params.entity_type,
      entity_id: params.entity_id ?? null,
      action: params.action,
      description: params.description,
      user_id: user?.id ?? null,
      metadata: params.metadata ?? null,
    });
  } catch {
    // log não deve quebrar a operação principal
  }
}
