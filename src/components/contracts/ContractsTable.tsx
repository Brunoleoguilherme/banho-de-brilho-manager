"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronRight,
  Trash2,
  Loader2,
  ShieldAlert,
  X,
  FolderOpen,
  PenLine,
} from "lucide-react";
import {
  deleteContractAction,
  deleteHistoricalContractAction,
} from "@/lib/actions/contracts";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney, cn } from "@/lib/utils";

export interface ContractListRow {
  id: string;
  kind: "sistema" | "onedrive";
  code: string;            // CT-BBP... ou BBP... (referência)
  client: string;
  proposalCode: string;
  dateLabel: string;       // assinado em / data do contrato
  value: number | null;
  status: string | null;   // null para OneDrive
  year: number;
  signedBy: string | null;       // assinatura da Banho de Brilho
  clientSignedBy: string | null; // assinatura do CLIENTE
  objectText?: string | null;
  responsibilitiesText?: string | null;
  termsText?: string | null;
}

export function ContractsTable({ rows }: { rows: ContractListRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [details, setDetails] = useState<ContractListRow | null>(null);
  const [deleting, setDeleting] = useState<ContractListRow | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const years = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => b - a);
  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (year && String(r.year) !== year) return false;
    if (!q) return true;
    return (
      r.code.toLowerCase().includes(q) ||
      r.client.toLowerCase().includes(q) ||
      r.proposalCode.toLowerCase().includes(q) ||
      (r.objectText ?? "").toLowerCase().includes(q)
    );
  });

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!deleting) return;
    setBusy(true);
    setError(null);
    const result =
      deleting.kind === "onedrive"
        ? await deleteHistoricalContractAction(deleting.id, password)
        : await deleteContractAction(deleting.id, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDeleting(null);
    setPassword("");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por contrato, cliente, proposta ou evento..."
            className="input-base pl-9"
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
          {filtered.length} de {rows.length} contrato(s)
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
        <div className="max-h-[480px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-2 py-3">Contrato</th>
              <th className="px-2 py-3">Cliente</th>
              <th className="px-2 py-3">Proposta</th>
              <th className="px-2 py-3">Data</th>
              <th className="px-2 py-3 text-right">Valor</th>
              <th className="px-2 py-3">Assinatura do cliente</th>
              <th className="px-2 py-3">Status</th>
              <th className="px-2 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-muted">
                  Nenhum contrato encontrado{q ? ` para "${query}"` : ""}.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={`${r.kind}-${r.id}`} className="hover:bg-gray-50/60">
                <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-brand-petrol">
                  {r.code}
                </td>
                <td className="max-w-[140px] truncate px-2 py-2.5 text-ink" title={r.client}>
                  {r.client}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-ink-muted">
                  {r.proposalCode}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-ink-muted">
                  {r.dateLabel}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right font-medium text-ink">
                  {r.value !== null ? formatMoney(r.value) : "—"}
                </td>
                <td className="max-w-[120px] px-2 py-2.5" title={r.clientSignedBy ?? ""}>
                  {r.kind === "onedrive" ? (
                    r.clientSignedBy ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-success">
                        <PenLine className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{r.clientSignedBy}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-amber-700">Sem assinatura</span>
                    )
                  ) : (
                    <span className="text-xs text-ink-muted">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5">
                  {r.status ? (
                    <StatusBadge status={r.status} />
                  ) : (
                    <a
                      href="https://onedrive.live.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-brand-gold/15 px-2 py-1 text-xs font-semibold text-[#1E5A8A] transition hover:bg-brand-gold/30"
                      title="Contrato no OneDrive — clique para abrir"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      OneDrive
                    </a>
                  )}
                </td>
                <td className="px-2 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                    {r.kind === "sistema" ? (
                      <Link
                        href={`/contratos/${r.id}`}
                        className="inline-flex items-center gap-0.5 rounded-lg bg-brand-petrol px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-dark"
                      >
                        Detalhes
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <button
                        onClick={() => setDetails(r)}
                        className="inline-flex items-center gap-0.5 rounded-lg bg-brand-petrol px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-dark"
                      >
                        Detalhes
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setDeleting(r);
                        setPassword("");
                        setError(null);
                      }}
                      className="rounded-lg p-1.5 text-danger hover:bg-red-50"
                      title="Excluir (pede senha)"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {details && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDetails(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-brand-gold/15 px-2.5 py-1 text-xs font-semibold text-[#1E5A8A]">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Contrato no OneDrive
                </span>
                <h3 className="text-lg font-bold text-brand-petrol">
                  {details.code}
                </h3>
              </div>
              <button
                onClick={() => setDetails(null)}
                className="rounded p-1 text-gray-400 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-6">
                <div>
                  <dt className="text-xs text-ink-muted">Cliente</dt>
                  <dd className="font-medium text-ink">{details.client}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Data do contrato</dt>
                  <dd className="text-ink">{details.dateLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Valor</dt>
                  <dd className="font-bold text-ink">
                    {details.value !== null ? formatMoney(details.value) : "—"}
                  </dd>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div
                  className={cn(
                    "rounded-lg p-3",
                    details.clientSignedBy ? "bg-green-50" : "bg-amber-50"
                  )}
                >
                  <dt className="text-xs text-ink-muted">Assinatura do cliente</dt>
                  <dd
                    className={cn(
                      "flex items-center gap-1.5 font-semibold",
                      details.clientSignedBy ? "text-green-800" : "text-amber-800"
                    )}
                  >
                    <PenLine className="h-4 w-4" />
                    {details.clientSignedBy ?? "Sem assinatura"}
                  </dd>
                </div>
                <div
                  className={cn(
                    "rounded-lg p-3",
                    details.signedBy ? "bg-green-50" : "bg-amber-50"
                  )}
                >
                  <dt className="text-xs text-ink-muted">
                    Assinatura da Banho de Brilho
                  </dt>
                  <dd
                    className={cn(
                      "flex items-center gap-1.5 font-semibold",
                      details.signedBy ? "text-green-800" : "text-amber-800"
                    )}
                  >
                    <PenLine className="h-4 w-4" />
                    {details.signedBy ?? "Sem assinatura"}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Objeto do contrato
                </dt>
                <dd className="whitespace-pre-line rounded-lg bg-surface/70 p-3 text-ink">
                  {details.objectText ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Responsabilidade da contratada
                </dt>
                <dd className="whitespace-pre-line rounded-lg bg-surface/70 p-3 text-ink">
                  {details.responsibilitiesText ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Preço e condições de pagamento
                </dt>
                <dd className="whitespace-pre-line rounded-lg bg-surface/70 p-3 text-ink">
                  {details.termsText ?? "—"}
                </dd>
              </div>
              <p className="text-xs text-ink-muted">
                O arquivo completo (Word/PDF assinado) está na pasta do OneDrive —{" "}
                <a
                  href="https://onedrive.live.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-petrol underline hover:opacity-80"
                >
                  abrir OneDrive
                </a>
                .
              </p>
            </dl>
          </div>
        </div>
      )}

      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setDeleting(null)}
        >
          <form
            onSubmit={handleDelete}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <ShieldAlert className="h-5 w-5 text-danger" />
              </div>
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="rounded p-1 text-gray-400 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h3 className="text-base font-semibold text-ink">
              Excluir o contrato {deleting.code}?
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              {deleting.client}
              {deleting.kind === "onedrive"
                ? " — remove só o registro do histórico (o arquivo continua no OneDrive)."
                : ""}{" "}
              Esta ação não pode ser desfeita. Para confirmar, digite a{" "}
              <strong>sua senha de login</strong>:
            </p>

            {error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <input
              type="password"
              required
              autoFocus
              className="input-base mt-3"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={busy}
                className="rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy || !password}
                className="flex items-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? "Excluindo..." : "Excluir contrato"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
