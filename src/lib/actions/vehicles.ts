"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { vehicleSchema, type VehicleInput } from "@/lib/validations";
import { logActivity, emptyToNull, type ActionResult } from "./helpers";

function buildRecord(data: VehicleInput) {
  const text = emptyToNull({
    model: data.model,
    color: data.color ?? "",
    plate: data.plate?.toUpperCase() ?? "",
    notes: data.notes ?? "",
  });
  return { ...text, active: data.active ?? true };
}

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

export async function createVehicleAction(
  input: unknown
): Promise<ActionResult> {
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("vehicles")
    .insert({ ...buildRecord(parsed.data), created_by: user?.id })
    .select("id, model")
    .single();

  if (error)
    return { ok: false, error: "Erro ao salvar veículo. " + error.message };

  await logActivity({
    entity_type: "vehicle",
    entity_id: data.id,
    action: "created",
    description: `Veículo "${data.model}" cadastrado`,
  });

  revalidatePath("/veiculos");
  return { ok: true, id: data.id };
}

export async function updateVehicleAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicles")
    .update({ ...buildRecord(parsed.data), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error)
    return { ok: false, error: "Erro ao atualizar veículo. " + error.message };

  await logActivity({
    entity_type: "vehicle",
    entity_id: id,
    action: "updated",
    description: `Veículo "${parsed.data.model}" atualizado`,
  });

  revalidatePath("/veiculos");
  revalidatePath(`/veiculos/${id}/editar`);
  return { ok: true, id };
}

export async function deleteVehicleAction(
  id: string,
  password: string
): Promise<ActionResult> {
  const email = await verifyPassword(password);
  if (!email)
    return { ok: false, error: "Senha incorreta. Exclusão não autorizada." };

  const supabase = await createClient();
  const { data: v } = await supabase
    .from("vehicles")
    .select("id, model")
    .eq("id", id)
    .single();
  if (!v) return { ok: false, error: "Veículo não encontrado." };

  // Desvincula das OS que apontam para este veículo (não apaga os veículos da OS)
  await supabase
    .from("os_vehicles")
    .update({ vehicle_id: null })
    .eq("vehicle_id", id);

  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) return { ok: false, error: "Erro ao excluir. " + error.message };

  await logActivity({
    entity_type: "vehicle",
    entity_id: id,
    action: "deleted",
    description: `Veículo "${v.model}" EXCLUÍDO por ${email} (senha confirmada)`,
  });

  revalidatePath("/veiculos");
  return { ok: true };
}
