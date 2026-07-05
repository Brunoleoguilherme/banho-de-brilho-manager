"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { logActivity, type ActionResult } from "./helpers";

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

/**
 * Exclui uma OS inteira (turnos, escala e checklist) — exige senha de login.
 * Bloqueia se houver diária já paga, para não apagar histórico financeiro.
 */
export async function deleteOperationOrderAction(
  id: string,
  password: string
): Promise<ActionResult> {
  const email = await verifyPassword(password);
  if (!email)
    return { ok: false, error: "Senha incorreta. Exclusão não autorizada." };

  const supabase = await createClient();
  const { data: os } = await supabase
    .from("operation_orders")
    .select("id, code")
    .eq("id", id)
    .single();
  if (!os) return { ok: false, error: "OS não encontrada." };

  const { count: pagas } = await supabase
    .from("employee_allocations")
    .select("*", { count: "exact", head: true })
    .eq("operation_order_id", id)
    .eq("status", "pago");
  if ((pagas ?? 0) > 0)
    return {
      ok: false,
      error: `${os.code} tem ${pagas} diária(s) já paga(s) e não pode ser excluída — isso apagaria o histórico financeiro.`,
    };

  // Apaga os filhos antes da OS (escala, turnos e checklist)
  await supabase.from("employee_allocations").delete().eq("operation_order_id", id);
  await supabase.from("operation_shifts").delete().eq("operation_order_id", id);
  await supabase.from("operation_checklist_items").delete().eq("operation_order_id", id);

  const { error } = await supabase.from("operation_orders").delete().eq("id", id);
  if (error) return { ok: false, error: "Erro ao excluir. " + error.message };

  await logActivity({
    entity_type: "operation_order",
    entity_id: id,
    action: "deleted",
    description: `OS ${os.code} EXCLUÍDA por ${email} (senha confirmada)`,
  });
  revalidatePath("/operacao");
  revalidatePath("/diarias/lancamentos");
  return { ok: true };
}

const OS_STATUSES = [
  "criada",
  "em_planejamento",
  "equipe_pendente",
  "materiais_pendentes",
  "transporte_pendente",
  "confirmada",
  "em_execucao",
  "finalizada",
  "em_conferencia",
  "encerrada",
] as const;

export async function updateOperationStatusAction(
  id: string,
  status: string
): Promise<ActionResult> {
  if (!OS_STATUSES.includes(status as (typeof OS_STATUSES)[number]))
    return { ok: false, error: "Status inválido." };

  const supabase = await createClient();
  const { data: os } = await supabase
    .from("operation_orders")
    .select("id, code")
    .eq("id", id)
    .single();
  if (!os) return { ok: false, error: "OS não encontrada." };

  const { error } = await supabase
    .from("operation_orders")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: "Erro ao atualizar status." };

  await logActivity({
    entity_type: "operation_order",
    entity_id: id,
    action: "status_changed",
    description: `${os.code}: status alterado para "${status.replace(/_/g, " ")}"`,
  });

  revalidatePath("/operacao");
  revalidatePath(`/operacao/${id}`);
  return { ok: true, id };
}

export async function updateOperationInfoAction(
  id: string,
  info: {
    operational_owner_id?: string;
    materials_notes?: string;
    transport_notes?: string;
    food_notes?: string;
    uniforms_notes?: string;
    notes?: string;
  }
): Promise<ActionResult> {
  const supabase = await createClient();

  const update: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(info)) {
    update[key] = value === "" || value === undefined ? null : value;
  }

  const { error } = await supabase
    .from("operation_orders")
    .update(update)
    .eq("id", id);
  if (error) return { ok: false, error: "Erro ao salvar informações." };

  revalidatePath(`/operacao/${id}`);
  return { ok: true, id };
}

export async function toggleChecklistItemAction(
  itemId: string,
  osId: string,
  done: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("operation_checklist_items")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", itemId);
  if (error) return { ok: false, error: "Erro ao atualizar checklist." };

  revalidatePath(`/operacao/${osId}`);
  return { ok: true };
}

