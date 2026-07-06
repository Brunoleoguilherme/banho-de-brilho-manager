"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Pencil, X } from "lucide-react";
import {
  addAllocationAction,
  updateAllocationStatusAction,
  removeAllocationAction,
} from "@/lib/actions/operations";
import { updateAllocationValuesAction } from "@/lib/actions/finance";
import { formatMoney } from "@/lib/utils";

const ALLOCATION_STATUSES = [
  { value: "convidado", label: "Convidado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "recusou", label: "Recusou" },
  { value: "substituido", label: "Substituído" },
  { value: "compareceu", label: "Compareceu" },
  { value: "faltou", label: "Faltou" },
  { value: "pago", label: "Pago" },
];

export interface EmployeeOption {
  id: string;
  full_name: string;
  main_role: string;
  employee_type?: string;
  daily_rate: number;
  vr_rate: number;
  vt_rate: number;
}

export interface AllocationRow {
  id: string;
  employee_id: string;
  employee_name: string;
  role: string;
  status: string;
  daily_rate: number;
  vr_amount: number;
  vt_amount: number;
  advance_amount: number;
  total_amount: number;
}

interface ShiftAllocationsProps {
  osId: string;
  shiftId: string;
  allocations: AllocationRow[];
  employees: EmployeeOption[];
}

export function ShiftAllocations({
  osId,
  shiftId,
  allocations,
  employees,
}: ShiftAllocationsProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    employee_id: "",
    role: "agente_limpeza",
    daily_rate: 0,
    vr_amount: 0,
    vt_amount: 0,
  });
  // Aba de origem: funcionários registrados × free lancers
  const [tipoAba, setTipoAba] = useState<"funcionario" | "freelancer">(
    "funcionario"
  );
  const opcoesDaAba = employees.filter(
    (e) => (e.employee_type ?? "funcionario") === tipoAba
  );

  function handleEmployeeSelect(id: string) {
    const emp = employees.find((e) => e.id === id);
    setForm({
      employee_id: id,
      role: emp?.main_role ?? "agente_limpeza",
      daily_rate: emp?.daily_rate ?? 0,
      vr_amount: emp?.vr_rate ?? 0,
      vt_amount: emp?.vt_rate ?? 0,
    });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await addAllocationAction({
      operation_order_id: osId,
      operation_shift_id: shiftId,
      ...form,
      daily_rate: Number(form.daily_rate) || 0,
      vr_amount: Number(form.vr_amount) || 0,
      vt_amount: Number(form.vt_amount) || 0,
    });
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setShowForm(false);
    setForm({ employee_id: "", role: "agente_limpeza", daily_rate: 0, vr_amount: 0, vt_amount: 0 });
    setBusy(false);
    router.refresh();
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ daily: 0, vr: 0, vt: 0 });

  function startEdit(a: AllocationRow) {
    setEditingId(a.id);
    setEditForm({ daily: a.daily_rate, vr: a.vr_amount, vt: a.vt_amount });
  }

  async function saveEdit(a: AllocationRow) {
    setBusy(true);
    const result = await updateAllocationValuesAction(a.id, {
      daily_rate: Number(editForm.daily) || 0,
      vr_amount: Number(editForm.vr) || 0,
      vt_amount: Number(editForm.vt) || 0,
      advance_amount: a.advance_amount,
    });
    if (!result.ok) setError(result.error);
    setEditingId(null);
    setBusy(false);
    router.refresh();
  }

  async function handleStatus(allocationId: string, status: string) {
    await updateAllocationStatusAction(allocationId, osId, status);
    router.refresh();
  }

  async function handleRemove(allocationId: string, name: string) {
    if (!confirm(`Remover ${name} da escala deste turno?`)) return;
    await removeAllocationAction(allocationId, osId);
    router.refresh();
  }

  return (
    <div className="mt-2">
      {allocations.length > 0 && (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="pb-1.5">Funcionário</th>
              <th className="pb-1.5 text-right">Diária</th>
              <th className="pb-1.5 text-right">VR</th>
              <th className="pb-1.5 text-right">VT</th>
              <th className="pb-1.5 text-right">Total</th>
              <th className="pb-1.5">Situação</th>
              <th className="pb-1.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {allocations.map((a) =>
              editingId === a.id ? (
                <tr key={a.id} className="bg-teal-50/50">
                  <td className="py-2 font-medium text-ink">{a.employee_name}</td>
                  {(["daily", "vr", "vt"] as const).map((key) => (
                    <td key={key} className="py-2 pl-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-20 rounded border border-gray-300 px-1.5 py-1 text-right text-xs"
                        value={editForm[key]}
                        onChange={(e) =>
                          setEditForm({ ...editForm, [key]: Number(e.target.value) })
                        }
                      />
                    </td>
                  ))}
                  <td className="py-2 text-right font-medium text-ink">
                    {formatMoney(
                      (Number(editForm.daily) || 0) +
                        (Number(editForm.vr) || 0) +
                        (Number(editForm.vt) || 0)
                    )}
                  </td>
                  <td className="py-2 pl-3" colSpan={2}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => saveEdit(a)}
                        disabled={busy}
                        className="rounded bg-brand-petrol px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded p-1 text-gray-400 hover:text-danger"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={a.id}>
                  <td className="py-2 font-medium text-ink">{a.employee_name}</td>
                  <td className="py-2 text-right text-ink-muted">
                    {formatMoney(a.daily_rate)}
                  </td>
                  <td className="py-2 text-right text-ink-muted">
                    {formatMoney(a.vr_amount)}
                  </td>
                  <td className="py-2 text-right text-ink-muted">
                    {formatMoney(a.vt_amount)}
                  </td>
                  <td className="py-2 text-right font-medium text-ink">
                    {formatMoney(a.total_amount)}
                  </td>
                  <td className="py-2 pl-3">
                    <select
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                      value={a.status}
                      onChange={(e) => handleStatus(a.id, e.target.value)}
                    >
                      {ALLOCATION_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      {a.status !== "pago" && (
                        <button
                          onClick={() => startEdit(a)}
                          className="rounded p-1 text-gray-400 hover:text-brand-petrol"
                          title="Editar diária, VR e VT"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(a.id, a.employee_name)}
                        className="rounded p-1 text-gray-400 hover:text-danger"
                        title="Remover da escala"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {showForm ? (
        <form
          onSubmit={handleAdd}
          className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-surface/60 p-3"
        >
          <div className="min-w-48 flex-1">
            <div className="mb-1.5 flex gap-1">
              {(
                [
                  ["funcionario", "Funcionários"],
                  ["freelancer", "Free lancers"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setTipoAba(value);
                    setForm({ ...form, employee_id: "" });
                  }}
                  className={
                    tipoAba === value
                      ? "rounded-full bg-brand-petrol px-3 py-1 text-xs font-semibold text-white"
                      : "rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-ink-muted hover:bg-gray-50"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <select
              required
              className="input-base"
              value={form.employee_id}
              onChange={(e) => handleEmployeeSelect(e.target.value)}
            >
              <option value="">
                {opcoesDaAba.length === 0
                  ? tipoAba === "freelancer"
                    ? "Nenhum free lancer ativo cadastrado"
                    : "Nenhum funcionário ativo cadastrado"
                  : "Selecione..."}
              </option>
              {opcoesDaAba.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Diária (R$)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input-base w-24"
              value={form.daily_rate}
              onChange={(e) =>
                setForm({ ...form, daily_rate: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              VR (R$)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input-base w-20"
              value={form.vr_amount}
              onChange={(e) =>
                setForm({ ...form, vr_amount: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              VT (R$)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input-base w-20"
              value={form.vt_amount}
              onChange={(e) =>
                setForm({ ...form, vt_amount: Number(e.target.value) })
              }
            />
          </div>
          <div className="flex gap-1.5">
            <button
              type="submit"
              disabled={busy || !form.employee_id}
              className="flex items-center gap-1 rounded-lg bg-brand-petrol px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Adicionar
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-3 py-2 text-xs text-ink-muted hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-brand-petrol hover:bg-brand-petrol/5"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar funcionário ao turno
        </button>
      )}
    </div>
  );
}