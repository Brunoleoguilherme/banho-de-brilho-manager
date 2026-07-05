"use client";

import { Fragment, useState } from "react";
import { Search, Archive, ChevronDown, ChevronRight } from "lucide-react";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { formatMoney, formatDate, cn } from "@/lib/utils";

export interface HistoricalRow {
  id: string;
  code: string;
  year: number;
  client_name: string;
  event_name: string | null;
  location: string | null;
  event_date: string | null;
  date_text: string | null;
  total_value: number | null;
  schedule: string | null;
  total_al: number;
  total_co: number;
}

export function HistoricalTable({ rows }: { rows: HistoricalRow[] }) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const years = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => b - a);
  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (year && String(r.year) !== year) return false;
    if (!q) return true;
    return (
      r.code.toLowerCase().includes(q) ||
      r.client_name.toLowerCase().includes(q) ||
      (r.event_name ?? "").toLowerCase().includes(q) ||
      (r.location ?? "").toLowerCase().includes(q)
    );
  });
  const total = filtered.reduce((a, r) => a + (r.total_value ?? 0), 0);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar código, cliente, evento ou local..."
              className="w-64 rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand-teal focus:outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="input-base w-auto"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="">Todos os anos</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span className="text-xs text-ink-muted">
            {filtered.length} proposta(s) ·{" "}
            <strong className="text-ink">{formatMoney(total)}</strong>
          </span>
        </div>
        <ExportCsvButton
          filename={`historico-propostas-${new Date().toISOString().slice(0, 10)}`}
          headers={["Código","Ano","Cliente","Evento","Local","Data","AL","CO","Valor","Cronograma"]}
          rows={filtered.map((r) => [
            r.code, r.year, r.client_name, r.event_name ?? "",
            r.location ?? "",
            r.event_date ? formatDate(r.event_date) : (r.date_text ?? ""),
            r.total_al || "", r.total_co || "",
            r.total_value !== null ? r.total_value.toFixed(2).replace(".", ",") : "",
            (r.schedule ?? "").replace(/\n/g, " | "),
          ])}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <Archive className="h-8 w-8 text-gray-300" />
          <p className="text-sm text-ink-muted">
            Nenhuma proposta no histórico
            {q ? ` para "${query}"` : " — rode a migration 0025 e o SQL de importação no Supabase"}.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="w-8 px-2 py-3" />
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Evento / Local</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-center">Agentes</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((r) => (
                <Fragment key={r.id}>
                <tr
                  className={cn(
                    "cursor-pointer hover:bg-gray-50/60",
                    openId === r.id && "bg-brand-teal/5"
                  )}
                  onClick={() => setOpenId(openId === r.id ? null : r.id)}
                >
                  <td className="px-2 py-2.5 text-gray-400">
                    {openId === r.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-brand-petrol">
                    {r.code}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-ink">
                    {r.client_name}
                  </td>
                  <td className="max-w-[320px] px-4 py-2.5">
                    <p className="truncate text-ink" title={r.event_name ?? ""}>
                      {r.event_name ?? "—"}
                    </p>
                    {r.location && (
                      <p className="truncate text-xs text-ink-muted" title={r.location}>
                        {r.location}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted">
                    {r.event_date
                      ? formatDate(r.event_date)
                      : (r.date_text ?? "—")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-center text-ink-muted">
                    {r.total_al > 0 || r.total_co > 0 ? (
                      <>
                        {r.total_al > 0 && (
                          <span className="font-semibold text-ink">{r.total_al} AL</span>
                        )}
                        {r.total_co > 0 && (
                          <span className="ml-1 text-xs">+ {r.total_co} CO</span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-ink">
                    {r.total_value !== null ? formatMoney(r.total_value) : "—"}
                  </td>
                </tr>
                {openId === r.id && (
                  <tr className="bg-surface/60">
                    <td />
                    <td colSpan={6} className="px-4 py-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Cronograma (dias · horários · agentes)
                      </p>
                      {r.schedule ? (
                        <ul className="space-y-0.5 text-sm text-ink">
                          {r.schedule.split("\n").map((ln, i) => (
                            <li key={i}>{ln}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-ink-muted">
                          Sem cronograma no arquivo original.
                        </p>
                      )}
                      {r.date_text && (
                        <p className="mt-2 text-xs text-ink-muted">
                          Data no documento: {r.date_text}
                        </p>
                      )}
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
