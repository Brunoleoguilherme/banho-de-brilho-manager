"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { formatMoney } from "@/lib/utils";

/** Calculadora de horas — igual ao quadro "CÁLCULO HORAS" da planilha */
export function HoursCalculator() {
  const [valorHora, setValorHora] = useState("12");
  const [horas, setHoras] = useState("");

  const total = (Number(valorHora) || 0) * (Number(horas) || 0);

  return (
    <div className="rounded-xl border border-gray-100 bg-brand-dark p-4 text-white shadow-card">
      <div className="mb-2 flex items-center gap-2">
        <Calculator className="h-4 w-4 text-brand-teal" />
        <p className="text-sm font-semibold">Cálculo de horas</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-0.5 block text-[10px] uppercase tracking-wide text-gray-300">
            Valor hora
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full rounded-lg border-0 bg-white/10 px-2 py-1.5 text-sm font-semibold text-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal"
            value={valorHora}
            onChange={(e) => setValorHora(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] uppercase tracking-wide text-gray-300">
            Horas
          </label>
          <input
            type="number"
            min={0}
            step="0.5"
            className="w-full rounded-lg border-0 bg-white/10 px-2 py-1.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
      <div className="mt-2 flex items-baseline justify-between border-t border-white/10 pt-2">
        <p className="text-[10px] uppercase tracking-wide text-gray-300">Total</p>
        <p className="truncate text-xl font-bold text-brand-gold">
          {formatMoney(total)}
        </p>
      </div>
    </div>
  );
}
