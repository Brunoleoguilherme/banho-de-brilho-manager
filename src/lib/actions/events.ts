"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { eventSchema } from "@/lib/validations";
import { logActivity, emptyToNull, type ActionResult } from "./helpers";

interface ScheduleRow {
  service_type: string;
  service_date: string;
  start_time: string | null;
  end_time: string | null;
}

/** Lista as datas entre início e fim (inclusive), limitado a 60 dias */
function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const d = new Date(start + "T12:00:00");
  const last = new Date((end || start) + "T12:00:00");
  let guard = 0;
  while (d <= last && guard < 60) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return dates;
}

/**
 * Expande o cronograma de cada tipo de serviço em uma linha por dia
 * (com horário próprio) e calcula o período geral do evento.
 */
function buildEventRecord(data: {
  service_type: string;
  schedules?: Record<
    string,
    {
      start_date?: string;
      end_date?: string;
      extra_dates?: string[];
      days?: Record<string, { start_time?: string; end_time?: string }>;
    }
  >;
  [key: string]: unknown;
}) {
  const { schedules, ...rest } = data;
  const selected = data.service_type.split(",").map((s) => s.trim()).filter(Boolean);

  const rows: ScheduleRow[] = [];
  for (const t of selected) {
    const s = schedules?.[t];
    if (!s) continue;
    // Período sequencial + dias avulsos, sem duplicar
    const range = s.start_date
      ? dateRange(s.start_date, s.end_date || s.start_date)
      : [];
    const extras = (s.extra_dates ?? []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    const allDates = Array.from(new Set([...range, ...extras])).sort();
    for (const date of allDates) {
      const day = s.days?.[date];
      rows.push({
        service_type: t,
        service_date: date,
        start_time: day?.start_time || null,
        end_time: day?.end_time || null,
      });
    }
  }

  const dates = rows.map((r) => r.service_date).sort();
  const timeRow =
    rows.find((r) => r.service_type === "limpeza_realizacao" && r.start_time) ||
    rows.find((r) => r.start_time);

  const record = {
    ...emptyToNull(rest),
    start_date: dates[0] ?? null,
    end_date: dates.length ? dates[dates.length - 1] : null,
    event_start_time: timeRow?.start_time ?? null,
    event_end_time: timeRow?.end_time ?? null,
  };

  return { record, rows };
}

async function saveSchedules(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  rows: ScheduleRow[]
) {
  await supabase.from("event_schedules").delete().eq("event_id", eventId);
  if (rows.length > 0) {
    await supabase
      .from("event_schedules")
      .insert(rows.map((r) => ({ ...r, event_id: eventId })));
  }
}

export async function createEventAction(input: unknown): Promise<ActionResult> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { record, rows } = buildEventRecord(parsed.data);

  const { data, error } = await supabase
    .from("events")
    .insert(record)
    .select("id, name")
    .single();

  if (error) return { ok: false, error: "Erro ao salvar evento. " + error.message };

  await saveSchedules(supabase, data.id, rows);

  await logActivity({
    entity_type: "event",
    entity_id: data.id,
    action: "created",
    description: `Evento "${data.name}" cadastrado`,
  });

  revalidatePath("/eventos");
  revalidatePath("/calendario");
  return { ok: true, id: data.id };
}

/** Adiciona um item à lista de responsabilidades clicáveis */
export async function addResponsibilityItemAction(
  label: string
): Promise<ActionResult> {
  const trimmed = label.trim();
  if (trimmed.length < 3)
    return { ok: false, error: "Descreva o item (mínimo 3 letras)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("responsibility_items")
    .insert({ label: trimmed });
  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "Este item já existe na lista." };
    return { ok: false, error: "Erro ao salvar item. " + error.message };
  }

  revalidatePath("/eventos");
  return { ok: true };
}

/** Remove um item da lista de responsabilidades clicáveis */
export async function deleteResponsibilityItemAction(
  label: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("responsibility_items")
    .delete()
    .eq("label", label);
  if (error) return { ok: false, error: "Erro ao excluir item. " + error.message };

  revalidatePath("/eventos");
  return { ok: true };
}

/**
 * Exclui um evento — exige a senha de login de quem está solicitando.
 * Eventos com propostas vinculadas não podem ser excluídos.
 */
export async function deleteEventAction(
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

  const { data: event } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", id)
    .single();
  if (!event) return { ok: false, error: "Evento não encontrado." };

  const { count: proposalsCount } = await supabase
    .from("proposals")
    .select("*", { count: "exact", head: true })
    .eq("event_id", id);
  if ((proposalsCount ?? 0) > 0)
    return {
      ok: false,
      error: `"${event.name}" tem ${proposalsCount} proposta(s) vinculada(s) e não pode ser excluído — isso apagaria o histórico.`,
    };

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { ok: false, error: "Erro ao excluir. " + error.message };

  await logActivity({
    entity_type: "event",
    entity_id: id,
    action: "deleted",
    description: `Evento "${event.name}" EXCLUÍDO por ${user.email} (senha confirmada)`,
  });

  revalidatePath("/eventos");
  revalidatePath("/calendario");
  return { ok: true };
}

export async function updateEventAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { record, rows } = buildEventRecord(parsed.data);

  const { error } = await supabase.from("events").update(record).eq("id", id);

  if (error) return { ok: false, error: "Erro ao atualizar evento. " + error.message };

  await saveSchedules(supabase, id, rows);

  await logActivity({
    entity_type: "event",
    entity_id: id,
    action: "updated",
    description: `Evento "${parsed.data.name}" atualizado`,
  });

  revalidatePath("/eventos");
  revalidatePath(`/eventos/${id}`);
  revalidatePath("/calendario");
  return { ok: true, id };
}
