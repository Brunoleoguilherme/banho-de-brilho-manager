import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { DiariasTable } from "@/components/finance/DiariasTable";
import {
  getDiariasBase,
  filterDiarias,
  type DiariaFilters,
} from "@/lib/diarias";

export default async function DiariasLancamentosPage({
  searchParams,
}: {
  searchParams: Promise<DiariaFilters>;
}) {
  const filters = await searchParams;
  const { rows: all, employees, orders } = await getDiariasBase();
  const rows = filterDiarias(all, filters);

  return (
    <div>
      <PageHeader
        title="Diárias — lançamentos"
        description="Todas as diárias agrupadas por funcionário: datas, locais, DR/VR/VT e pagamentos"
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Funcionário</label>
          <select name="funcionario" defaultValue={filters.funcionario ?? ""} className="input-base w-auto">
            <option value="">Todos</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name}</option>
            ))}
          </select>
        </div>
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
          <label className="mb-1 block text-xs font-medium text-ink-muted">Situação</label>
          <select name="status" defaultValue={filters.status ?? ""} className="input-base w-auto">
            <option value="">Todas</option>
            <option value="pendente">A pagar</option>
            <option value="pago">Pagas</option>
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

      {rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma diária encontrada"
          description="As diárias aparecem aqui quando você escala funcionários nos turnos das OS (Operação)."
        />
      ) : (
        <DiariasTable rows={rows} />
      )}
    </div>
  );
}
