"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity, type ActionResult } from "./helpers";

const ALLOWED_KEYS = ["custo_fixo_pct", "encargos_pct", "diversos_pct"];

export async function updateCostSettingsAction(
  values: Record<string, number>
): Promise<ActionResult> {
  const supabase = await createClient();

  for (const [key, raw] of Object.entries(values)) {
    if (!ALLOWED_KEYS.includes(key))
      return { ok: false, error: `Parâmetro desconhecido: ${key}` };
    const value = Number(raw);
    if (!isFinite(value) || value < 0 || value > 100)
      return { ok: false, error: "Os percentuais devem estar entre 0 e 100." };

    const { error } = await supabase
      .from("app_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) return { ok: false, error: "Erro ao salvar. " + error.message };
  }

  await logActivity({
    entity_type: "settings",
    entity_id: null,
    action: "updated",
    description: `Parâmetros do Custo do Evento atualizados: ${Object.entries(values)
      .map(([k, v]) => `${k}=${v}%`)
      .join(", ")}`,
  });

  revalidatePath("/financeiro/custo-evento");
  return { ok: true };
}
