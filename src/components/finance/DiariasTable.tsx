"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  CheckCircle2,
  Loader2,
  X,
  Trash2,
  ShieldAlert,
  Banknote,
  Copy,
  Check,
  KeyRound,
} from "lucide-react";
import {
  markAllocationsPaidAction,
  updateAllocationValuesAction,
  deleteDiariaAction,
} from "@/lib/actions/finance";
import { updateEmployeePixAction } from "@/lib/actions/employees";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { formatMoney, formatDate, cn } from "@/lib/utils";

export interface DiariaRow {
  id: string;
  employee_id?: string;
  employee_name: string;
  os_code: string;
  event_name: string;
  service_date: string;
  phase: string;
  status: string;
  daily_rate: number;
  vr_amount: number;
  vt_amount: number;
  advance_amount: number;
  balance_amount: number;
  total_amount: number;
  paid: boolean;
  paid_at?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  convidado: "Convidado",
  confirmado: "Confirmado",
  recusou: "Recusou",
  substituido: "Substituído",
  compareceu: "Compareceu",
  faltou: "Faltou",
  pago: "Pago",
};

const PHASE_LABEL: Record<string, string> = {
  montagem: "Montagem",
  realizacao: "Realização",
  desmontagem: "Desmontagem",
};

export function DiariasTable({
  rows,
  pixById,
}: {
  rows: DiariaRow[];
  pixById?: Record<string, string | null>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payOpen, setPayOpen] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [pix, setPix] = useState("");
  const [pixOriginal, setPixOriginal] = useState("");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    daily_rate: 0,
    vr_amount: 0,
    vt_amount: 0,
    advance_amount: 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DiariaRow | null>(null);
  const [password, setPassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!deleting) return;
    setBusy(true);
    setDeleteError(null);
    const result = await deleteDiariaAction(deleting.id, password);
    setBusy(false);
    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }
    setDeleting(null);
    setPassword("");
    router.refresh();
  }

  const selectable = rows.filter((r) => !r.paid && r.status !== "pago");

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === selectable.length) setSelected(new Set());
    else setSelected(new Set(selectable.map((r) => r.id)));
  }

  // Resumo da seleção atual (para a caixinha de pagamento)
  const selRows = rows.filter((r) => selected.has(r.id));
  const selTotal = selRows.reduce((s, r) => s + r.balance_amount, 0);
  const selEmpNames = Array.from(new Set(selRows.map((r) => r.employee_name)));
  const singleEmp = selEmpNames.length === 1 ? selRows[0] : null;

  async function copyPix() {
    try {
      await navigator.clipboard.writeText(pix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  }

  function openPayModal() {
    if (selected.size === 0) return;
    setPayDate(new Date().toISOString().slice(0, 10));
    const key =
      singleEmp?.employee_id && pixById
        ? pixById[singleEmp.employee_id] ?? ""
        : "";
    setPix(key);
    setPixOriginal(key);
    setCopied(false);
    setError(null);
    setPayOpen(true);
  }

  async function confirmPay() {
    setBusy(true);
    setError(null);
    // Salva o PIX se foi alterado no modal (só quando é 1 funcionário)
    if (singleEmp?.employee_id && pix.trim() !== pixOriginal.trim()) {
      await updateEmployeePixAction(singleEmp.employee_id, pix);
    }
    const result = await markAllocationsPaidAction(Array.from(selected), {
      paidDate: payDate,
      label: singleEmp
        ? singleEmp.employee_name
        : `${selEmpNames.length} funcionários`,
    });
    if (!result.ok) setError(result.error);
    setSelected(new Set());
    setPayOpen(false);
    setBusy(false);
    router.refresh();
  }

  function startEdit(row: DiariaRow) {
    setEditing(row.id);
    setEditForm({
      daily_rate: row.daily_rate,
      vr_amount: row.vr_amount,
      vt_amount: row.vt_amount,
      advance_amount: row.advance_amount,
    });
  }

  async function saveEdit(id: string) {
    setBusy(true);
    const result = await updateAllocationValuesAction(id, editForm);
    if (!result.ok) setError(result.error);
    setEditing(null);
    setBusy(false);
    router.refresh();
  }

  const totals = rows.reduce(
    (acc, r) => ({
      dr: acc.dr + r.daily_rate,
      vr: acc.vr + r.vr_amount,
      vt: acc.vt + r.vt_amount,
      adv: acc.adv + r.advance_amount,
      saldo: acc.saldo + r.balance_amount,
      total: acc.total + r.total_amount,
    }),
    { dr: 0, vr: 0, vt: 0, adv: 0, saldo: 0, total: 0 }
  );

  // Agrupa por funcionário: uma seção por pessoa, dias em ordem cronológica
  const groups = (() => {
    const map = new Map<string, DiariaRow[]>();
    for (const r of rows) {
      const list = map.get(r.employee_name) ?? [];
      list.push(r);
      map.set(r.employee_name, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, list]) => {
        list.sort((a, b) => (a.service_date > b.service_date ? 1 : -1));
        const sums = list.reduce(
          (acc, r) => ({
            dr: acc.dr + r.daily_rate,
            vr: acc.vr + r.vr_amount,
            vt: acc.vt + r.vt_amount,
            adv: acc.adv + r.advance_amount,
            saldo: acc.saldo + r.balance_amount,
            total: acc.total + r.total_amount,
          }),
          { dr: 0, vr: 0, vt: 0, adv: 0, saldo: 0, total: 0 }
        );
        const pendingIds = list
          .filter((r) => !r.paid && r.status !== "pago")
          .map((r) => r.id);
        const pagas = list.filter((r) => r.status === "pago").length;
        const datas = list
          .map((r) => r.service_date)
          .filter(Boolean)
          .sort();
        const periodo =
          datas.length === 0
            ? ""
            : datas[0] === datas[datas.length - 1]
              ? formatDate(datas[0])
              : `${formatDate(datas[0])} a ${formatDate(datas[datas.length - 1])}`;
        return { name, list, sums, pendingIds, pagas, periodo };
      });
  })();

  function toggleEmployee(ids: string[]) {
    const next = new Set(selected);
    const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
    if (allSelected) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    setSelected(next);
  }

  const csvRows = rows.map((r) => [
    r.employee_name,
    r.os_code,
    r.event_name,
    formatDate(r.service_date),
    PHASE_LABEL[r.phase] ?? r.phase,
    STATUS_LABEL[r.status] ?? r.status,
    r.paid_at ? formatDate(r.paid_at) : "",
    r.daily_rate.toFixed(2).replace(".", ","),
    r.vr_amount.toFixed(2).replace(".", ","),
    r.vt_amount.toFixed(2).replace(".", ","),
    r.advance_amount.toFixed(2).replace(".", ","),
    r.balance_amount.toFixed(2).replace(".", ","),
    r.total_amount.toFixed(2).replace(".", ","),
  ]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={openPayModal}
            disabled={selected.size === 0 || busy}
            className="flex items-center gap-1.5 rounded-lg bg-success px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Marcar como pago ({selected.size})
          </button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
        <ExportCsvButton
          filename={`diarias-${new Date().toISOString().slice(0, 10)}`}
          headers={[
            "Funcionário", "OS", "Evento", "Data", "Fase", "Situação",
            "Data pagamento", "Diária", "VR", "VT", "Adiantamento", "Saldo", "Total",
          ]}
          rows={csvRows}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-card">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={selectable.length > 0 && selected.size === selectable.length}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
                />
              </th>
              <th className="px-3 py-3">Funcionário / Data</th>
              <th className="px-3 py-3">Evento / Local</th>
              <th className="px-3 py-3 text-right">DR</th>
              <th className="px-3 py-3 text-right">VR</th>
              <th className="px-3 py-3 text-right">VT</th>
              <th className="px-3 py-3 text-right">Adiant.</th>
              <th className="px-3 py-3 text-right">Saldo</th>
              <th className="px-3 py-3 text-right">Total</th>
              <th className="px-3 py-3">Situação</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {groups.map((g, gi) => (
              <Fragment key={g.name}>
              <tr className="border-t-4 border-brand-petrol/15 bg-brand-petrol/5">
                <td className="px-3 py-3">
                  {g.pendingIds.length > 0 && (
                    <input
                      type="checkbox"
                      checked={g.pendingIds.every((id) => selected.has(id))}
                      onChange={() => toggleEmployee(g.pendingIds)}
                      className="h-4 w-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
                      title="Selecionar todas as diárias pendentes deste funcionário"
                    />
                  )}
                </td>
                <td className="px-3 py-3" colSpan={2}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-petrol text-[11px] font-bold text-white">
                      {gi + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{g.name}</p>
                      <p className="text-[11px] text-ink-muted">
                        {g.pendingIds.length > 0 && (
                          <span className="font-semibold text-warning">
                            {g.pendingIds.length} a pagar
                          </span>
                        )}
                        {g.pendingIds.length > 0 && g.pagas > 0 && " · "}
                        {g.pagas > 0 && (
                          <span className="font-semibold text-success">
                            {g.pagas} paga{g.pagas > 1 ? "s" : ""}
                          </span>
                        )}
                        {g.periodo && (
                          <span> · {g.periodo}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-semibold text-ink">
                  {formatMoney(g.sums.dr)}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-ink">
                  {formatMoney(g.sums.vr)}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-ink">
                  {formatMoney(g.sums.vt)}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-ink">
                  {formatMoney(g.sums.adv)}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-warning">
                  {formatMoney(g.sums.saldo)}
                </td>
                <td className="px-3 py-3 text-right font-bold text-ink">
                  {formatMoney(g.sums.total)}
                </td>
                <td className="px-3 py-3" colSpan={2}>
                  <span className="inline-flex rounded-full bg-brand-petrol px-2.5 py-0.5 text-xs font-bold text-white">
                    {g.list.length} diária{g.list.length > 1 ? "s" : ""}
                  </span>
                </td>
              </tr>
              {g.list.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "hover:bg-gray-50/60",
                  row.status === "pago" && "bg-green-50/40"
                )}
              >
                <td className="px-3 py-2.5">
                  {!row.paid && row.status !== "pago" && (
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      className="h-4 w-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
                    />
                  )}
                </td>
                <td className="px-3 py-2.5 pl-7 text-ink-muted">
                  {formatDate(row.service_date)}
                </td>
                <td className="px-3 py-2.5 text-ink-muted">
                  <p className="text-ink">{row.event_name}</p>
                  <p className="text-xs">{row.os_code} · {PHASE_LABEL[row.phase] ?? row.phase}</p>
                </td>
                {editing === row.id ? (
                  <>
                    {(["daily_rate", "vr_amount", "vt_amount", "advance_amount"] as const).map(
                      (key) => (
                        <td key={key} className="px-1 py-2.5">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="w-20 rounded border border-gray-300 px-1.5 py-1 text-right text-xs"
                            value={editForm[key]}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                [key]: Number(e.target.value),
                              })
                            }
                          />
                        </td>
                      )
                    )}
                    <td className="px-3 py-2.5 text-right text-ink-muted">
                      {formatMoney(
                        editForm.daily_rate + editForm.vr_amount + editForm.vt_amount - editForm.advance_amount
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">
                      {formatMoney(
                        editForm.daily_rate + editForm.vr_amount + editForm.vt_amount
                      )}
                    </td>
                    <td className="px-3 py-2.5" colSpan={2}>
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveEdit(row.id)}
                          disabled={busy}
                          className="rounded bg-brand-petrol px-2 py-1 text-xs font-semibold text-white"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="rounded p-1 text-gray-400 hover:text-danger"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2.5 text-right text-ink-muted">
                      {formatMoney(row.daily_rate)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-ink-muted">
                      {formatMoney(row.vr_amount)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-ink-muted">
                      {formatMoney(row.vt_amount)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-ink-muted">
                      {formatMoney(row.advance_amount)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-ink-muted">
                      {formatMoney(row.balance_amount)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-ink">
                      {formatMoney(row.total_amount)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          row.status === "pago"
                            ? "bg-green-100 text-green-800"
                            : ["faltou", "recusou"].includes(row.status)
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800"
                        )}
                      >
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                      {row.status === "pago" && row.paid_at && (
                        <p className="mt-0.5 text-[11px] text-ink-muted">
                          em {formatDate(row.paid_at)}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => startEdit(row)}
                          className="rounded p-1 text-gray-400 hover:text-brand-petrol"
                          title={
                            row.status === "pago"
                              ? "Editar valores (diária já paga)"
                              : "Ajustar valores"
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleting(row);
                            setPassword("");
                            setDeleteError(null);
                          }}
                          className="rounded p-1 text-gray-400 hover:text-danger"
                          title="Excluir diária (pede senha)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
              ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-ink">
            <tr>
              <td colSpan={3} className="px-3 py-3">
                Totais ({rows.length} diárias · {groups.length} funcionário
                {groups.length > 1 ? "s" : ""})
              </td>
              <td className="px-3 py-3 text-right">{formatMoney(totals.dr)}</td>
              <td className="px-3 py-3 text-right">{formatMoney(totals.vr)}</td>
              <td className="px-3 py-3 text-right">{formatMoney(totals.vt)}</td>
              <td className="px-3 py-3 text-right">{formatMoney(totals.adv)}</td>
              <td className="px-3 py-3 text-right">{formatMoney(totals.saldo)}</td>
              <td className="px-3 py-3 text-right">{formatMoney(totals.total)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {payOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setPayOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-teal/10">
                <Banknote className="h-5 w-5 text-brand-teal" />
              </span>
              <h3 className="text-base font-semibold text-ink">
                Pagar diárias —{" "}
                {singleEmp
                  ? singleEmp.employee_name
                  : `${selEmpNames.length} funcionários`}
              </h3>
            </div>
            <p className="mb-4 text-sm text-ink-muted">
              {selected.size} diária(s) serão marcadas como pagas e lançadas no
              Financeiro (Diárias Eventos).
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
                  {formatMoney(selTotal)}
                </p>
              </div>
            </div>

            {singleEmp ? (
              <div className="mb-4">
                <label className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
                  <KeyRound className="h-3.5 w-3.5 text-brand-teal" />
                  PIX de {singleEmp.employee_name.split(" ")[0]}
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
            ) : (
              <p className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-ink-muted">
                Seleção com mais de um funcionário — para ver o PIX de cada um,
                pague por pessoa ou use a tela Saldo por colaborador.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPayOpen(false)}
                disabled={busy}
                className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPay}
                disabled={busy || !payDate}
                className="flex items-center gap-1.5 rounded-lg bg-brand-teal px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setDeleting(null)}
        >
          <form
            onSubmit={handleDeleteConfirm}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <ShieldAlert className="h-5 w-5 text-danger" />
            </div>
            <h3 className="text-base font-semibold text-ink">
              Excluir a diária de {deleting.employee_name}?
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              {formatDate(deleting.service_date)} · {deleting.event_name} ·{" "}
              {formatMoney(deleting.total_amount)}. Para confirmar, digite a{" "}
              <strong>sua senha de login</strong>:
            </p>
            {deleteError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                {deleteError}
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
                className="flex items-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Excluir diária
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
