import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatMoney, cn } from "@/lib/utils";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function monthOf(date: string | null): number | null {
  if (!date) return null;
  return Number(date.slice(5, 7));
}
function yearOf(date: string | null): number | null {
  if (!date) return null;
  return Number(date.slice(0, 4));
}

export default async function CashflowPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const { ano } = await searchParams;
  const year = Number(ano) || new Date().getFullYear();
  const supabase = await createClient();

  const [{ data: receivables }, { data: payables }] = await Promise.all([
    supabase.from("receivables").select("*, clients(name)"),
    supabase.from("payables").select("*"),
  ]);

  // Consolidação mensal
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    faturado: 0,
    recebido: 0,
    emAberto: 0,
    despesas: 0,
    impostos: 0,
    resultado: 0,
  }));

  const TAX_CATEGORIES = ["FGTS", "INSS", "INSS/ISS Retidos", "Simples Nacional"];

  for (const r of receivables ?? []) {
    if (r.status === "cancelado") continue;
    const amount = Number(r.amount) || 0;
    const dueYear = yearOf(r.due_date);
    const dueMonth = monthOf(r.due_date);
    if (dueYear === year && dueMonth) {
      months[dueMonth - 1].faturado += amount;
      if (r.status !== "recebido") months[dueMonth - 1].emAberto += amount;
    }
    const recYear = yearOf(r.received_at);
    const recMonth = monthOf(r.received_at);
    if (r.status === "recebido" && recYear === year && recMonth) {
      months[recMonth - 1].recebido += amount;
    }
  }

  for (const p of payables ?? []) {
    if (p.status === "cancelado") continue;
    const amount = Number(p.amount) || 0;
    const m =
      p.competence_year === year && p.competence_month
        ? p.competence_month
        : yearOf(p.due_date) === year
          ? monthOf(p.due_date)
          : null;
    if (!m) continue;
    months[m - 1].despesas += amount;
    if (TAX_CATEGORIES.includes(p.category)) months[m - 1].impostos += amount;
  }

  let acumulado = 0;
  const rows = months.map((m) => {
    m.resultado = m.recebido - m.despesas;
    acumulado += m.resultado;
    return { ...m, acumulado };
  });

  const totals = rows.reduce(
    (acc, m) => ({
      faturado: acc.faturado + m.faturado,
      recebido: acc.recebido + m.recebido,
      emAberto: acc.emAberto + m.emAberto,
      despesas: acc.despesas + m.despesas,
      impostos: acc.impostos + m.impostos,
      resultado: acc.resultado + m.resultado,
    }),
    { faturado: 0, recebido: 0, emAberto: 0, despesas: 0, impostos: 0, resultado: 0 }
  );

  // Despesas por categoria no ano
  const byCategory = new Map<string, number>();
  for (const p of payables ?? []) {
    if (p.status === "cancelado") continue;
    const inYear =
      p.competence_year === year || yearOf(p.due_date) === year;
    if (!inYear) continue;
    byCategory.set(
      p.category,
      (byCategory.get(p.category) ?? 0) + (Number(p.amount) || 0)
    );
  }
  const categories = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);
  const maxCategory = categories[0]?.[1] ?? 1;

  // Receitas por cliente no ano
  const byClient = new Map<string, number>();
  for (const r of receivables ?? []) {
    if (r.status !== "recebido" || yearOf(r.received_at) !== year) continue;
    const name = (r.clients as { name: string } | null)?.name ?? "Sem cliente";
    byClient.set(name, (byClient.get(name) ?? 0) + (Number(r.amount) || 0));
  }
  const clients = Array.from(byClient.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxClient = clients[0]?.[1] ?? 1;

  // Lançamentos linha a linha (mais atuais primeiro), como na planilha
  const refDataP = (p: { paid_at: string | null; due_date: string | null }) =>
    p.paid_at ?? p.due_date ?? "";
  const despesasLinhas = (payables ?? [])
    .filter(
      (p) =>
        p.status !== "cancelado" &&
        (p.competence_year === year ||
          yearOf(p.due_date) === year ||
          yearOf(p.paid_at) === year)
    )
    .sort((a, b) => (refDataP(a) < refDataP(b) ? 1 : -1));

  const refDataR = (r: { received_at: string | null; due_date: string | null }) =>
    r.received_at ?? r.due_date ?? "";
  const receitasLinhas = (receivables ?? [])
    .filter(
      (r) =>
        r.status !== "cancelado" &&
        (yearOf(r.due_date) === year || yearOf(r.received_at) === year)
    )
    .sort((a, b) => (refDataR(a) < refDataR(b) ? 1 : -1));

  const fmtData = (d: string | null) =>
    d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "—";

  return (
    <div>
      <PageHeader
        title={`Fluxo de caixa ${year}`}
        description="Consolidação mensal de receitas, despesas e resultado"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/financeiro/pagar"
            className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3.5 py-2 text-sm font-semibold text-danger transition hover:bg-danger/20"
          >
            <Plus className="h-4 w-4" />
            Lançar despesa
          </Link>
          <Link
            href="/financeiro/receber"
            className="flex items-center gap-1.5 rounded-lg bg-success/10 px-3.5 py-2 text-sm font-semibold text-success transition hover:bg-success/20"
          >
            <Plus className="h-4 w-4" />
            Lançar receita
          </Link>
          <form method="get" className="flex items-center gap-2">
            <select name="ano" defaultValue={year} className="input-base w-auto">
              {[year - 2, year - 1, year, year + 1]
                .filter((y, i, arr) => arr.indexOf(y) === i)
                .sort()
                .map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-brand-petrol px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Ver
            </button>
          </form>
        </div>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: "Faturado", value: totals.faturado, tone: "text-ink" },
          { label: "Recebido", value: totals.recebido, tone: "text-success" },
          { label: "Em aberto", value: totals.emAberto, tone: "text-warning" },
          { label: "Despesas", value: totals.despesas, tone: "text-danger" },
          {
            label: "Resultado",
            value: totals.resultado,
            tone: totals.resultado >= 0 ? "text-success" : "text-danger",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-card"
          >
            <p className="text-xs text-ink-muted">{c.label}</p>
            <p className={cn("mt-1 text-lg font-bold", c.tone)}>
              {formatMoney(c.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-6 overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Mês</th>
              <th className="px-4 py-3 text-right">Faturado</th>
              <th className="px-4 py-3 text-right">Recebido</th>
              <th className="px-4 py-3 text-right">Em aberto</th>
              <th className="px-4 py-3 text-right">Despesas</th>
              <th className="px-4 py-3 text-right">Impostos</th>
              <th className="px-4 py-3 text-right">% Imp.</th>
              <th className="px-4 py-3 text-right">Resultado</th>
              <th className="px-4 py-3 text-right">Acumulado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((m) => (
              <tr key={m.month} className="hover:bg-gray-50/60">
                <td className="px-4 py-2.5 font-medium text-ink">
                  {MONTH_NAMES[m.month - 1]}
                </td>
                <td className="px-4 py-2.5 text-right text-ink-muted">
                  {formatMoney(m.faturado)}
                </td>
                <td className="px-4 py-2.5 text-right text-ink">
                  {formatMoney(m.recebido)}
                </td>
                <td className="px-4 py-2.5 text-right text-ink-muted">
                  {formatMoney(m.emAberto)}
                </td>
                <td className="px-4 py-2.5 text-right text-ink-muted">
                  {formatMoney(m.despesas)}
                </td>
                <td className="px-4 py-2.5 text-right text-ink-muted">
                  {formatMoney(m.impostos)}
                </td>
                <td className="px-4 py-2.5 text-right text-ink-muted">
                  {m.recebido > 0
                    ? `${((m.impostos / m.recebido) * 100).toFixed(1)}%`
                    : "—"}
                </td>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right font-medium",
                    m.resultado >= 0 ? "text-success" : "text-danger"
                  )}
                >
                  {formatMoney(m.resultado)}
                </td>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right font-semibold",
                    m.acumulado >= 0 ? "text-ink" : "text-danger"
                  )}
                >
                  {formatMoney(m.acumulado)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lançamentos linha a linha — mais atuais primeiro, ~10 visíveis com rolagem */}
      <div className="mb-6 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Lançamentos de despesas
            </h2>
            <p className="text-xs text-ink-muted">
              Linha a linha, da mais atual para a mais antiga — role para ver todas
            </p>
          </div>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
            {despesasLinhas.length}
          </span>
        </div>
        <div className="max-h-[430px] overflow-y-auto">
          <table className="w-full whitespace-nowrap text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 text-[10px] uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-2.5">Vencimento</th>
                <th className="px-4 py-2.5">Categoria</th>
                <th className="px-4 py-2.5">Descrição</th>
                <th className="px-4 py-2.5">Pago em</th>
                <th className="px-4 py-2.5 text-right">Valor original</th>
                <th className="px-4 py-2.5 text-right">Juros</th>
                <th className="px-4 py-2.5 text-right">Valor pago</th>
                <th className="px-4 py-2.5 text-right">Saldo a pagar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {despesasLinhas.map((p) => {
                const total = Number(p.amount) || 0;
                const juros = Number(p.interest_amount) || 0;
                const pago = p.status === "pago";
                return (
                  <tr key={p.id} className={cn("hover:bg-gray-50/60", pago && "bg-green-50/30")}>
                    <td className="px-4 py-2 text-ink-muted">{fmtData(p.due_date)}</td>
                    <td className="px-4 py-2 font-medium text-ink">{p.category}</td>
                    <td className="max-w-[280px] truncate px-4 py-2 text-ink-muted" title={p.description}>
                      {p.description}
                    </td>
                    <td className="px-4 py-2 text-ink-muted">
                      {pago ? fmtData(p.paid_at) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-ink-muted">
                      {formatMoney(total - juros)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {juros > 0 ? (
                        <span className="text-danger">{formatMoney(juros)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-ink">
                      {pago ? formatMoney(total) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {pago ? (
                        <span className="text-gray-300">R$ 0,00</span>
                      ) : (
                        <span className="text-warning">{formatMoney(total)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Lançamentos de receitas
            </h2>
            <p className="text-xs text-ink-muted">
              Linha a linha, da mais atual para a mais antiga — role para ver todas
            </p>
          </div>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
            {receitasLinhas.length}
          </span>
        </div>
        <div className="max-h-[430px] overflow-y-auto">
          <table className="w-full whitespace-nowrap text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 text-[10px] uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-2.5">Vencimento</th>
                <th className="px-4 py-2.5">Cliente / Descrição</th>
                <th className="px-4 py-2.5">Tipo</th>
                <th className="px-4 py-2.5">Recebido em</th>
                <th className="px-4 py-2.5 text-right">Valor</th>
                <th className="px-4 py-2.5 text-right">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {receitasLinhas.map((r) => {
                const recebido = r.status === "recebido";
                return (
                  <tr key={r.id} className={cn("hover:bg-gray-50/60", recebido && "bg-green-50/30")}>
                    <td className="px-4 py-2 text-ink-muted">{fmtData(r.due_date)}</td>
                    <td className="max-w-[320px] truncate px-4 py-2" title={r.description}>
                      <span className="font-medium text-ink">
                        {(r.clients as { name: string } | null)?.name ?? ""}
                      </span>{" "}
                      <span className="text-ink-muted">{r.description}</span>
                    </td>
                    <td className="px-4 py-2 text-ink-muted">
                      {r.document_type === "recibo" ? "Recibo" : "Nota Fiscal"}
                    </td>
                    <td className="px-4 py-2 text-ink-muted">
                      {recebido ? fmtData(r.received_at) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-ink">
                      {formatMoney(Number(r.amount) || 0)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          recebido
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        )}
                      >
                        {recebido ? "Recebido" : "Em aberto"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-ink">
            Despesas por categoria
          </h2>
          {categories.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma despesa lançada em {year}.</p>
          ) : (
            <div className="space-y-3">
              {categories.map(([cat, value]) => (
                <div key={cat}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-ink">{cat}</span>
                    <span className="font-medium text-ink">{formatMoney(value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-brand-petrol"
                      style={{ width: `${Math.max(3, (value / maxCategory) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-ink">
            Receitas por cliente (recebido)
          </h2>
          {clients.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum recebimento em {year}.</p>
          ) : (
            <div className="space-y-3">
              {clients.map(([name, value]) => (
                <div key={name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-ink">{name}</span>
                    <span className="font-medium text-ink">{formatMoney(value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-brand-teal"
                      style={{ width: `${Math.max(3, (value / maxClient) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
