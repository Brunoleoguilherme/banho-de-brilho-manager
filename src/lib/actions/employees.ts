"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { employeeSchema } from "@/lib/validations/employee";
import { logActivity, emptyToNull, type ActionResult } from "./helpers";

/**
 * Exclui um colaborador — exige a senha de login de quem solicita.
 * Quem já tem escala/diárias não pode ser excluído (use Inativo).
 */
export async function deleteEmployeeAction(
  id: string,
  password: string
): Promise<ActionResult> {
  if (!password) return { ok: false, error: "Informe sua senha para confirmar." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Sessão expirada. Entre novamente." };

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

  const { data: employee } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("id", id)
    .single();
  if (!employee) return { ok: false, error: "Colaborador não encontrado." };

  const { count: allocCount } = await supabase
    .from("employee_allocations")
    .select("*", { count: "exact", head: true })
    .eq("employee_id", id);
  if ((allocCount ?? 0) > 0)
    return {
      ok: false,
      error: `"${employee.full_name}" tem ${allocCount} escala(s)/diária(s) registrada(s) e não pode ser excluído — mude o status para Inativo para preservar o histórico.`,
    };

  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) return { ok: false, error: "Erro ao excluir. " + error.message };

  await logActivity({
    entity_type: "employee",
    entity_id: id,
    action: "deleted",
    description: `Colaborador "${employee.full_name}" EXCLUÍDO por ${user.email} (senha confirmada)`,
  });

  revalidatePath("/funcionarios");
  return { ok: true };
}

export async function createEmployeeAction(input: unknown): Promise<ActionResult> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .insert(emptyToNull(parsed.data))
    .select("id, full_name")
    .single();

  if (error)
    return { ok: false, error: "Erro ao salvar funcionário. " + error.message };

  await logActivity({
    entity_type: "employee",
    entity_id: data.id,
    action: "created",
    description: `Funcionário "${data.full_name}" cadastrado`,
  });

  revalidatePath("/funcionarios");
  return { ok: true, id: data.id };
}

export async function updateEmployeeAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update(emptyToNull(parsed.data))
    .eq("id", id);

  if (error)
    return { ok: false, error: "Erro ao atualizar funcionário. " + error.message };

  await logActivity({
    entity_type: "employee",
    entity_id: id,
    action: "updated",
    description: `Funcionário "${parsed.data.full_name}" atualizado`,
  });

  revalidatePath("/funcionarios");
  return { ok: true, id };
}
