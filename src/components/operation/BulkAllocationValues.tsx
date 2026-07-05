"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Loader2 } from "lucide-react";
import { applyValuesToAllAllocationsAction } from "@/lib/actions/operations";

export function BulkAllocationValues({ osId }: { osId: string }) {
  const router = useRouter();
  const [daily, setDaily] = useState("");
  const [vr, setVr] = useState("");
  const [vt, setVt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    const filled = [daily, vr, vt].filter((v) => v !== "").length;
    if (filled === 0) return;
    if (
      !confirm(
        "Aplicar estes valores a TODOS os funcionários escalados nesta OS?\n(Quem já está marcado como pago não é alterado. Campos vazios mantêm o valor atual.)"
      )
    )
      return;

    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await applyValuesToAllAllocationsAction(osId, {
      daily: daily === "" ? null : Number(daily),
      vr: vr === "" ? null : Number(vr),
      vt: vt === "" ? null : Number(vt),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(`Valores aplicados a ${result.updated} escalado(s)!`);
    setDaily("");
    setVr("");
    setVt("");
    router.refresh();
  }

  return (
    <div className="mb-5 rounded-lg bg-surface p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Aplicar valores a todos os escalados (varia por evento)
      </p>
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}
      {message && <p className="mb-2 text-xs font-medium text-success">{message}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">
            Diária (R$)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input-base w-28"
            placeholder="manter"
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
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
            className="input-base w-28"
            placeholder="manter"
            value={vr}
            onChange={(e) => setVr(e.target.value)}
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
            className="input-base w-28"
            placeholder="manter"
            value={vt}
            onChange={(e) => setVt(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={handleApply}
          disabled={busy || (daily === "" && vr === "" && vt === "")}
          className="flex items-center gap-2 rounded-lg bg-brand-petrol px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          Aplicar a todos
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        Campo vazio mantém o valor atual · funcionários já pagos não são alterados
      </p>
    </div>
  );
}
