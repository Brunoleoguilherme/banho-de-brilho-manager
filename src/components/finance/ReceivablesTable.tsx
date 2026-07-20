"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Search, Pencil } from "lucide-react";
import {
  createReceivableAction,
  updateReceivableAction,
  updateReceivableStatusAction,
  deleteReceivableAction,
} from "@/lib/actions/finance";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { useSortable } from "@/lib/useSortable";
import { formatMoney, formatDate, cn } from "@/lib/utils";

export interface ReceivableRow {
  id: string;
  client_id?: string | null;
  client_name: string;
  description: string;
  amount: number;
  due_date: string | null;
  received_at: string | null;
  status: string;
  document_type: string | null;
  payment_method: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800",
  recebido: "bg-green-100 text-green-800",
  atrasado: "bg-red-100 text-red-700",
  cancelado: "bg-gray-200 text-gray-600",
};
const STATUS_LABEL: Record<string, string> = {
  pendente: "A vencer",
  recebido: "Recebido",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

export function ReceivablesTable({
  rows,
  clients,
}: {
  rows: ReceivableRow[];
  clients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_id: "",
    description: "",
    amount: "",
    due_date: "",
    document_type: "nota_fiscal",
    payment_method: "",
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = { ...form, amount: Number(form.amount) };
    const result = editingId
      ? await updateReceivableAction(editingId, payload)
      : await createReceivableAction(payload);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ client_id: "", description: "", amount: "", due_date: "", document_type: "nota_fiscal", payment_method: "" });
    setBusy(false);
    router.refresh();
  }

  function startEdit(row: ReceivableRow) {
    setError(null);
    setEditingId(row.id);
    setForm({
      client_id: row.client_id ?? "",
      description: row.description,
      amount: row.amount.toFixed(2),
      due_date: row.due_date ?? "",
      document_type: row.document_type ?? "nota_fiscal",
      payment_method: row.payment_method ?? "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleStatus(id: string, status: string) {
    await updateReceivableStatusAction(
      id,
      status as "pendente" | "recebido" | "atrasado" | "cancelado"
    );
    router.refresh();
  }

  async function handleDelete(id: string, description: string) {
    if (!confirm(`Excluir "${description}"?`)) return;
    await deleteReceivableAction(id);
    router.refresh();
  }

  // ---- Filtros ----
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const filtered = rows.filter((r) => {
    if (statusFilter === "em_aberto" && !["pendente", "atrasado"].includes(r.status))
      return false;
    if (statusFilter === "a_vencer" && r.status !== "pendente") return false;
    if (statusFilter === "recebido" && r.status !== "recebido") return false;
    if (statusFilter === "atrasado" && r.status !== "atrasado") return false;
    if (
      search &&
      !`${r.client_name} ${r.description}`.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const { sorted, sortKey, sortDir, toggle } = useSortable(
    filtered,
    {
      client: (r) => r.client_name,
      amount: (r) => r.amount,
      due_date: (r) => r.due_date,
      received_at: (r) => r.received_at,
      status: (r) => r.status,
    },
    { key: "due_date", dir: "desc" }
  );

  const totalPendente = filtered
    .filter((r) => ["pendente", "atrasado"].includes(r.status))
    .reduce((acc, r) => acc + r.amount, 0);
  const totalRecebido = filtered
    .filter((r) => r.status === "recebido")
    .reduce((acc, r) => acc + r.amount, 0);

  const STATUS_TABS = [
    { value: "", label: "Todos" },
    { value: "em_aberto", label: "Em aberto" },
    { value: "a_vencer", label: "A vencer" },
    { value: "atrasado", label: "Atrasados" },
    { value: "recebido", label: "Recebidos" },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card">
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
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input-base pl-9"
            placeholder="Buscar por cliente, proposta ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-ink-muted">
            Em aberto:{" "}
            <strong className="text-warning">{formatMoney(totalPendente)}</strong>
          </span>
          <span className="text-ink-muted">
            Recebido:{" "}
            <strong className="text-success">{formatMoney(totalRecebido)}</strong>
          </span>
          <span className="text-xs text-ink-muted">
            {filtered.length} de {rows.length} lançamento(s)
          </span>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton
            filename={`contas-a-receber-${new Date().toISOString().slice(0, 10)}`}
            headers={["Cliente", "Descrição", "Valor", "Vencimento", "Recebido em", "Status", "Tipo"]}
            rows={sorted.map((r) => [
              r.client_name,
              r.description,
              r.amount.toFixed(2).replace(".", ","),
              formatDate(r.due_date),
              formatDate(r.received_at),
              STATUS_LABEL[r.status] ?? r.status,
              r.document_type ?? "",
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
            Nova conta a receber
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-3"
        >
          <p className="text-sm font-semibold text-ink sm:col-span-2 lg:col-span-3">
            {editingId ? "Editar conta a receber" : "Nova conta a receber"}
          </p>
          {error && (
            <p className="text-sm text-danger sm:col-span-2 lg:col-span-3">{error}</p>
          )}
          <select
            className="input-base"
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
          >
            <option value="">Cliente (opcional)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
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
            placeholder="Valor (R$) *"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <input
            required
            type="date"
            className="input-base"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
          <select
            className="input-base"
            value={form.document_type}
            onChange={(e) => setForm({ ...form, document_type: e.target.value })}
          >
            <option value="nota_fiscal">Nota Fiscal</option>
            <option value="recibo">Recibo</option>
            <option value="outro">Outro</option>
          </select>
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
              <SortableHeader label="Cliente / Descrição" columnKey="client" activeKey={sortKey} dir={sortDir} onSort={toggle} />
              <SortableHeader label="Valor" columnKey="amount" activeKey={sortKey} dir={sortDir} onSort={toggle} align="right" />
              <SortableHeader label="Vencimento" columnKey="due_date" activeKey={sortKey} dir={sortDir} onSort={toggle} />
              <SortableHeader label="Recebido em" columnKey="received_at" activeKey={sortKey} dir={sortDir} onSort={toggle} />
              <SortableHeader label="Status" columnKey="status" activeKey={sortKey} dir={sortDir} onSort={toggle} />
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-muted">
                  Nenhum lançamento encontrado com esses filtros.
                </td>
              </tr>
            )}
            {sorted.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{r.client_name}</p>
                  <p className="text-xs text-ink-muted">{r.description}</p>
                </td>
                <td className="px-4 py-3 text-right font-medium text-ink">
                  {formatMoney(r.amount)}
                </td>
                <td className="px-4 py-3 text-ink-muted">{formatDate(r.due_date)}</td>
                <td className="px-4 py-3 text-ink-muted">{formatDate(r.received_at)}</td>
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
                        onClick={() => handleStatus(r.id, "recebido")}
                        className="rounded-lg bg-success/10 px-2.5 py-1.5 text-xs font-semibold text-success hover:bg-success/20"
                      >
                        Receber
                      </button>
                    )}
                    {r.status === "recebido" && (
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
