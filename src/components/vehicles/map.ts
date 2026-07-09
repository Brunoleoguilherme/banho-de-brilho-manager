import type { VehicleRow } from "@/components/vehicles/VehicleForm";

/** Converte a linha do banco (vehicles) para VehicleRow tipado */
export function toVehicleRow(r: Record<string, unknown>): VehicleRow {
  const s = (v: unknown) => (v == null ? null : String(v));
  return {
    id: String(r.id),
    model: String(r.model),
    color: s(r.color),
    plate: s(r.plate),
    notes: s(r.notes),
    active: r.active !== false,
  };
}
