"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, Save, Loader2 } from "lucide-react";
import { updateCostSettingsAction } from "@/lib/actions/settings";

interface CostSettingsBarProps {
  custoFixo: number;
  encargos: number;
  diversos: number;
}

export function CostSettingsBar({
  custoFixo,
  encargos,
  diversos,
}: CostSettingsBarProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    custo_fixo_pct: String(custoFixo),
    encargos_pct: String(encargos),
    diversos_pct: String(diversos),
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed =
    Number(form.custo_fixo_pct) !== custoFixo ||
    Number(form.encargos_pct) !== encargos ||
    Number(form.diversos_pct) !== diversos;

  async function handleSave() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const result = await updateCostSettingsAction({
      custo_fixo_pct: Number(form.custo_fixo_pct),
      encargos_pct: Number(form.encargos_pct),
      diversos_pct: Number(form.diversos_pct),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const fields = [
    { key: "custo_fixo_pct" as const, label: "Custo fixo" },
    { key: "encargos_pct" as const, label: "Encargos" },
    { key: "diversos_pct" as const, label: "Diversos" },
  ];

  return (
    <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-brand-petrol" />
        <h2 className="text-sm font-semibold text-ink">
          Parâmetros da apuração (% sobre o valor do contrato)
        </h2>
      </div>
      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              {f.label} (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              className="input-base w-28 text-lg font-bold text-brand-petrol"
              value={form[f.key]}
              onChange={(e) => {
                setForm({ ...form, [f.key]: e.target.value });
                setSaved(false);
              }}
            />
          </div>
        ))}
        <button
          onClick={handleSave}
          disabled={busy || !changed}
          className="flex items-center gap-2 rounded-lg bg-brand-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar e recalcular
        </button>
        {saved && !changed && (
          <span className="text-sm font-medium text-success">
            Salvo! Tabela recalculada.
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        DR/VR/VT e custo direto não são percentuais — vêm dos itens reais de
        cada proposta.
      </p>
    </div>
  );
}
