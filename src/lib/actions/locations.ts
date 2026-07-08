"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { locationSchema, type LocationInput } from "@/lib/validations";
import { logActivity, emptyToNull, type ActionResult } from "./helpers";

const INT_FIELDS = [
  "fem_cb", "fem_ph", "fem_pt", "fem_sb",
  "masc_cb", "masc_ph", "masc_pt", "masc_sb",
  "pne_cb", "pne_ph", "pne_pt", "pne_sb",
] as const;

/** Monta o registro: textos viram null quando vazios; contagens viram 0 */
function buildRecord(data: LocationInput) {
  const d = data as Record<string, unknown>;
  const ints: Record<string, number> = {};
  for (const k of INT_FIELDS) ints[k] = Number(d[k]) || 0;

  const text = emptyToNull({
    name: data.name,
    address: data.address ?? "",
    address_number: data.address_number ?? "",
    address_complement: data.address_complement ?? "",
    neighborhood: data.neighborhood ?? "",
    city: data.city ?? "",
    state: data.state ?? "",
    zip_code: data.zip_code ?? "",
    contact_name: data.contact_name ?? "",
    contact_phone: data.contact_phone ?? "",
    contact_email: data.contact_email ?? "",
    soap_type: data.soap_type ?? "",
    paper_towel_type: data.paper_towel_type ?? "",
    toilet_paper_type: data.toilet_paper_type ?? "",
    trash_bag: data.trash_bag ?? "",
    notes: data.notes ?? "",
  });

  return { ...text, ...ints };
}

/** Verifica a senha de login do usuário atual (exclusões protegidas) */
async function verifyPassword(password: string): Promise<string | null> {
  if (!password) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const verifier = createSupabaseJs(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error } = await verifier.auth.signInWithPassword({
    email: user.email,
    password,
  });
  return error ? null : user.email;
}

export async function createLocationAction(
  input: unknown
): Promise<ActionResult> {
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("event_locations")
    .insert({ ...buildRecord(parsed.data), created_by: user?.id })
    .select("id, name")
    .single();

  if (error)
    return { ok: false, error: "Erro ao salvar local. " + error.message };

  await logActivity({
    entity_type: "event_location",
    entity_id: data.id,
    action: "created",
    description: `Local "${data.name}" cadastrado`,
  });

  revalidatePath("/locais");
  return { ok: true, id: data.id };
}

export async function updateLocationAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_locations")
    .update({ ...buildRecord(parsed.data), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error)
    return { ok: false, error: "Erro ao atualizar local. " + error.message };

  await logActivity({
    entity_type: "event_location",
    entity_id: id,
    action: "updated",
    description: `Local "${parsed.data.name}" atualizado`,
  });

  revalidatePath("/locais");
  revalidatePath(`/locais/${id}/editar`);
  return { ok: true, id };
}

export async function deleteLocationAction(
  id: string,
  password: string
): Promise<ActionResult> {
  const email = await verifyPassword(password);
  if (!email)
    return { ok: false, error: "Senha incorreta. Exclusão não autorizada." };

  const supabase = await createClient();
  const { data: loc } = await supabase
    .from("event_locations")
    .select("id, name")
    .eq("id", id)
    .single();
  if (!loc) return { ok: false, error: "Local não encontrado." };

  // Desvincula dos eventos que apontam para este local (não apaga os eventos)
  await supabase
    .from("events")
    .update({ location_id: null })
    .eq("location_id", id);

  const { error } = await supabase
    .from("event_locations")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: "Erro ao excluir. " + error.message };

  await logActivity({
    entity_type: "event_location",
    entity_id: id,
    action: "deleted",
    description: `Local "${loc.name}" EXCLUÍDO por ${email} (senha confirmada)`,
  });

  revalidatePath("/locais");
  revalidatePath("/eventos");
  return { ok: true };
}
