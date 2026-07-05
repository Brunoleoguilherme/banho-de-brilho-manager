import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatMoney, cn } from "@/lib/utils";

/**
 * Dados Financeiros do ano — replica a aba "Dados" da planilha
 * FLUXO DE CAIXA: despesas por categoria × mês, faturamento NF/Recibo,
 * impostos por mês e o bloco Diárias/VT/VR acumulado.
 */

const MESES_CURTOS = [
  "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
  "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
];

const isVR = (c: string) => /vale\s*refei|^vr$/i.test(c.trim());
const isVT = (c: string) => /vale\s*transp|^vt$/i.test(c.trim());
const isDiaria = (c: string) => /di[áa]ria/i.test(c);
const isImposto = (c: string) => /simples|inss|iss|fgts/i.test(c);

const r2 = (n: number) => Math.round(n * 100) / 100;

export default async function DadosFinanceirosPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const params = await searchParams;
  const anoAtual = new Date().getFullYear();
  const ano =
    Number(params.ano) >= 2020 && Number(params.ano) <= 2100
      ? Number(params.ano)
      : anoAtual;

  const supabase = await createClient();
  const [{ data: payables }, { data: receivables }] = await Promise.all([
    supabase
      .from("payables")
      .select("category, amount, status, competence_month, competence_year, due_date, paid_at")
      .eq("status", "pago"),
    supabase
      .from("receivables")
      .select("amount, due_date, received_at, status, document_type")
      .neq("status", "cancelado"),
  ]);

  // ---- Despesas pagas por categoria × mês (competência; fallback data) ----
  const porCategoria = new Map<string, number[]>(); // 12 posições
  for (const p of payables ?? []) {
    let m = p.competence_month;
    let y = p.competence_year;
    const dataRef = (p.paid_at ?? p.due_date) as string | null;
    if ((!m || !y) && dataRef) {
      y = Number(dataRef.slice(0, 4));
      m = Number(dataRef.slice(5, 7));
    }
    if (y !== ano || !m) continue;
    const cat = (p.category as string) || "Outros";
    const arr = porCategoria.get(cat) ?? Array(12).fill(0);
    arr[m - 1] += Number(p.amount) || 0;
    porCategoria.set(cat, arr);
  }
  const categorias = Array.from(porCategoria.entries())
    .map(([cat, meses]) => ({
      cat,
      meses,
      total: r2(meses.reduce((a, b) => a + b, 0)),
    }))
    .sort((a, b) => b.total - a.total);
  const totalMes = Array(12)
    .fill(0)
    .map((_, i) => categorias.reduce((a, c) => a + c.meses[i], 0));
  const totalDespesas = r2(totalMes.reduce((a, b) => a + b, 0));

  // ---- Faturamento (por vencimento) e recebimentos (por data recebida) ----
  const fatNF = Array(12).fill(0);
  const fatRecibo = Array(12).fill(0);
  const recebidoMes = Array(12).fill(0);
  for (const r of receivables ?? []) {
    const amount = Number(r.amount) || 0;
    if (r.due_date && Number(r.due_date.slice(0, 4)) === ano) {
      const m = Number(r.due_date.slice(5, 7)) - 1;
      if (r.document_type === "recibo") fatRecibo[m] += amount;
      else fatNF[m] += amount;
    }
    if (
      r.status === "recebido" &&
      r.received_at &&
      Number(r.received_at.slice(0, 4)) === ano
    ) {
      recebidoMes[Number(r.received_at.slice(5, 7)) - 1] += amount;
    }
  }
  const fatBrutoMes = fatNF.map((v, i) => v + fatRecibo[i]);
  const totFatNF = r2(fatNF.reduce((a, b) => a + b, 0));
  const totFatRecibo = r2(fatRecibo.reduce((a, b) => a + b, 0));
  const totFatBruto = r2(totFatNF + totFatRecibo);
  const totRecebido = r2(recebidoMes.reduce((a, b) => a + b, 0));

  // ---- Impostos por mês (Simples, INSS, ISS, FGTS) + % sobre fat NF ----
  const impostosMes = Array(12).fill(0);
  for (const c of categorias) {
    if (!isImposto(c.cat)) continue;
    c.meses.forEach((v, i) => (impostosMes[i] += v));
  }
  const totImpostos = r2(impostosMes.reduce((a, b) => a + b, 0));
  const pctImpMedio = totFatNF > 0 ? (totImpostos / totFatNF) * 100 : 0;

  // ---- Bloco Diárias / VT / VR (como o quadro da planilha) ----
  const diariasMes = Array(12).fill(0);
  const vtMes = Array(12).fill(0);
  const vrMes = Array(12).fill(0);
  for (const c of categorias) {
    const destino = isDiaria(c.cat)
      ? diariasMes
      : isVT(c.cat)
        ? vtMes
        : isVR(c.cat)
          ? vrMes
          : null;
    if (destino) c.meses.forEach((v, i) => (destino[i] += v));
  }
  const totDiarias = r2(diariasMes.reduce((a, b) => a + b, 0));
  const totVT = r2(vtMes.reduce((a, b) => a + b, 0));
  const totVR = r2(vrMes.reduce((a, b) => a + b, 0));
  const mesesComDado = diariasMes.filter(
    (v, i) => v + vtMes[i] + vrMes[i] > 0
  ).length;

  const cards = [
    { title: "Faturamento bruto", value: formatMoney(totFatBruto), hint: `NF ${formatMoney(totFatNF)} · Recibo ${formatMoney(totFatRecibo)}` },
    { title: "Recebido no ano", value: formatMoney(totRecebido), hint: "Baixas em contas a receber" },
    { title: "Despesas pagas", value: formatMoney(totalDespesas), hint: `${categorias.length} categorias` },
    { title: "Impostos", value: formatMoney(totImpostos), hint: `${pctImpMedio.toFixed(2).replace(".", ",")}% sobre faturamento NF` },
    { title: "Diárias + VT + VR", value: formatMoney(r2(totDiarias + totVT + totVR)), hint: `Média ${formatMoney(mesesComDado ? (totDiarias + totVT + totVR) / mesesComDado : 0)}/mês` },
  ];

  const th = "px-2 py-2 text-right whitespace-nowrap";
  const td = "px-2 py-1.5 text-right whitespace-nowrap";
  const fmt = (v: number) =>
    v === 0 ? <span className="text-gray-300">—</span> : formatMoney(v);

  return (
    <div>
      <PageHeader
        title={`Dados Financeiros ${ano}`}
        description="Despesas por categoria, faturamento NF × Recibo, impostos e Diárias/VT/VR — igual à aba Dados da planilha"
      />

      <form method="get" className="mb-4 flex items-end gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Ano</label>
          <select name="ano" defaultValue={String(ano)} className="input-base w-auto">
            {Array.from({ length: 7 }, (_, i) => anoAtual - 5 + i).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-brand-petrol px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
          Ver ano
        </button>
      </form>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.title} className="rounded-xl border border-gray-100 bg-white p-4 shadow-card">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{c.title}</p>
            <p className="mt-1 text-xl font-bold text-ink">{c.value}</p>
            <p className="text-[11px] text-ink-muted">{c.hint}</p>
          </div>
        ))}
      </div>

      {/* Faturamento mensal */}
      <div className="mb-6 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-ink">Faturamento por mês</h2>
          <p className="text-xs text-ink-muted">Pelo vencimento das contas a receber (NF × Recibo) + o que já entrou</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50 text-[10px] uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-3 py-2">&nbsp;</th>
                {MESES_CURTOS.map((m) => <th key={m} className={th}>{m}</th>)}
                <th className={cn(th, "font-bold")}>TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr className="font-semibold">
                <td className="px-3 py-1.5 whitespace-nowrap">Faturamento bruto</td>
                {fatBrutoMes.map((v, i) => <td key={i} className={td}>{fmt(v)}</td>)}
                <td className={cn(td, "font-bold")}>{formatMoney(totFatBruto)}</td>
              </tr>
              <tr>
                <td className="px-3 py-1.5 whitespace-nowrap text-ink-muted">Nota Fiscal</td>
                {fatNF.map((v, i) => <td key={i} className={cn(td, "text-ink-muted")}>{fmt(v)}</td>)}
                <td className={cn(td, "font-semibold")}>{formatMoney(totFatNF)}</td>
              </tr>
              <tr>
                <td className="px-3 py-1.5 whitespace-nowrap text-ink-muted">Recibo</td>
                {fatRecibo.map((v, i) => <td key={i} className={cn(td, "text-ink-muted")}>{fmt(v)}</td>)}
                <td className={cn(td, "font-semibold")}>{formatMoney(totFatRecibo)}</td>
              </tr>
              <tr className="bg-green-50/50">
                <td className="px-3 py-1.5 whitespace-nowrap font-medium text-green-800">Recebido</td>
                {recebidoMes.map((v, i) => <td key={i} className={cn(td, "text-green-800")}>{fmt(v)}</td>)}
                <td className={cn(td, "font-bold text-green-800")}>{formatMoney(totRecebido)}</td>
              </tr>
              <tr className="bg-red-50/40">
                <td className="px-3 py-1.5 whitespace-nowrap font-medium text-danger">Impostos</td>
                {impostosMes.map((v, i) => <td key={i} className={cn(td, "text-danger")}>{fmt(v)}</td>)}
                <td className={cn(td, "font-bold text-danger")}>{formatMoney(totImpostos)}</td>
              </tr>
              <tr>
                <td className="px-3 py-1.5 whitespace-nowrap text-ink-muted">% imp. s/ NF</td>
                {impostosMes.map((v, i) => (
                  <td key={i} className={cn(td, "text-ink-muted")}>
                    {fatNF[i] > 0 ? `${((v / fatNF[i]) * 100).toFixed(1).replace(".", ",")}%` : "—"}
                  </td>
                ))}
                <td className={cn(td, "font-semibold")}>
                  {pctImpMedio.toFixed(2).replace(".", ",")}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Diárias / VT / VR */}
      <div className="mb-6 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-ink">Diárias, Vale Transporte e Vale Refeição</h2>
          <p className="text-xs text-ink-muted">Quadro da planilha: acumulado mês a mês + médias</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50 text-[10px] uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-3 py-2">Mês</th>
                <th className={th}>Diárias</th>
                <th className={th}>Vale Transp.</th>
                <th className={th}>Vale Refeição</th>
                <th className={cn(th, "font-bold")}>Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MESES_CURTOS.map((m, i) => (
                <tr key={m} className={diariasMes[i] + vtMes[i] + vrMes[i] === 0 ? "text-gray-300" : ""}>
                  <td className="px-3 py-1.5">{m}</td>
                  <td className={td}>{fmt(diariasMes[i])}</td>
                  <td className={td}>{fmt(vtMes[i])}</td>
                  <td className={td}>{fmt(vrMes[i])}</td>
                  <td className={cn(td, "font-semibold text-ink")}>
                    {fmt(r2(diariasMes[i] + vtMes[i] + vrMes[i]))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-ink">
              <tr>
                <td className="px-3 py-2">TOTAL ANO</td>
                <td className={td}>{formatMoney(totDiarias)}</td>
                <td className={td}>{formatMoney(totVT)}</td>
                <td className={td}>{formatMoney(totVR)}</td>
                <td className={cn(td, "font-bold")}>{formatMoney(r2(totDiarias + totVT + totVR))}</td>
              </tr>
              <tr className="text-ink-muted">
                <td className="px-3 py-2">MÉDIAS</td>
                <td className={td}>{formatMoney(mesesComDado ? totDiarias / mesesComDado : 0)}</td>
                <td className={td}>{formatMoney(mesesComDado ? totVT / mesesComDado : 0)}</td>
                <td className={td}>{formatMoney(mesesComDado ? totVR / mesesComDado : 0)}</td>
                <td className={td}>{formatMoney(mesesComDado ? (totDiarias + totVT + totVR) / mesesComDado : 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Despesas por categoria × mês */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-ink">Despesas por categoria × mês</h2>
          <p className="text-xs text-ink-muted">Somente contas pagas, pela competência — ordenado do maior acumulado</p>
        </div>
        {categorias.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink-muted">
            Nenhuma despesa paga em {ano}.
          </p>
        ) : (
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 text-[10px] uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-3 py-2">Despesas</th>
                  {MESES_CURTOS.map((m) => <th key={m} className={th}>{m}</th>)}
                  <th className={cn(th, "font-bold")}>TT ACUMULADO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categorias.map((c) => (
                  <tr key={c.cat} className="hover:bg-gray-50/60">
                    <td className="px-3 py-1.5 whitespace-nowrap font-medium text-ink">{c.cat}</td>
                    {c.meses.map((v, i) => <td key={i} className={cn(td, "text-ink-muted")}>{fmt(v)}</td>)}
                    <td className={cn(td, "font-bold text-ink")}>{formatMoney(c.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 border-t-2 border-gray-200 bg-brand-petrol font-semibold text-white">
                <tr>
                  <td className="px-3 py-2">TOTAL/MÊS</td>
                  {totalMes.map((v, i) => (
                    <td key={i} className={td}>{v === 0 ? "—" : formatMoney(v)}</td>
                  ))}
                  <td className={cn(td, "font-bold")}>{formatMoney(totalDespesas)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
