"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity, type ActionResult } from "./helpers";

export type ImportType = "funcionarios" | "clientes" | "despesas";

function parseMoney(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return isFinite(n) ? n : 0;
}

function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  // dd/mm/yyyy ou dd/mm/yy
  const br = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${year}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return null;
}

export async function importRowsAction(
  type: ImportType,
  rows: Record<string, string>[]
): Promise<ActionResult & { inserted?: number; skipped?: string[] }> {
  if (rows.length === 0) return { ok: false, error: "Nenhuma linha para importar." };
  if (rows.length > 2000)
    return { ok: false, error: "Máximo de 2000 linhas por importação." };

  const supabase = await createClient();
  const skipped: string[] = [];
  let records: Record<string, unknown>[] = [];

  if (type === "funcionarios") {
    records = rows
      .filter((r, i) => {
        if (!r.full_name?.trim() || r.full_name.trim().length < 2) {
          skipped.push(`Linha ${i + 1}: sem nome`);
          return false;
        }
        return true;
      })
      .map((r) => ({
        full_name: r.full_name.trim(),
        document: r.document?.trim() || null,
        phone: r.phone?.trim() || null,
        email: r.email?.trim() || null,
        city: r.city?.trim() || null,
        main_role: "agente_limpeza",
        daily_rate: parseMoney(r.daily_rate),
        vr_rate: parseMoney(r.vr_rate),
        vt_rate: parseMoney(r.vt_rate),
        pix_key: r.pix_key?.trim() || null,
        status: "ativo",
        notes: "Importado de planilha",
      }));
  } else if (type === "clientes") {
    records = rows
      .filter((r, i) => {
        if (!r.name?.trim() || r.name.trim().length < 2) {
          skipped.push(`Linha ${i + 1}: sem nome`);
          return false;
        }
        return true;
      })
      .map((r) => ({
        type: "empresa",
        name: r.name.trim(),
        legal_name: r.legal_name?.trim() || null,
        document: r.document?.trim() || null,
        email: r.email?.trim() || null,
        phone: r.phone?.trim() || null,
        city: r.city?.trim() || null,
        state: r.state?.trim()?.toUpperCase()?.slice(0, 2) || null,
        notes: "Importado de planilha",
      }));
  } else if (type === "despesas") {
    records = rows
      .filter((r, i) => {
        if (!r.description?.trim()) {
          skipped.push(`Linha ${i + 1}: sem descrição`);
          return false;
        }
        if (parseMoney(r.amount) <= 0) {
          skipped.push(`Linha ${i + 1}: valor inválido`);
          return false;
        }
        return true;
      })
      .map((r) => {
        const due = parseDate(r.due_date);
        const paid = ["sim", "s", "pago", "ok", "x"].includes(
          (r.paid ?? "").trim().toLowerCase()
        );
        return {
          category: r.category?.trim() || "Outros",
          description: r.description.trim(),
          amount: parseMoney(r.amount),
          due_date: due,
          competence_month: due ? Number(due.slice(5, 7)) : null,
          competence_year: due ? Number(due.slice(0, 4)) : null,
          status: paid ? "pago" : "pendente",
          paid_at: paid ? due : null,
          notes: "Importado de planilha",
        };
      });
  }

  if (records.length === 0)
    return { ok: false, error: "Nenhuma linha válida para importar.", skipped };

  const table =
    type === "funcionarios" ? "employees" : type === "clientes" ? "clients" : "payables";

  let inserted = 0;
  for (let i = 0; i < records.length; i += 100) {
    const chunk = records.slice(i, i + 100);
    const { error, count } = await supabase
      .from(table)
      .insert(chunk, { count: "exact" });
    if (error)
      return {
        ok: false,
        error: `Erro após ${inserted} linhas: ${error.message}`,
        inserted,
        skipped,
      };
    inserted += count ?? chunk.length;
  }

  await logActivity({
    entity_type: "import",
    entity_id: null,
    action: "imported",
    description: `Importação de ${type}: ${inserted} registro(s) criado(s)`,
  });

  revalidatePath("/funcionarios");
  revalidatePath("/clientes");
  revalidatePath("/financeiro/pagar");

  return { ok: true, inserted, skipped };
}
