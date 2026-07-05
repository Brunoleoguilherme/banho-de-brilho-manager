"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListChecks, Banknote, X, Copy, Check, KeyRound } from "lucide-react";
import { markAllocationsPaidAction } from "@/lib/actions/finance";
import { updateEmployeePixAction } from "@/lib/actions/employees";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { formatMoney, formatDate, cn } from "@/lib/utils";

export interface ColaboradorSaldoRow {
  name: string;
  employeeId?: string;
  pix?: string | null;
  count: number;
  dr: number;
  vr: number;
  vt: number;
  adiant: number;
  pago: number;
  saldo: number;
  pendingIds: string[];
  lastPaidAt: string | null;
}

export function ColaboradorSaldoTable({ rows }: { rows: ColaboradorSaldoRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [paying, setPaying] = useState<ColaboradorSaldoRow | null>(null);
  const [payDate, setPayDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [pix, setPix] = useState("");
  const [pixOriginal, setPixOriginal] = useState("");
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function copyPix() {
    try {
      await navigator.clipboard.writeText(pix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  }

  const tot = rows.reduce(
    (acc, e) => ({
      count: acc.count + e.count,
      dr: acc.dr + e.dr,
      vr: acc.vr + e.vr,
      vt: acc.vt + e.vt,
      adiant: acc.adiant + e.adiant,
      pago: acc.pago + e.pago,
      saldo: acc.saldo + e.saldo,
    }),
    { count: 0, dr: 0, vr: 0, vt: 0, adiant: 0, pago: 0, saldo: 0 }
  );

  function confirmPay() {
    if (!paying) return;
    const row = paying;
    startTransition(async () => {
      // Salva o PIX se foi alterado no modal
      if (row.employeeId && pix.trim() !== pixOriginal.trim()) {
        await updateEmployeePixAction(row.employeeId, pix);
      }
      const result = await markAllocationsPaidAction(row.pendingIds, {
        paidDate: payDate,
        label: row.name,
      });
      if (result.ok) {
        setFeedback(
          `Pagamento de ${formatMoney(result.totalPaid ?? row.saldo)} registrado para ${row.name} em ${formatDate(payDate)} — lançado no Financeiro.`
        );
        setPaying(null);
        router.refresh();
      } else {
        setFeedback(result.error ?? "Erro ao registrar pagamento.");
      }
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-brand-teal" />
          <h2 className="text-base font-semibold text-ink">
            Saldo por colaborador
          </h2>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
            {rows.length}
          </span>
        </div>
        <ExportCsvButton
          filename={`saldo-colaboradores-${new Date().toISOString().slice(0, 10)}`}
          headers={["Funcionário","Diárias","DR","VR","VT","Adiantamento","Pago","Data pagamento","Saldo a receber"]}
          rows={rows.map((e) => [
            e.name, e.count,
            e.dr.toFixed(2).replace(".", ","),
            e.vr.toFixed(2).replace(".", ","),
            e.vt.toFixed(2).replace(".", ","),
            e.adiant.toFixed(2).replace(".", ","),
            e.pago.toFixed(2).replace(".", ","),
            e.lastPaidAt ? formatDate(e.lastPaidAt) : "",
            e.saldo.toFixed(2).replace(".", ","),
          ])}
        />
      </div>

      {feedback && (
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-brand-teal/5 px-6 py-2.5 text-sm text-ink">
          <span>{feedback}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-ink-muted hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-2.5">Funcionário</th>
              <th className="px-4 py-2.5 text-center">Diárias</th>
              <th className="px-4 py-2.5 text-right">DR</th>
              <th className="px-4 py-2.5 text-right">VR</th>
              <th className="px-4 py-2.5 text-right">VT</th>
              <th className="px-4 py-2.5 text-right">Adiant.</th>
              <th className="px-4 py-2.5 text-right">Pago</th>
              <th className="px-4 py-2.5 text-center">Data pagto</th>
              <th className="px-4 py-2.5 text-right">Saldo a receber</th>
              <th className="px-4 py-2.5 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((e) => (
              <tr key={e.name} className="hover:bg-gray-50/60">
                <td className="px-4 py-2.5 font-medium text-ink">{e.name}</td>
                <td className="px-4 py-2.5 text-center text-ink-muted">{e.count}</td>
                <td className="px-4 py-2.5 text-right text-ink-muted">{formatMoney(e.dr)}</td>
                <td className="px-4 py-2.5 text-right text-ink-muted">{formatMoney(e.vr)}</td>
                <td className="px-4 py-2.5 text-right text-ink-muted">{formatMoney(e.vt)}</td>
                <td className="px-4 py-2.5 text-right text-ink-muted">{formatMoney(e.adiant)}</td>
                <td className="px-4 py-2.5 text-right text-success">{formatMoney(e.pago)}</td>
                <td className="px-4 py-2.5 text-center text-ink-muted">
                  {e.lastPaidAt ? formatDate(e.lastPaidAt) : "—"}
                </td>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right font-bold",
                    e.saldo > 0 ? "text-warning" : "text-ink-muted"
                  )}
                >
                  {formatMoney(e.saldo)}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {e.saldo > 0 && e.pendingIds.length > 0 ? (
                    <button
                      onClick={() => {
                        setPayDate(new Date().toISOString().slice(0, 10));
                        setPix(e.pix ?? "");
                        setPixOriginal(e.pix ?? "");
                        setCopied(false);
                        setPaying(e);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-brand-teal px-2.5 py-1 text-xs font-semibold text-white transition hover:opacity-90"
                    >
                      <Banknote className="h-3.5 w-3.5" />
                      Pagar
                    </button>
                  ) : (
                    <span className="text-xs text-ink-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-ink">
            <tr>
              <td className="px-4 py-2.5">Totais</td>
              <td className="px-4 py-2.5 text-center">{tot.count}</td>
              <td className="px-4 py-2.5 text-right">{formatMoney(tot.dr)}</td>
              <td className="px-4 py-2.5 text-right">{formatMoney(tot.vr)}</td>
              <td className="px-4 py-2.5 text-right">{formatMoney(tot.vt)}</td>
              <td className="px-4 py-2.5 text-right">{formatMoney(tot.adiant)}</td>
              <td className="px-4 py-2.5 text-right text-success">{formatMoney(tot.pago)}</td>
              <td className="px-4 py-2.5" />
              <td className="px-4 py-2.5 text-right text-warning">{formatMoney(tot.saldo)}</td>
              <td className="px-4 py-2.5" />
            </tr>
          </tfoot>
        </table>
      </div>

      {paying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-teal/10">
                <Banknote className="h-5 w-5 text-brand-teal" />
              </span>
              <h3 className="text-base font-semibold text-ink">
                Pagar diárias — {paying.name}
              </h3>
            </div>
            <p className="mb-4 text-sm text-ink-muted">
              {paying.pendingIds.length} diária(s) pendente(s) serão marcadas
              como pagas e lançadas no Financeiro (Diárias Eventos).
            </p>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Data de pagamento
                </label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(ev) => setPayDate(ev.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Valor
                </label>
                <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-ink">
                  {formatMoney(paying.saldo)}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
                <KeyRound className="h-3.5 w-3.5 text-brand-teal" />
                PIX de {paying.name.split(" ")[0]}
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={pix}
                  onChange={(ev) => setPix(ev.target.value)}
                  placeholder="CPF, telefone, e-mail ou chave aleatória"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
                />
                <button
                  type="button"
                  onClick={copyPix}
                  disabled={!pix}
                  title="Copiar PIX"
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-gray-50 disabled:opacity-40"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-ink-muted">
                Alterou o PIX? Ele fica salvo no cadastro ao confirmar.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPaying(null)}
                disabled={isPending}
                className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPay}
                disabled={isPending || !payDate}
                className="rounded-lg bg-brand-teal px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? "Registrando..." : "Confirmar pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