export async function addChecklistItemAction(
  osId: string,
  label: string
): Promise<ActionResult> {
  if (!label.trim()) return { ok: false, error: "Descreva o item." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("operation_checklist_items")
    .select("*", { count: "exact", head: true })
    .eq("operation_order_id", osId);

  const { error } = await supabase.from("operation_checklist_items").insert({
    operation_order_id: osId,
    label: label.trim(),
    sort_order: (count ?? 0) + 1,
  });
  if (error) return { ok: false, error: "Erro ao adicionar item." };

  revalidatePath(`/operacao/${osId}`);
  return { ok: true };
}

export async function addAllocationAction(input: {
  operation_order_id: string;
  operation_shift_id: string;
  employee_id: string;
  role: string;
  daily_rate: number;
  vr_amount: number;
  vt_amount: number;
}): Promise<ActionResult> {
  const supabase = await createClient();

  if (!input.employee_id)
    return { ok: false, error: "Selecione o funcionário." };

  // Evita escalar o mesmo funcionário duas vezes no mesmo turno
  const { data: existing } = await supabase
    .from("employee_allocations")
    .select("id")
    .eq("operation_shift_id", input.operation_shift_id)
    .eq("employee_id", input.employee_id)
    .maybeSingle();
  if (existing)
    return { ok: false, error: "Este funcionário já está escalado neste turno." };

  const daily = Number(input.daily_rate) || 0;
  const vr = Number(input.vr_amount) || 0;
  const vt = Number(input.vt_amount) || 0;
  const total = Math.round((daily + vr + vt) * 100) / 100;

  const { data: employee } = await supabase
    .from("employees")
    .select("full_name")
    .eq("id", input.employee_id)
    .single();

  const { error } = await supabase.from("employee_allocations").insert({
    operation_order_id: input.operation_order_id,
    operation_shift_id: input.operation_shift_id,
    employee_id: input.employee_id,
    role: input.role,
    status: "convidado",
    daily_rate: daily,
    vr_amount: vr,
    vt_amount: vt,
    advance_amount: 0,
    balance_amount: total,
    total_amount: total,
  });
  if (error) return { ok: false, error: "Erro ao escalar. " + error.message };

  await logActivity({
    entity_type: "operation_order",
    entity_id: input.operation_order_id,
    action: "allocation_added",
    description: `${employee?.full_name ?? "Funcionário"} escalado (convidado)`,
  });

  revalidatePath(`/operacao/${input.operation_order_id}`);
  return { ok: true };
}

/**
 * Aplica diária, VR e/ou VT a todos os escalados da OS (exceto já pagos),
 * recalculando total e saldo. Campo null = mantém o valor atual.
 */
export async function applyValuesToAllAllocationsAction(
  osId: string,
  values: { daily?: number | null; vr?: number | null; vt?: number | null }
): Promise<ActionResult & { updated?: number }> {
  const newDaily = values.daily != null ? Math.max(0, Number(values.daily)) : null;
  const newVr = values.vr != null ? Math.max(0, Number(values.vr)) : null;
  const newVt = values.vt != null ? Math.max(0, Number(values.vt)) : null;

  if (newDaily === null && newVr === null && newVt === null)
    return { ok: false, error: "Preencha pelo menos um valor para aplicar." };

  const supabase = await createClient();
  const { data: allocations } = await supabase
    .from("employee_allocations")
    .select("id, daily_rate, vr_amount, vt_amount, advance_amount, status")
    .eq("operation_order_id", osId)
    .neq("status", "pago");

  if (!allocations || allocations.length === 0)
    return { ok: false, error: "Nenhum escalado para atualizar (pagos não são alterados)." };

  for (const a of allocations) {
    const daily = newDaily ?? (Number(a.daily_rate) || 0);
    const vr = newVr ?? (Number(a.vr_amount) || 0);
    const vt = newVt ?? (Number(a.vt_amount) || 0);
    const advance = Number(a.advance_amount) || 0;
    const total = Math.round((daily + vr + vt) * 100) / 100;
    await supabase
      .from("employee_allocations")
      .update({
        daily_rate: daily,
        vr_amount: vr,
        vt_amount: vt,
        total_amount: total,
        balance_amount: Math.round((total - advance) * 100) / 100,
      })
      .eq("id", a.id);
  }

  const parts = [
    newDaily !== null ? `diária R$ ${newDaily.toFixed(2)}` : null,
    newVr !== null ? `VR R$ ${newVr.toFixed(2)}` : null,
    newVt !== null ? `VT R$ ${newVt.toFixed(2)}` : null,
  ].filter(Boolean);

  await logActivity({
    entity_type: "operation_order",
    entity_id: osId,
    action: "values_bulk_updated",
    description: `${parts.join(", ")} aplicado(s) a ${allocations.length} escalado(s) da OS`,
  });

  revalidatePath(`/operacao/${osId}`);
  revalidatePath("/diarias");
  return { ok: true, updated: allocations.length };
}

export async function updateAllocationStatusAction(
  allocationId: string,
  osId: string,
  status: string
): Promise<ActionResult> {
  const valid = [
    "convidado",
    "confirmado",
    "recusou",
    "substituido",
    "compareceu",
    "faltou",
    "pago",
  ];
  if (!valid.includes(status)) return { ok: false, error: "Status inválido." };

  const supabase = await createClient();
  const update: Record<string, unknown> = { status };
  if (status === "pago") {
    update.paid = true;
    update.paid_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("employee_allocations")
    .update(update)
    .eq("id", allocationId);
  if (error) return { ok: false, error: "Erro ao atualizar escala." };

  revalidatePath(`/operacao/${osId}`);
  return { ok: true };
}

/** Cadastra um veículo utilizado na OS */
export async function addOsVehicleAction(input: {
  operation_order_id: string;
  model: string;
  plate?: string;
  driver_name?: string;
  driver_document?: string;
}): Promise<ActionResult> {
  if (!input.model?.trim())
    return { ok: false, error: "Informe o veículo (modelo)." };

  const supabase = await createClient();
  const { error } = await supabase.from("os_vehicles").insert({
    operation_order_id: input.operation_order_id,
    model: input.model.trim(),
    plate: input.plate?.trim().toUpperCase() || null,
    driver_name: input.driver_name?.trim() || null,
    driver_document: input.driver_document?.trim() || null,
  });
  if (error) return { ok: false, error: "Erro ao salvar veículo. " + error.message };

  await logActivity({
    entity_type: "operation_order",
    entity_id: input.operation_order_id,
    action: "vehicle_added",
    description: `Veículo "${input.model.trim()}${input.plate ? ` (${input.plate.trim().toUpperCase()})` : ""}" incluído na OS`,
  });

  revalidatePath(`/operacao/${input.operation_order_id}`);
  return { ok: true };
}

/** Edita um veículo da OS */
export async function updateOsVehicleAction(
  vehicleId: string,
  osId: string,
  input: {
    model: string;
    plate?: string;
    driver_name?: string;
    driver_document?: string;
  }
): Promise<ActionResult> {
  if (!input.model?.trim())
    return { ok: false, error: "Informe o veículo (modelo)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("os_vehicles")
    .update({
      model: input.model.trim(),
      plate: input.plate?.trim().toUpperCase() || null,
      driver_name: input.driver_name?.trim() || null,
      driver_document: input.driver_document?.trim() || null,
    })
    .eq("id", vehicleId);
  if (error) return { ok: false, error: "Erro ao atualizar veículo." };

  revalidatePath(`/operacao/${osId}`);
  return { ok: true };
}

/** Remove um veículo da OS */
export async function deleteOsVehicleAction(
  vehicleId: string,
  osId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("os_vehicles").delete().eq("id", vehicleId);
  if (error) return { ok: false, error: "Erro ao remover veículo." };

  revalidatePath(`/operacao/${osId}`);
  return { ok: true };
}

export async function removeAllocationAction(
  allocationId: string,
  osId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("employee_allocations")
    .delete()
    .eq("id", allocationId);
  if (error) return { ok: false, error: "Erro ao remover da escala." };

  revalidatePath(`/operacao/${osId}`);
  return { ok: true };
}
