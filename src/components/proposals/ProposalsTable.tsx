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
} from "lucide-react";
import {
  deleteProposalAction,
  deleteHistoricalProposalAction,
} from "@/lib/actions/proposals";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney, cn } from "@/lib/utils";

export interface ProposalListRow {
  id: string;
  kind: "sistema" | "onedrive";
  code: string;
  client: string;
  event: string;
  eventDateLabel: string;
  proposalDateLabel: string;
  value: number | null;
  status: string | null; // null para OneDrive
  location?: string | null;
  dateText?: string | null;
  schedule?: string | null;
  totalAl?: number;
  totalCo?: number;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  docType?: string | null;
}

const DOC_LABEL: Record<string, string> = {
  nota_fiscal: "Nota Fiscal",
  recibo: "Recibo",
  ambos: "NF ou Recibo",
};

export function ProposalsTable({ rows }: { rows: ProposalListRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [deleting, setDeleting] = useState<ProposalListRow | null>(null);
  const [details, setDetails] = useState<ProposalListRow | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yearOf = (code: string) => code.split("/")[1] ?? "";
  const years = Array.from(new Set(rows.map((r) => yearOf(r.code)).filter(Boolean)))
    .sort()
    .reverse();
  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (year && yearOf(r.code) !== year) return false;
    if (!q) return true;
    return (
      r.code.toLowerCase().includes(q) ||
      r.client.toLowerCase().includes(q) ||
      r.event.toLowerCase().includes(q)
    );
  });

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!deleting) return;
    setBusy(true);
    setError(null);
    const result =
      deleting.kind === "onedrive"
        ? await deleteHistoricalProposalAction(deleting.id, password)
        : await deleteProposalAction(deleting.id, password);
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
            placeholder="Buscar por número BBP, cliente ou evento..."
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
          {filtered.length} de {rows.length} proposta(s)
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
        <div className="max-h-[480px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-3 py-3">Número</th>
              <th className="px-3 py-3">Cliente</th>
              <th className="px-3 py-3">Evento</th>
              <th className="px-3 py-3">Data do evento</th>
              <th className="px-3 py-3">Data da proposta</th>
              <th className="px-3 py-3 text-right">Valor</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-muted">
                  Nenhuma proposta encontrada{q ? ` para "${query}"` : ""}.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={`${r.kind}-${r.id}`} className="hover:bg-gray-50/60">
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-brand-petrol">
                  {r.code}
                </td>
                <td className="max-w-[150px] truncate px-3 py-2.5 text-ink" title={r.client}>
                  {r.client}
                </td>
                <td className="max-w-[170px] truncate px-3 py-2.5 text-ink-muted" title={r.event}>
                  {r.event}
                </td>
                <td
                  className="max-w-[110px] truncate whitespace-nowrap px-3 py-2.5 text-ink-muted"
                  title={r.eventDateLabel}
                >
                  {r.eventDateLabel}
                </td>
                <td
                  className="max-w-[110px] truncate whitespace-nowrap px-3 py-2.5 text-ink-muted"
                  title={r.proposalDateLabel}
                >
                  {r.proposalDateLabel}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-ink">
                  {r.value !== null ? formatMoney(r.value) : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  {r.status ? (
                    <StatusBadge status={r.status} />
                  ) : (
                    <a
                      href="https://onedrive.live.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-brand-gold/15 px-2 py-1 text-xs font-semibold text-[#1E5A8A] transition hover:bg-brand-gold/30"
                      title="Proposta no OneDrive — clique para abrir"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      OneDrive
                    </a>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                    {r.kind === "sistema" ? (
                      <Link
                        href={`/propostas/${r.id}`}
                        className="inline-flex items-center gap-0.5 rounded-lg bg-brand-petrol px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-dark"
                      >
                        Detalhes
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <button
                        onClick={() => setDetails(r)}
                        className="inline-flex items-center gap-0.5 rounded-lg bg-brand-petrol px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-dark"
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
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-brand-gold/15 px-2.5 py-1 text-xs font-semibold text-[#1E5A8A]">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Proposta no OneDrive
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

            <dl className="space-y-2.5 text-sm">
              <div>
                <dt className="text-xs text-ink-muted">Cliente</dt>
                <dd className="font-medium text-ink">{details.client}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Evento</dt>
                <dd className="text-ink">{details.event}</dd>
              </div>
              {details.location && (
                <div>
                  <dt className="text-xs text-ink-muted">Local</dt>
                  <dd className="text-ink">{details.location}</dd>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface/70 p-3">
                <div>
                  <dt className="text-xs text-ink-muted">Responsável (A/C)</dt>
                  <dd className="font-medium text-ink">
                    {details.contactName ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Telefone</dt>
                  <dd className="text-ink">{details.contactPhone ?? "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-ink-muted">E-mail</dt>
                  <dd className="break-all text-ink">
                    {details.contactEmail ?? "—"}
                  </dd>
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <div>
                  <dt className="text-xs text-ink-muted">Data do evento</dt>
                  <dd className="text-ink">
                    {details.dateText ?? details.eventDateLabel}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Data da proposta</dt>
                  <dd className="text-ink">{details.proposalDateLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Valor</dt>
                  <dd className="font-bold text-ink">
                    {details.value !== null ? formatMoney(details.value) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Documento</dt>
                  <dd className="font-medium text-ink">
                    {details.docType ? DOC_LABEL[details.docType] ?? details.docType : "—"}
                  </dd>
                </div>
                {((details.totalAl ?? 0) > 0 || (details.totalCo ?? 0) > 0) && (
                  <div>
                    <dt className="text-xs text-ink-muted">Agentes</dt>
                    <dd className="font-semibold text-ink">
                      {details.totalAl ?? 0} AL
                      {(details.totalCo ?? 0) > 0 ? ` + ${details.totalCo} CO` : ""}
                    </dd>
                  </div>
                )}
              </div>
              <div>
                <dt className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Cronograma (dias · horários · agentes)
                </dt>
                {details.schedule ? (
                  <dd className="rounded-lg bg-surface/70 p-3">
                    <ul className="space-y-1 text-sm text-ink">
                      {details.schedule.split("\n").map((ln, i) => (
                        <li key={i}>{ln}</li>
                      ))}
                    </ul>
                  </dd>
                ) : (
                  <dd className="text-sm text-ink-muted">
                    Sem cronograma no arquivo original.
                  </dd>
                )}
              </div>
              <p className="pt-1 text-xs text-ink-muted">
                O arquivo completo (Word/PDF) está na pasta do OneDrive —{" "}
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
              Excluir a proposta {deleting.code}?
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              {deleting.client} · {deleting.event}
              {deleting.kind === "onedrive"
                ? " — remove só o registro do histórico (o arquivo continua no OneDrive)."
                : " — apaga também tudo que estiver vinculado (contrato, OS, turnos, escala, checklist, veículos e contas a receber)."}{" "}
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
                className={cn(
                  "flex items-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                )}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? "Excluindo..." : "Excluir proposta"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
