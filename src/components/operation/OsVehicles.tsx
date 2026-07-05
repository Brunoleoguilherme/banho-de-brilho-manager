"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Plus, Trash2, Loader2, Pencil } from "lucide-react";
import {
  addOsVehicleAction,
  updateOsVehicleAction,
  deleteOsVehicleAction,
} from "@/lib/actions/operations";

export interface OsVehicle {
  id: string;
  model: string;
  plate: string | null;
  driver_name: string | null;
  driver_document: string | null;
}

export function OsVehicles({
  osId,
  vehicles,
}: {
  osId: string;
  vehicles: OsVehicle[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emptyForm = { model: "", plate: "", driver_name: "", driver_document: "" };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  function startEdit(v: OsVehicle) {
    setEditingId(v.id);
    setForm({
      model: v.model,
      plate: v.plate ?? "",
      driver_name: v.driver_name ?? "",
      driver_document: v.driver_document ?? "",
    });
    setShowForm(true);
    setError(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = editingId
      ? await updateOsVehicleAction(editingId, osId, form)
      : await addOsVehicleAction({ operation_order_id: osId, ...form });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(v: OsVehicle) {
    if (!confirm(`Remover o veículo "${v.model}"?`)) return;
    await deleteOsVehicleAction(v.id, osId);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-brand-teal" />
          <h2 className="text-base font-semibold text-ink">Veículos</h2>
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-ink-muted">
            {vehicles.length}
          </span>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-petrol hover:bg-brand-petrol/5"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>

      {error && <p className="mb-2 text-xs text-danger">{error}</p>}

      {vehicles.length === 0 && !showForm && (
        <p className="text-sm text-ink-muted">
          Nenhum veículo cadastrado. Eles entram na Lista de Colaboradores e
          Veículos (para a portaria).
        </p>
      )}

      <ul className="space-y-2">
        {vehicles.map((v) => (
          <li
            key={v.id}
            className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
          >
            <div className="text-sm">
              <p className="font-medium text-ink">
                {v.model}
                {v.plate && (
                  <span className="ml-2 rounded bg-surface px-1.5 py-0.5 text-xs font-semibold text-brand-petrol">
                    {v.plate}
                  </span>
                )}
              </p>
              {(v.driver_name || v.driver_document) && (
                <p className="text-xs text-ink-muted">
                  Motorista: {v.driver_name ?? "—"}
                  {v.driver_document && ` · Doc: ${v.driver_document}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => startEdit(v)}
                className="rounded p-1 text-gray-400 hover:text-brand-petrol"
                title="Editar veículo"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(v)}
                className="rounded p-1 text-gray-400 hover:text-danger"
                title="Remover veículo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {showForm && (
        <form onSubmit={handleAdd} className="mt-3 space-y-2 rounded-lg bg-surface p-3">
          <input
            required
            className="input-base"
            placeholder="Veículo (ex.: Fiat Doblò branca) *"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
          />
          <div className="flex gap-2">
            <input
              className="input-base"
              placeholder="Placa (ex.: ABC-1D23)"
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: e.target.value })}
            />
            <input
              className="input-base"
              placeholder="Motorista"
              value={form.driver_name}
              onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
            />
          </div>
          <input
            className="input-base"
            placeholder="Documento do motorista (CPF ou RG)"
            value={form.driver_document}
            onChange={(e) => setForm({ ...form, driver_document: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm({ model: "", plate: "", driver_name: "" });
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || !form.model.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-brand-petrol px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3 w-3 animate-spin" />}
              {editingId ? "Salvar alterações" : "Salvar veículo"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
