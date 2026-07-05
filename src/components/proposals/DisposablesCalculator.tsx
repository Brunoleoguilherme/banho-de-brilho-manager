"use client";

import { useState } from "react";
import { ShowerHead, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { formatMoney } from "@/lib/utils";

interface DisposablesCalculatorProps {
  defaultPublic?: number | null;
  onAdd: (description: string, total: number) => void;
}

/**
 * Calculadora de material descartável de banheiro
 * (papel higiênico, papel toalha e sabonete líquido).
 * Regra prática: ~1 uso de banheiro por pessoa a cada ~3h de evento.
 */
export function DisposablesCalculator({
  defaultPublic,
  onAdd,
}: DisposablesCalculatorProps) {
  const [open, setOpen] = useState(false);
  const [publico, setPublico] = useState(String(defaultPublic || ""));
  const [horas, setHoras] = useState("3");
  const [margem, setMargem] = useState("20");
  const [precoRolao, setPrecoRolao] = useState("7.50");
  const [precoToalha, setPrecoToalha] = useState("15.00");
  const [precoSabonete, setPrecoSabonete] = useState("35.00");

  const pub = Number(publico) || 0;
  const hrs = Number(horas) || 3;
  const marg = 1 + (Number(margem) || 0) / 100;

  // Fator de uso: até 3h ≈ 1 uso/pessoa; cresce com a duração
  const fator = hrs <= 3 ? 1 : hrs <= 6 ? 1.5 : 2;
  const usos = pub * fator;

  const metrosPapel = usos * 2 * marg;
  const roloes = Math.ceil(metrosPapel / 300);
  const folhasToalha = usos * 0.8 * 2.5 * marg;
  const pacotesToalha = Math.ceil(folhasToalha / 1000);
  const litrosSabonete = usos * 0.8 * 0.0012 * marg;
  const galoes = Math.max(1, Math.ceil(litrosSabonete / 5));

  const custoRoloes = roloes * (Number(precoRolao) || 0);
  const custoToalha = pacotesToalha * (Number(precoToalha) || 0);
  const custoSabonete = galoes * (Number(precoSabonete) || 0);
  const total = Math.round((custoRoloes + custoToalha + custoSabonete) * 100) / 100;

  function handleAdd() {
    const desc = `Material descartável banheiro — ${roloes} rolões PH 300m, ${pacotesToalha} pct papel toalha (1000 fls), ${galoes} galão(ões) sabonete 5L (público ${pub.toLocaleString("pt-BR")}, ${hrs}h, margem ${margem}%)`;
    onAdd(desc, total);
    setOpen(false);
  }

  return (
    <div className="mt-4 rounded-lg border border-dashed border-brand-teal/40 bg-teal-50/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-brand-petrol"
      >
        <span className="flex items-center gap-2">
          <ShowerHead className="h-4 w-4 text-brand-teal" />
          Calculadora de descartáveis de banheiro
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="border-t border-brand-teal/20 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Público
              </label>
              <input type="number" min={0} className="input-base" value={publico}
                onChange={(e) => setPublico(e.target.value)} placeholder="5000" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Duração (h)
              </label>
              <input type="number" min={1} className="input-base" value={horas}
                onChange={(e) => setHoras(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Margem (%)
              </label>
              <input type="number" min={0} className="input-base" value={margem}
                onChange={(e) => setMargem(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                R$ rolão 300m
              </label>
              <input type="number" min={0} step="0.01" className="input-base" value={precoRolao}
                onChange={(e) => setPrecoRolao(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                R$ pct toalha
              </label>
              <input type="number" min={0} step="0.01" className="input-base" value={precoToalha}
                onChange={(e) => setPrecoToalha(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                R$ galão 5L
              </label>
              <input type="number" min={0} step="0.01" className="input-base" value={precoSabonete}
                onChange={(e) => setPrecoSabonete(e.target.value)} />
            </div>
          </div>

          {pub > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-3">
              <div className="text-sm text-ink">
                <p>
                  <strong>{roloes}</strong> rolões de papel higiênico ({formatMoney(custoRoloes)}) ·{" "}
                  <strong>{pacotesToalha}</strong> pacotes de toalha ({formatMoney(custoToalha)}) ·{" "}
                  <strong>{galoes}</strong> galão(ões) de sabonete ({formatMoney(custoSabonete)})
                </p>
                <p className="mt-1 text-lg font-bold text-brand-petrol">
                  Total: {formatMoney(total)}
                  <span className="ml-2 text-xs font-normal text-ink-muted">
                    ({formatMoney(total / pub)} por pessoa)
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                className="flex items-center gap-1.5 rounded-lg bg-brand-petrol px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                <Plus className="h-4 w-4" />
                Adicionar à precificação
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
