"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { updateOperationInfoAction } from "@/lib/actions/operations";

interface OperationInfoFormProps {
  osId: string;
  profiles: { id: string; full_name: string }[];
  defaults: {
    operational_owner_id: string | null;
    materials_notes: string | null;
    transport_notes: string | null;
    food_notes: string | null;
    uniforms_notes: string | null;
    notes: string | null;
  };
}

export function OperationInfoForm({
  osId,
  profiles,
  defaults,
}: OperationInfoFormProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    operational_owner_id: defaults.operational_owner_id ?? "",
    materials_notes: defaults.materials_notes ?? "",
    transport_notes: defaults.transport_notes ?? "",
    food_notes: defaults.food_notes ?? "",
    uniforms_notes: defaults.uniforms_notes ?? "",
    notes: defaults.notes ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    await updateOperationInfoAction(osId, form);
    setBusy(false);
    setSaved(true);
    router.refresh();
  }

  const field = (
    label: string,
    key: keyof typeof form,
    placeholder: string
  ) => (
    <div>
      <label className="label-base">{label}</label>
      <textarea
        rows={2}
        className="input-base"
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-100 bg-white p-6 shadow-card"
    >
      <h2 className="mb-4 text-base font-semibold text-ink">
        Planejamento operacional
      </h2>

      <div className="space-y-4">
        <div>
          <label className="label-base">Responsável operacional</label>
          <select
            className="input-base"
            value={form.operational_owner_id}
            onChange={(e) =>
              setForm({ ...form, operational_owner_id: e.target.value })
            }
          >
            <option value="">Não definido</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
        {field("Materiais necessários", "materials_notes", "Ex.: 20 lixeiras, material de limpeza para 3 dias, descartáveis de banheiro")}
        {field("Transporte", "transport_notes", "Ex.: Van saindo da sede às 5h30, motorista João")}
        {field("Alimentação", "food_notes", "Ex.: Marmitex no local, VR para dias de montagem")}
        {field("Uniformes", "uniforms_notes", "Ex.: Uniforme completo + crachá, conferir tamanhos")}
        {field("Observações gerais", "notes", "")}
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-success">Salvo!</span>}
        <button
          type="submit"
          disabled={busy}
          className="flex items-center gap-2 rounded-lg bg-brand-petrol px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar planejamento
        </button>
      </div>
    </form>
  );
}
