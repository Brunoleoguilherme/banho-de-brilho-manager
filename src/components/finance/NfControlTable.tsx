"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, Search, Percent } from "lucide-react";
import {
  updateNfControlAction,
  saveIssRatesAction,
} from "@/lib/actions/finance";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { useSortable } from "@/lib/useSortable";
import { formatMoney, formatDate, cn } from "@/lib/utils";

export interface NfRow {
  id: string;
  emission_date: string | null;
  document_type: string;
  invoice_number: string | null;
  proposal_code: string | null;
  received_at: string | null;
  client_name: string;
  description: string;
  amount: number;
  iss_amount: number;
  inss_amount: number;
  received_amount: number | null;
  status: string;
}

const MESES_CURTOS = [
  "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
  "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
];

const liquido = (r: NfRow) => r.amount - r.iss_amount - r.inss_amount;

export function IssRatesCard({
  year,
  rates,
}: {
  year: number;
  rates: number[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState(rates.map((r) => String(r)));
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      const result = await saveIssRatesAction(year, values.map(Number));
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-card">
      <div className="mb-2 flex items-center gap-2">
        <Percent className="h-4 w-4 text-brand-teal" />
        <p className="text-sm font-semibold text-ink">Alíquota ISS {year}</p>
        {saved && <span className="text-xs text-success">Salvo!</span>}
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:grid-cols-12">
        {MESES_CURTOS.map((m, i) => (
          <div key={m}>
            <label className="block text-center text-[10px] font-medium uppercase text-ink-muted">
              {m}
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-full rounded border border-gray-300 px-1 py-1 text-center text-xs focus:border-brand-teal focus:outline-none"
              value={values[i]}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                setValues(next);
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg bg-brand-petrol px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Salvar alíquotas
        </button>
      </div>
    </div>
  );
}

export function NfControlTable({ rows }: { rows: NfRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState("");
  const [editing, setEditing] = useState<NfRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    emission_date: "",
    invoice_number: "",
    document_type: "nota_fiscal",
    iss_amount: "",
    inss_amount: "",
    received_at: "",
    received_amount: "",
  });

  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (tipo && r.document_type !== tipo) return false;
    if (!q) return true;
    return (
      r.client_name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      (r.invoice_number ?? "").toLowerCase().includes(q) ||
      (r.proposal_code ?? "").toLowerCase().includes(q)
    );
  });

  const receivedValue = (r: NfRow) =>
    r.received_amount ?? (r.status === "recebido" ? liquido(r) : 0);

  const { sorted, sortKey, sortDir, toggle } = useSortable(
    filtered,
    {
      emission_date: (r) => r.emission_date,
      document_type: (r) => r.document_type,
      invoice_number: (r) => r.invoice_number,
      proposal_code: (r) => r.proposal_code,
      received_at: (r) => r.received_at,
      client: (r) => r.client_name || r.description,
      amount: (r) => r.amount,
      iss: (r) => r.iss_amount,
      inss: (r) => r.inss_amount,
      liquido: (r) => liquido(r),
      received: (r) => receivedValue(r),
    },
    { key: "emission_date", dir: "desc" }
  );

  const tot = filtered.reduce(
    (acc, r) => ({
      bruto: acc.bruto + r.amount,
      iss: acc.iss + r.iss_amount,
      inss: acc.inss + r.inss_amount,
      liq: acc.liq + liquido(r),
      rec: acc.rec + (r.received_amount ?? (r.status === "recebido" ? liquido(r) : 0)),
    }),
    { bruto: 0, iss: 0, inss: 0, liq: 0, rec: 0 }
  );

  function startEdit(r: NfRow) {
    setError(null);
    setForm({
      emission_date: r.emission_date ?? "",
      invoice_number: r.invoice_number ?? "",
      document_type: r.document_type || "nota_fiscal",
      iss_amount: r.iss_amount ? String(r.iss_amount) : "",
      inss_amount: r.inss_amount ? String(r.inss_amount) : "",
      received_at: r.received_at ?? "",
      received_amount:
        r.received_amount !== null && r.received_amount !== undefined
          ? String(r.received_amount)
          : "",
    });
    setEditing(r);
  }

  function handleSave() {
    if (!editing) return;
    startTransition(async () => {
      const result = await updateNfControlAction(editing.id, {
        emission_date: form.emission_date || null,
        invoice_number: form.invoice_number || null,
        document_type: form.document_type as "nota_fiscal" | "recibo" | "outro",
        iss_amount: Number(form.iss_amount) || 0,
        inss_amount: Number(form.inss_amount) || 0,
        received_at: form.received_at || null,
        received_amount: form.received_amount
          ? Number(form.received_amount)
          : null,
      });
      if (!result.ok) {
        setError(result.error ?? "Erro ao salvar.");
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente, NF ou proposta..."
              className="w-64 rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand-teal focus:outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="input-base w-auto"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            <option value="nota_fiscal">Nota Fiscal</option>
            <option value="recibo">Recibo</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <ExportCsvButton
          filename={`controle-nfs-${new Date().toISOString().slice(0, 10)}`}
          headers={["Data emissão","Tipo","Nº NF","Nº Proposta","Data recebimento","Cliente","Valor bruto","ISS","INSS","Valor líquido","Valor recebido"]}
          rows={sorted.map((r) => [
            r.emission_date ? formatDate(r.emission_date) : "",
            r.document_type === "recibo" ? "Recibo" : "Nota Fiscal",
            r.invoice_number ?? "",
            r.proposal_code ?? "",
            r.received_at ? formatDate(r.received_at) : "",
            r.client_name || r.description,
            r.amount.toFixed(2).replace(".", ","),
            r.iss_amount.toFixed(2).replace(".", ","),
            r.inss_amount.toFixed(2).replace(".", ","),
            liquido(r).toFixed(2).replace(".", ","),
            (r.received_amount ?? (r.status === "recebido" ? liquido(r) : 0))
              .toFixed(2).replace(".", ","),
          ])}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap text-left text-xs">
          <thead className="border-b border-gray-100 bg-gray-50 text-[10px] uppercase tracking-wide text-ink-muted">
            <tr>
              <SortableHeader label="Emissão" columnKey="emission_date" activeKey={sortKey} dir={sortDir} onSort={toggle} className="px-3 py-2.5" />
              <SortableHeader label="Tipo" columnKey="document_type" activeKey={sortKey} dir={sortDir} onSort={toggle} className="px-3 py-2.5" />
              <SortableHeader label="Nº NF" columnKey="invoice_number" activeKey={sortKey} dir={sortDir} onSort={toggle} className="px-3 py-2.5" />
              <SortableHeader label="Proposta" columnKey="proposal_code" activeKey={sortKey} dir={sortDir} onSort={toggle} className="px-3 py-2.5" />
              <SortableHeader label="Recebimento" columnKey="received_at" activeKey={sortKey} dir={sortDir} onSort={toggle} className="px-3 py-2.5" />
              <SortableHeader label="Cliente" columnKey="client" activeKey={sortKey} dir={sortDir} onSort={toggle} className="px-3 py-2.5" />
              <SortableHeader label="Valor bruto" columnKey="amount" activeKey={sortKey} dir={sortDir} onSort={toggle} align="right" className="px-3 py-2.5" />
              <SortableHeader label="ISS" columnKey="iss" activeKey={sortKey} dir={sortDir} onSort={toggle} align="right" className="px-3 py-2.5" />
              <SortableHeader label="INSS" columnKey="inss" activeKey={sortKey} dir={sortDir} onSort={toggle} align="right" className="px-3 py-2.5" />
              <SortableHeader label="Valor líquido" columnKey="liquido" activeKey={sortKey} dir={sortDir} onSort={toggle} align="right" className="px-3 py-2.5" />
              <SortableHeader label="Recebido" columnKey="received" activeKey={sortKey} dir={sortDir} onSort={toggle} align="right" className="px-3 py-2.5" />
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/60">
                <td className="px-3 py-2 text-ink-muted">
                  {r.emission_date ? formatDate(r.emission_date) : "—"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      r.document_type === "recibo"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-green-100 text-green-800"
                    )}
                  >
                    {r.document_type === "recibo" ? "Recibo" : "Nota Fiscal"}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium text-ink">
                  {r.invoice_number ?? "—"}
                </td>
                <td className="px-3 py-2 text-ink-muted">
                  {r.proposal_code ?? "—"}
                </td>
                <td className="px-3 py-2 text-ink-muted">
                  {r.received_at ? formatDate(r.received_at) : "—"}
                </td>
                <td className="max-w-[280px] truncate px-3 py-2 text-ink" title={r.description}>
                  {r.client_name || r.description}
                </td>
                <td className="px-3 py-2 text-right font-medium text-ink">
                  {formatMoney(r.amount)}
                </td>
                <td className="px-3 py-2 text-right text-danger">
                  {r.iss_amount ? formatMoney(r.iss_amount) : "—"}
                </td>
                <td className="px-3 py-2 text-right text-danger">
                  {r.inss_amount ? formatMoney(r.inss_amount) : "—"}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-ink">
                  {formatMoney(liquido(r))}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right font-semibold",
                    r.status === "recebido" ? "text-success" : "text-ink-muted"
                  )}
                >
                  {r.status === "recebido"
                    ? formatMoney(r.received_amount ?? liquido(r))
                    : "Em aberto"}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => startEdit(r)}
                    className="rounded p-1 text-gray-400 hover:text-brand-petrol"
                    title="Editar dados fiscais"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-ink">
            <tr>
              <td colSpan={6} className="px-3 py-2.5">
                Totais ({filtered.length} lançamentos)
              </td>
              <td className="px-3 py-2.5 text-right">{formatMoney(tot.bruto)}</td>
              <td className="px-3 py-2.5 text-right text-danger">{formatMoney(tot.iss)}</td>
              <td className="px-3 py-2.5 text-right text-danger">{formatMoney(tot.inss)}</td>
              <td className="px-3 py-2.5 text-right">{formatMoney(tot.liq)}</td>
              <td className="px-3 py-2.5 text-right text-success">{formatMoney(tot.rec)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-ink">
              Dados fiscais — {editing.client_name || editing.description}
            </h3>
            <p className="mb-4 text-xs text-ink-muted">
              Valor bruto {formatMoney(editing.amount)}
              {editing.proposal_code ? ` · ${editing.proposal_code}` : ""}
            </p>
            {error && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Tipo</label>
                <select
                  className="input-base"
                  value={form.document_type}
                  onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                >
                  <option value="nota_fiscal">Nota Fiscal</option>
                  <option value="recibo">Recibo</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Nº da NF</label>
                <input
                  type="text"
                  placeholder="NF099/2026"
                  className="input-base"
                  value={form.invoice_number}
                  onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Data de emissão</label>
                <input
                  type="date"
                  className="input-base"
                  value={form.emission_date}
                  onChange={(e) => setForm({ ...form, emission_date: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Data de recebimento</label>
                <input
                  type="date"
                  className="input-base"
                  value={form.received_at}
                  onChange={(e) => setForm({ ...form, received_at: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">ISS retido (R$)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input-base"
                  value={form.iss_amount}
                  onChange={(e) => setForm({ ...form, iss_amount: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">INSS retido (R$)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input-base"
                  value={form.inss_amount}
                  onChange={(e) => setForm({ ...form, inss_amount: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Valor recebido (R$) — deixe vazio para usar o líquido
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input-base"
                  value={form.received_amount}
                  onChange={(e) => setForm({ ...form, received_amount: e.target.value })}
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Valor líquido calculado:{" "}
              <strong>
                {formatMoney(
                  editing.amount -
                    (Number(form.iss_amount) || 0) -
                    (Number(form.inss_amount) || 0)
                )}
              </strong>
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                disabled={isPending}
                className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg bg-brand-petrol px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
