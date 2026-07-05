"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "./helpers";

export async function createCalendarTaskAction(input: {
  title: string;
  task_date: string;
  task_time?: string;
  notes?: string;
}): Promise<ActionResult> {
  if (!input.title?.trim()) return { ok: false, error: "Descreva a tarefa." };
  if (!input.task_date) return { ok: false, error: "Informe a data." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("calendar_tasks").insert({
    title: input.title.trim(),
    task_date: input.task_date,
    task_time: input.task_time || null,
    notes: input.notes?.trim() || null,
    created_by: user?.id ?? null,
  });
  if (error) return { ok: false, error: "Erro ao salvar tarefa. " + error.message };

  revalidatePath("/calendario");
  return { ok: true };
}

export async function toggleCalendarTaskAction(
  id: string,
  done: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_tasks")
    .update({ done })
    .eq("id", id);
  if (error) return { ok: false, error: "Erro ao atualizar tarefa." };

  revalidatePath("/calendario");
  return { ok: true };
}

export async function deleteCalendarTaskAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_tasks").delete().eq("id", id);
  if (error) return { ok: false, error: "Erro ao excluir tarefa." };

  revalidatePath("/calendario");
  return { ok: true };
}
