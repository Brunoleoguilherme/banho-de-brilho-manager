"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { vehicleSchema, type VehicleInput } from "@/lib/validations";
import {
  createVehicleAction,
  updateVehicleAction,
} from "@/lib/actions/vehicles";
import { FormSection } from "@/components/ui/FormSection";
import { Field, FormError, SubmitButton } from "@/components/forms/fields";

export interface VehicleRow {
  id: string;
  model: string;
  color: string | null;
  plate: string | null;
  notes: string | null;
  active: boolean;
}

export function VehicleForm({ vehicle }: { vehicle?: VehicleRow }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleInput>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: vehicle
      ? {
          model: vehicle.model,
          color: vehicle.color ?? "",
          plate: vehicle.plate ?? "",
          notes: vehicle.notes ?? "",
          active: vehicle.active,
        }
      : { active: true },
  });

  async function onSubmit(values: VehicleInput) {
    setLoading(true);
    setServerError(null);
    const result = vehicle
      ? await updateVehicleAction(vehicle.id, values)
      : await createVehicleAction(values);
    if (!result.ok) {
      setServerError(result.error);
      setLoading(false);
      return;
    }
    router.push("/veiculos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormError message={serverError} />

      <FormSection title="Veículo" description="Dados que entram na Relação de Veículos da OS">
        <Field label="Modelo / descrição" required className="md:col-span-2" error={errors.model?.message}>
          <input className="input-base" placeholder="Ex.: Fiat Doblô Adventure" {...register("model")} />
        </Field>
        <Field label="Cor" error={errors.color?.message}>
          <input className="input-base" placeholder="Ex.: Vermelho" {...register("color")} />
        </Field>
        <Field label="Placa" error={errors.plate?.message}>
          <input className="input-base" placeholder="Ex.: PWO-9E43" {...register("plate")} />
        </Field>
        <Field label="Observações" className="md:col-span-2">
          <input className="input-base" placeholder="Opcional" {...register("notes")} />
        </Field>
        <Field label="Ativo (aparece para escolher na OS)">
          <label className="flex items-center gap-2 py-2 text-sm text-ink">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal" {...register("active")} />
            Disponível para uso
          </label>
        </Field>
      </FormSection>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/veiculos")}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-gray-50"
        >
          Cancelar
        </button>
        <SubmitButton loading={loading}>
          {vehicle ? "Salvar alterações" : "Cadastrar veículo"}
        </SubmitButton>
      </div>
    </form>
  );
}
