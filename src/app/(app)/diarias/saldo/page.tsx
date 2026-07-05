import { PageHeader } from "@/components/layout/PageHeader";
import {
  ColaboradorSaldoTable,
  type ColaboradorSaldoRow,
} from "@/components/finance/ColaboradorSaldoTable";
import {
  getDiariasBase,
  filterDiarias,
  type DiariaFilters,
} from "@/lib/diarias";

export default async function DiariasSaldoPage({
  searchParams,
}: {
  searchParams: Promise<DiariaFilters>;
}) {
  const filters = await searchParams;
  const { rows: all, employees, orders } = await getDiariasBase();
  const rows = filterDiarias(all, filters);

  // Consolidação por colaborador (como a lateral da planilha DIARIAS)
  const pixById = new Map(
    employees.map((e) => [e.id, (e as { pix_key?: string | null }).pix_key ?? null])
  );
  const byEmp = new Map<string, ColaboradorSaldoRow>();
  for (const r of rows) {
    const e = byEmp.get(r.employee_name) ?? {
      name: r.employee_name,
      employeeId: r.employee_id,
      pix: pixById.get(r.employee_id) ?? null,
      count: 0, dr: 0, vr: 0, vt: 0, adiant: 0, pago: 0, saldo: 0,
      pendingIds: [] as string[],
      lastPaidAt: null as string | null,
    };
    e.count += 1;
    e.dr += r.daily_rate;
    e.vr += r.vr_amount;
    e.vt += r.vt_amount;
    e.adiant += r.advance_amount;
    if (r.status === "pago") {
      e.pago += r.total_amount;
      if (r.paid_at && (!e.lastPaidAt || r.paid_at > e.lastPaidAt))
        e.lastPaidAt = r.paid_at;
    }
    if (["confirmado", "compareceu"].includes(r.status)) {
      e.saldo += r.balance_amount;
      e.pendingIds.push(r.id);
    }
    byEmp.set(r.employee_name, e);
  }
  for (const emp of employees) {
    if (!byEmp.has(emp.full_name)) {
      byEmp.set(emp.full_name, {
        name: emp.full_name,
        employeeId: emp.id,
        pix: pixById.get(emp.id) ?? null,
        count: 0, dr: 0, vr: 0, vt: 0, adiant: 0, pago: 0, saldo: 0,
        pendingIds: [], lastPaidAt: null,
      });
    }
  }
  const summary = Array.from(byEmp.values()).sort(
    (a, b) => b.saldo - a.saldo || a.name.localeCompare(b.name)
  );

  return (
    <div>
      <PageHeader
        title="Saldo por colaborador"
        description="Uma linha por pessoa: diárias, DR/VR/VT, adiantamentos, pagamentos e saldo a receber"
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Evento (OS)</label>
          <select name="os" defaultValue={filters.os ?? ""} className="input-base w-auto">
            <option value="">Todos</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>{o.code}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">De</label>
          <input type="date" name="de" defaultValue={filters.de ?? ""} className="input-base w-auto" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Até</label>
          <input type="date" name="ate" defaultValue={filters.ate ?? ""} className="input-base w-auto" />
        </div>
        <button type="submit" className="rounded-lg bg-brand-petrol px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
          Filtrar
        </button>
      </form>

      <ColaboradorSaldoTable rows={summary} />
    </div>
  );
}
