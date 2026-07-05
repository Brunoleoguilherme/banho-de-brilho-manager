"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { clientSchema, contactSchema } from "@/lib/validations";
import { logActivity, emptyToNull, type ActionResult } from "./helpers";

export async function createClientAction(input: unknown): Promise<ActionResult> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert(emptyToNull(parsed.data))
    .select("id, name")
    .single();

  if (error) return { ok: false, error: "Erro ao salvar cliente. " + error.message };

  await logActivity({
    entity_type: "client",
    entity_id: data.id,
    action: "created",
    description: `Cliente "${data.name}" cadastrado`,
  });

  revalidatePath("/clientes");
  return { ok: true, id: data.id };
}

export async function updateClientAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update(emptyToNull(parsed.data))
    .eq("id", id);

  if (error) return { ok: false, error: "Erro ao atualizar cliente. " + error.message };

  await logActivity({
    entity_type: "client",
    entity_id: id,
    action: "updated",
    description: `Cliente "${parsed.data.name}" atualizado`,
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: true, id };
}

export async function createContactAction(input: unknown): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_contacts")
    .insert(emptyToNull(parsed.data))
    .select("id")
    .single();

  if (error) return { ok: false, error: "Erro ao salvar contato. " + error.message };

  await logActivity({
    entity_type: "client_contact",
    entity_id: data.id,
    action: "created",
    description: `Contato "${parsed.data.name}" adicionado ao cliente`,
  });

  revalidatePath(`/clientes/${parsed.data.client_id}`);
  return { ok: true, id: data.id };
}

/**
 * Exclui um cliente — exige a senha de login de quem está solicitando.
 * Clientes com eventos ou propostas não podem ser excluídos (preserva o histórico).
 */
export async function deleteClientAction(
  id: string,
  password: string
): Promise<ActionResult> {
  if (!password) return { ok: false, error: "Informe sua senha para confirmar." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Sessão expirada. Entre novamente." };

  // Confere a senha sem mexer na sessão atual (cliente descartável)
  const verifier = createSupabaseJs(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error: authError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (authError)
    return { ok: false, error: "Senha incorreta. Exclusão não autorizada." };

  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", id)
    .single();
  if (!client) return { ok: false, error: "Cliente não encontrado." };

  // Bloqueia se houver histórico vinculado
  const [{ count: eventsCount }, { count: proposalsCount }] = await Promise.all([
    supabase.from("events").select("*", { count: "exact", head: true }).eq("client_id", id),
    supabase.from("proposals").select("*", { count: "exact", head: true }).eq("client_id", id),
  ]);
  if ((eventsCount ?? 0) > 0 || (proposalsCount ?? 0) > 0)
    return {
      ok: false,
      error: `"${client.name}" tem ${eventsCount ?? 0} evento(s) e ${proposalsCount ?? 0} proposta(s) vinculados e não pode ser excluído — isso apagaria o histórico.`,
    };

  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { ok: false, error: "Erro ao excluir. " + error.message };

  await logActivity({
    entity_type: "client",
    entity_id: id,
    action: "deleted",
    description: `Cliente "${client.name}" EXCLUÍDO por ${user.email} (senha confirmada)`,
  });

  revalidatePath("/clientes");
  return { ok: true };
}

export async function deleteContactAction(
  id: string,
  clientId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("client_contacts").delete().eq("id", id);
  if (error) return { ok: false, error: "Erro ao remover contato." };

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}
