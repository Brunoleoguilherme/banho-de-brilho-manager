"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { saveNfBillingAction } from "@/lib/actions/finance";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Lança/corrige manualmente o faturamento NF de um mês (histórico) */
export function BillingHistoryForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const agora = new Date();
  const [form, setForm] = useState({
    ano: String(agora.getFullYear()),
    mes: String(agora.getMonth() + 1),
    valor: "",
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function handleSave() {
    setMsg(null);
    startTransition(async () => {
      const result = await saveNfBillingAction(
        Number(form.ano),
        Number(form.mes),
        Number(form.valor)
      );
      if (result.ok) {
        setMsg({ ok: true, text: "Salvo! O mês passa a usar este valor." });
        setForm({ ...form, valor: "" });
        router.refresh();
      } else {
        setMsg({ ok: false, text: result.error ?? "Erro ao salvar." });
      }
    });
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-card">
      <p className="mb-1 text-sm font-semibold text-ink">
        Corrigir faturamento de um mês
      </p>
      <p className="mb-3 text-[11px] text-ink-muted">
        Para meses antigos que não estão no sistema (ex.: 2025). O valor manual
        substitui o calculado.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-0.5 block text-[11px] font-medium text-ink-muted">Mês</label>
          <select
            className="input-base w-auto"
            value={form.mes}
            onChange={(e) => setForm({ ...form, mes: e.target.value })}
          >
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-0.5 block text-[11px] font-medium text-ink-muted">Ano</label>
          <select
            className="input-base w-auto"
            value={form.ano}
            onChange={(e) => setForm({ ...form, ano: e.target.value })}
          >
            {Array.from({ length: 8 }, (_, i) => agora.getFullYear() - 6 + i).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-0.5 block text-[11px] font-medium text-ink-muted">
            Faturamento NF (R$)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="0,00"
            className="input-base w-36"
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={isPending || form.valor === ""}
          className="flex items-center gap-1.5 rounded-lg bg-brand-petrol px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Salvar
        </button>
      </div>
      {msg && (
        <p className={`mt-2 text-xs ${msg.ok ? "text-success" : "text-danger"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
