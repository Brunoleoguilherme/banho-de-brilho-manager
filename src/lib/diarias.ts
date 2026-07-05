import { createClient } from "@/lib/supabase/server";
import type { DiariaRow } from "@/components/finance/DiariasTable";

/** Linha de diária com campos extras usados nos filtros/consolidações */
export type DiariaFull = DiariaRow & {
  employee_id: string;
  os_id: string;
  paid_at: string | null;
};

export interface DiariaFilters {
  funcionario?: string;
  os?: string;
  status?: string;
  de?: string;
  ate?: string;
}

/** Carrega todas as diárias (allocations) + funcionários + OS */
export async function getDiariasBase() {
  const supabase = await createClient();
  const [{ data: allocations }, { data: employees }, { data: orders }] =
    await Promise.all([
      supabase
        .from("employee_allocations")
        .select(
          "*, employees(full_name), operation_shifts(service_date, phase), operation_orders(code, events(name))"
        )
        .order("created_at", { ascending: false }),
      supabase.from("employees").select("id, full_name").order("full_name"),
      supabase.from("operation_orders").select("id, code").order("code"),
    ]);

  const rows: DiariaFull[] = (allocations ?? []).map((a) => {
    const shift = a.operation_shifts as {
      service_date: string;
      phase: string;
    } | null;
    const os = a.operation_orders as {
      code: string;
      events: { name: string } | null;
    } | null;
    return {
      id: a.id,
      employee_id: a.employee_id as string,
      os_id: a.operation_order_id as string,
      employee_name:
        (a.employees as { full_name: string } | null)?.full_name ?? "—",
      os_code: os?.code ?? "—",
      event_name: os?.events?.name ?? "—",
      service_date: shift?.service_date ?? "",
      phase: shift?.phase ?? "",
      status: a.status,
      daily_rate: Number(a.daily_rate) || 0,
      vr_amount: Number(a.vr_amount) || 0,
      vt_amount: Number(a.vt_amount) || 0,
      advance_amount: Number(a.advance_amount) || 0,
      balance_amount: Number(a.balance_amount) || 0,
      total_amount: Number(a.total_amount) || 0,
      paid: !!a.paid,
      paid_at: (a.paid_at as string | null) ?? null,
    };
  });

  rows.sort((a, b) => (a.service_date < b.service_date ? 1 : -1));
  return { rows, employees: employees ?? [], orders: orders ?? [] };
}

/** Aplica os filtros da tela (funcionário, OS, situação, período) */
export function filterDiarias(
  rows: DiariaFull[],
  filters: DiariaFilters
): DiariaFull[] {
  return rows.filter((r) => {
    if (filters.funcionario && r.employee_id !== filters.funcionario)
      return false;
    if (filters.os && r.os_id !== filters.os) return false;
    if (filters.status === "pendente" && r.status === "pago") return false;
    if (filters.status === "pago" && r.status !== "pago") return false;
    if (filters.de && r.service_date && r.service_date < filters.de)
      return false;
    if (filters.ate && r.service_date && r.service_date > filters.ate)
      return false;
    return true;
  });
}

/** Totais de DR/VR/VT por quinzena dentro de um período (mês) */
export function quinzenasDoMes(
  rows: DiariaFull[],
  inicio: string,
  fim: string
) {
  return rows
    .filter(
      (r) =>
        r.service_date >= inicio &&
        r.service_date <= fim &&
        ["confirmado", "compareceu", "pago"].includes(r.status)
    )
    .reduce(
      (acc, r) => {
        const primeira = Number(r.service_date.slice(8, 10)) <= 15;
        if (primeira) {
          acc.dr1 += r.daily_rate;
          acc.vr1 += r.vr_amount;
          acc.vt1 += r.vt_amount;
        } else {
          acc.dr2 += r.daily_rate;
          acc.vr2 += r.vr_amount;
          acc.vt2 += r.vt_amount;
        }
        return acc;
      },
      { dr1: 0, dr2: 0, vr1: 0, vr2: 0, vt1: 0, vt2: 0 }
    );
}

/** Mês/ano de referência a partir dos searchParams (padrão: mês atual) */
export function mesAnoRef(params: { mes?: string; ano?: string }) {
  const agora = new Date();
  const mes =
    Number(params.mes) >= 1 && Number(params.mes) <= 12
      ? Number(params.mes)
      : agora.getMonth() + 1;
  const ano =
    Number(params.ano) >= 2020 && Number(params.ano) <= 2100
      ? Number(params.ano)
      : agora.getFullYear();
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const fim = `${ano}-${String(mes).padStart(2, "0")}-${String(
    new Date(ano, mes, 0).getDate()
  ).padStart(2, "0")}`;
  return { mes, ano, inicio, fim };
}
