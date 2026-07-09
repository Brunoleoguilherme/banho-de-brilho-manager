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
  color: string | null;
  plate: string | null;
  driver_name: string | null;
  driver_document: string | null;
}

/** Veículo do pré-cadastro (frota) para escolher rapidamente */
export interface VehiclePick {
  id: string;
  model: string;
  color: string | null;
  plate: string | null;
}

const emptyForm = {
  model: "",
  color: "",
  plate: "",
  driver_name: "",
  driver_document: "",
  vehicle_id: "",
};

export function OsVehicles({
  osId,
  vehicles,
  registry = [],
}: {
  osId: string;
  vehicles: OsVehicle[];
  registry?: VehiclePick[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  function startEdit(v: OsVehicle) {
    setEditingId(v.id);
    setForm({
      model: v.model,
      color: v.color ?? "",
      plate: v.plate ?? "",
      driver_name: v.driver_name ?? "",
      driver_document: v.driver_document ?? "",
      vehicle_id: "",
    });
    setShowForm(true);
    setError(null);
  }

  function pickRegistry(id: string) {
    const veh = registry.find((r) => r.id === id);
    if (!veh) {
      setForm({ ...form, vehicle_id: "" });
      return;
    }
    setForm({
      ...form,
      vehicle_id: veh.id,
      model: veh.model,
      color: veh.color ?? "",
      plate: veh.plate ?? "",
    });
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
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm((v) => !v);
          }}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-petrol hover:bg-brand-petrol/5"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>

      {error && <p className="mb-2 text-xs text-danger">{error}</p>}

      {vehicles.length === 0 && !showForm && (
        <p className="text-sm text-ink-muted">
          Nenhum veículo nesta OS. Eles entram na Relação de Veículos (para o
          produtor do evento).
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
                {v.color && (
                  <span className="ml-2 text-xs font-normal text-ink-muted">
                    {v.color}
                  </span>
                )}
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
          {!editingId && registry.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Escolher veículo cadastrado
              </label>
              <select
                className="input-base"
                value={form.vehicle_id}
                onChange={(e) => pickRegistry(e.target.value)}
              >
                <option value="">— Digitar manualmente —</option>
                {registry.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.model}
                    {r.color ? ` · ${r.color}` : ""}
                    {r.plate ? ` · ${r.plate}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          <input
            required
            className="input-base"
            placeholder="Modelo / descrição (ex.: Fiat Doblô Adventure) *"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
          />
          <div className="flex gap-2">
            <input
              className="input-base"
              placeholder="Cor (ex.: Vermelho)"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
            <input
              className="input-base"
              placeholder="Placa (ex.: PWO-9E43)"
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <input
              className="input-base"
              placeholder="Motorista (opcional)"
              value={form.driver_name}
              onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
            />
            <input
              className="input-base"
              placeholder="Doc. do motorista (opcional)"
              value={form.driver_document}
              onChange={(e) =>
                setForm({ ...form, driver_document: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(emptyForm);
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
