import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { ResumoMes, type StaffExpense } from "@/components/finance/ResumoMes";
import { getDiariasBase, mesAnoRef } from "@/lib/diarias";
import { MESES } from "@/lib/folha";

export default async function DiariasResumoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const params = await searchParams;
  const { mes, ano, inicio, fim } = mesAnoRef(params);
  const agora = new Date();

  const supabase = await createClient();
  const [{ rows }, { data: staffExpenses }] = await Promise.all([
    getDiariasBase(),
    supabase
      .from("staff_expenses")
      .select("*")
      .gte("expense_date", inicio)
      .lte("expense_date", fim)
      .order("expense_date"),
  ]);

  // Totais por quinzena do mês (DR/VR/VT da escala)
  const quinzenas = rows
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

  return (
    <div>
      <PageHeader
        title="Resumo do mês"
        description="Diárias, VR e VT por quinzena + transporte e refeições avulsos da equipe"
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Mês</label>
          <select name="mes" defaultValue={String(mes)} className="input-base w-auto">
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m.charAt(0) + m.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Ano</label>
          <select name="ano" defaultValue={String(ano)} className="input-base w-auto">
            {Array.from({ length: 7 }, (_, i) => agora.getFullYear() - 5 + i).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-brand-petrol px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
          Ver mês
        </button>
      </form>

      <ResumoMes
        mes={mes}
        ano={ano}
        mesLabel={`${MESES[mes - 1]} DE ${ano}`}
        q={quinzenas}
        expenses={((staffExpenses ?? []) as StaffExpense[]).map((e) => ({
          ...e,
          amount: Number(e.amount) || 0,
        }))}
      />
    </div>
  );
}
