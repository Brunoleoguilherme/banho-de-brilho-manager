"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Search, Pencil } from "lucide-react";
import {
  createPayableAction,
  updatePayableAction,
  updatePayableStatusAction,
  deletePayableAction,
  payPayableAction,
} from "@/lib/actions/finance";
import { PAYABLE_CATEGORIES } from "@/lib/constants";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { useSortable } from "@/lib/useSortable";
import { formatMoney, formatDate, cn } from "@/lib/utils";

export interface PayableRow {
  id: string;
  category: string;
  description: string;
  amount: number; // total (original + juros)
  interest_amount: number;
  due_date: string | null;
  paid_at: string | null;
  status: string;
  competence_month: number | null;
  competence_year: number | null;
  payment_method?: string;
}

const STATUS_STYLE: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800",
  pago: "bg-green-100 text-green-800",
  atrasado: "bg-red-100 text-red-700",
  cancelado: "bg-gray-200 text-gray-600",
};
const STATUS_LABEL: Record<string, string> = {
  pendente: "A vencer",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

export function PayablesTable({ rows }: { rows: PayableRow[] }) {
  const router = useRouter();
  const now = new Date();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: "Outros",
    description: "",
    amount: "",
    interest_amount: "",
    due_date: "",
    competence_month: String(now.getMonth() + 1),
    competence_year: String(now.getFullYear()),
    payment_method: "",
  });

  // ---- Filtros ----
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const availableYears = Array.from(
    new Set(rows.map((r) => r.competence_year).filter(Boolean))
  ).sort() as number[];
  const availableCategories = Array.from(
    new Set(rows.map((r) => r.category))
  ).sort();

  const filtered = rows.filter((r) => {
    if (statusFilter === "a_pagar" && !["pendente", "atrasado"].includes(r.status))
      return false;
    if (statusFilter === "a_vencer" && r.status !== "pendente") return false;
    if (statusFilter === "pago" && r.status !== "pago") return false;
    if (statusFilter === "atrasado" && r.status !== "atrasado") return false;
    if (categoryFilter && r.category !== categoryFilter) return false;
    if (monthFilter && String(r.competence_month) !== monthFilter) return false;
    if (yearFilter && String(r.competence_year) !== yearFilter) return false;
    if (
      search &&
      !`${r.description} ${r.category}`.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const { sorted, sortKey, sortDir, toggle } = useSortable(
    filtered,
    {
      category: (r) => r.category,
      competence: (r) =>
        r.competence_year != null && r.competence_month != null
          ? r.competence_year * 100 + r.competence_month
          : null,
      due_date: (r) => r.due_date,
      original: (r) => r.amount - r.interest_amount,
      interest: (r) => r.interest_amount,
      total: (r) => r.amount,
      paid_at: (r) => r.paid_at,
      status: (r) => r.status,
    },
    { key: "due_date", dir: "desc" }
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      ...form,
      amount: Number(form.amount),
      interest_amount: Number(form.interest_amount) || 0,
    };
    const result = editingId
      ? await updatePayableAction(editingId, payload)
      : await createPayableAction(payload);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ ...form, description: "", amount: "", interest_amount: "", due_date: "" });
    setBusy(false);
    router.refresh();
  }

  function startEdit(row: PayableRow) {
    setError(null);
    setEditingId(row.id);
    setForm({
      category: row.category,
      description: row.description,
      amount: (row.amount - row.interest_amount).toFixed(2),
      interest_amount: row.interest_amount ? row.interest_amount.toFixed(2) : "",
      due_date: row.due_date ?? "",
      competence_month: String(row.competence_month ?? now.getMonth() + 1),
      competence_year: String(row.competence_year ?? now.getFullYear()),
      payment_method: row.payment_method ?? "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleStatus(id: string, status: string) {
    await updatePayableStatusAction(
      id,
      status as "pendente" | "pago" | "atrasado" | "cancelado"
    );
    router.refresh();
  }

  async function handlePay(row: PayableRow) {
    const original = row.amount - row.interest_amount;
    const answer = prompt(
      `Pagar "${row.description}"\nValor original: ${formatMoney(original)}\n\nQual foi o VALOR PAGO (R$)?\n· Pagou a mais → a diferença vira juros/encargos\n· Pagou a menos → o restante continua em aberto`,
      original.toFixed(2).replace(".", ",")
    );
    if (answer === null) return;
    const raw = answer.trim().replace(/[R$\s]/g, "");
    const normalized = raw.includes(",")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw;
    const paid = Number(normalized) || 0;
    if (paid <= 0) return;

    // Data do pagamento (permite lançar conta paga em data passada)
    const hojeISO = new Date().toISOString().slice(0, 10);
    const [ay, am, ad] = hojeISO.split("-");
    const dateAns = prompt(
      "Data do pagamento (dia/mês/ano):",
      `${ad}/${am}/${ay}`
    );
    if (dateAns === null) return;
    let paidDate = hojeISO;
    const md = dateAns.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (md) {
      paidDate = `${md[3]}-${md[2].padStart(2, "0")}-${md[1].padStart(2, "0")}`;
    }

    const result = await payPayableAction(row.id, paid, paidDate);
    if (!result.ok) {
      setError(result.error);
    } else if (result.partial) {
      alert(
        `Pagamento parcial registrado. O saldo restante de ${formatMoney(original - paid)} continua em aberto como novo lançamento.`
      );
    } else if (result.interest && result.interest > 0) {
      alert(`Pago com ${formatMoney(result.interest)} de juros/encargos.`);
    }
    router.refresh();
  }

  async function handleDelete(id: string, description: string) {
    if (!confirm(`Excluir "${description}"?`)) return;
    await deletePayableAction(id);
    router.refresh();
  }

  const totalPendente = filtered
    .filter((r) => ["pendente", "atrasado"].includes(r.status))
    .reduce((acc, r) => acc + r.amount, 0);
  const totalPago = filtered
    .filter((r) => r.status === "pago")
    .reduce((acc, r) => acc + r.amount, 0);

  const STATUS_TABS = [
    { value: "", label: "Todos" },
    { value: "a_pagar", label: "A pagar" },
    { value: "a_vencer", label: "A vencer" },
    { value: "atrasado", label: "Atrasados" },
    { value: "pago", label: "Pagos" },
  ];

  return (
    <div>
      <div className="mb-4 space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatusFilter(t.value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition",
                statusFilter === t.value
                  ? "bg-brand-petrol text-white"
                  : "bg-surface text-ink-muted hover:bg-gray-200"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="input-base pl-9"
              placeholder="Buscar por descrição ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-base w-auto"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="input-base w-auto"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            <option value="">Todos os meses</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][i]}
              </option>
            ))}
          </select>
          <select
            className="input-base w-auto"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="">Todos os anos</option>
            {availableYears.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
          {(statusFilter || categoryFilter || monthFilter || yearFilter || search) && (
            <button
              onClick={() => {
                setStatusFilter(""); setCategoryFilter(""); setMonthFilter("");
                setYearFilter(""); setSearch("");
              }}
              className="text-xs font-medium text-brand-petrol hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-ink-muted">
            A pagar:{" "}
            <strong className="text-warning">{formatMoney(totalPendente)}</strong>
          </span>
          <span className="text-ink-muted">
            Pago:{" "}
            <strong className="text-ink">{formatMoney(totalPago)}</strong>
          </span>
          <span className="text-xs text-ink-muted">
            {filtered.length} de {rows.length} lançamento(s)
          </span>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton
            filename={`contas-a-pagar-${new Date().toISOString().slice(0, 10)}`}
            headers={["Categoria", "Descrição", "Competência", "Vencimento", "Valor original", "Juros e encargos", "Total", "Pago em", "Status"]}
            rows={sorted.map((r) => [
              r.category,
              r.description,
              r.competence_month
                ? `${String(r.competence_month).padStart(2, "0")}/${r.competence_year}`
                : "",
              formatDate(r.due_date),
              (r.amount - r.interest_amount).toFixed(2).replace(".", ","),
              r.interest_amount.toFixed(2).replace(".", ","),
              r.amount.toFixed(2).replace(".", ","),
              formatDate(r.paid_at),
              STATUS_LABEL[r.status] ?? r.status,
            ])}
          />
          <button
            onClick={() => {
              setEditingId(null);
              setError(null);
              setShowForm((v) => !v);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-brand-petrol px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Nova despesa
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-3"
        >
          <p className="text-sm font-semibold text-ink sm:col-span-2 lg:col-span-3">
            {editingId ? "Editar despesa" : "Nova despesa"}
          </p>
          {error && (
            <p className="text-sm text-danger sm:col-span-2 lg:col-span-3">{error}</p>
          )}
          <select
            className="input-base"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {PAYABLE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            required
            className="input-base"
            placeholder="Descrição *"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            required
            type="number"
            min={0.01}
            step="0.01"
            className="input-base"
            placeholder="Valor original (R$) *"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <input
            type="number"
            min={0}
            step="0.01"
            className="input-base"
            placeholder="Juros de mora e encargos (R$)"
            value={form.interest_amount}
            onChange={(e) => setForm({ ...form, interest_amount: e.target.value })}
          />
          <div className="flex gap-2">
            <select
              className="input-base"
              value={form.competence_month}
              onChange={(e) => setForm({ ...form, competence_month: e.target.value })}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {String(i + 1).padStart(2, "0")}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={2020}
              max={2100}
              className="input-base"
              value={form.competence_year}
              onChange={(e) => setForm({ ...form, competence_year: e.target.value })}
            />
          </div>
          <input
            required
            type="date"
            className="input-base"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
          <input
            className="input-base"
            placeholder="Forma de pagamento"
            value={form.payment_method}
            onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
          />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-brand-petrol px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Salvar alterações" : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="rounded-lg px-4 py-2 text-sm text-ink-muted hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <SortableHeader label="Categoria / Descrição" columnKey="category" activeKey={sortKey} dir={sortDir} onSort={toggle} />
              <SortableHeader label="Competência" columnKey="competence" activeKey={sortKey} dir={sortDir} onSort={toggle} />
              <SortableHeader label="Vencimento" columnKey="due_date" activeKey={sortKey} dir={sortDir} onSort={toggle} />
              <SortableHeader label="Valor original" columnKey="original" activeKey={sortKey} dir={sortDir} onSort={toggle} align="right" />
              <SortableHeader label="Juros" columnKey="interest" activeKey={sortKey} dir={sortDir} onSort={toggle} align="right" />
              <SortableHeader label="Total" columnKey="total" activeKey={sortKey} dir={sortDir} onSort={toggle} align="right" />
              <SortableHeader label="Pago em" columnKey="paid_at" activeKey={sortKey} dir={sortDir} onSort={toggle} />
              <SortableHeader label="Status" columnKey="status" activeKey={sortKey} dir={sortDir} onSort={toggle} />
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-ink-muted">
                  Nenhum lançamento encontrado com esses filtros.
                </td>
              </tr>
            )}
            {sorted.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{r.category}</p>
                  <p className="text-xs text-ink-muted">{r.description}</p>
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {r.competence_month
                    ? `${String(r.competence_month).padStart(2, "0")}/${r.competence_year}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-ink-muted">{formatDate(r.due_date)}</td>
                <td className="px-4 py-3 text-right text-ink-muted">
                  {formatMoney(r.amount - r.interest_amount)}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.interest_amount > 0 ? (
                    <span className="text-danger">
                      {formatMoney(r.interest_amount)}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium text-ink">
                  {formatMoney(r.amount)}
                </td>
                <td className="px-4 py-3 text-ink-muted">{formatDate(r.paid_at)}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                      STATUS_STYLE[r.status]
                    )}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {["pendente", "atrasado"].includes(r.status) && (
                      <button
                        onClick={() => handlePay(r)}
                        className="rounded-lg bg-success/10 px-2.5 py-1.5 text-xs font-semibold text-success hover:bg-success/20"
                      >
                        Pagar
                      </button>
                    )}
                    {r.status === "pago" && (
                      <button
                        onClick={() => handleStatus(r.id, "pendente")}
                        className="rounded-lg px-2.5 py-1.5 text-xs text-ink-muted hover:bg-gray-100"
                      >
                        Desfazer
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(r)}
                      className="rounded p-1.5 text-gray-400 hover:text-brand-petrol"
                      title="Editar lançamento"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id, r.description)}
                      className="rounded p-1.5 text-gray-400 hover:text-danger"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
