import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { BillingHistoryForm } from "@/components/finance/BillingHistoryForm";
import { formatMoney, cn } from "@/lib/utils";

/**
 * Tabela ISS Mensal — igual à aba da planilha:
 * faturamento NF mês a mês, saldo acumulado 12 meses e alíquota de ISS
 * pela faixa do Simples Nacional.
 */

const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

// Faixas do Simples Nacional (da planilha): [até, alíquota ISS %]
const FAIXAS_ISS: [number, number][] = [
  [180000, 2.01],
  [360000, 2.79],
  [540000, 3.5],
  [720000, 3.84],
  [900000, 3.87],
  [1080000, 4.23],
  [1260000, 4.26],
  [1440000, 4.31],
  [1620000, 4.61],
  [1800000, 4.65],
  [1980000, 5.0],
];

const aliquotaPara = (saldo12: number) =>
  FAIXAS_ISS.find(([teto]) => saldo12 <= teto)?.[1] ?? 5.0;

const r2 = (n: number) => Math.round(n * 100) / 100;

export default async function TabelaIssPage() {
  const supabase = await createClient();
  const [{ data: manual }, { data: receivables }] = await Promise.all([
    supabase.from("nf_billing_history").select("*"),
    supabase
      .from("receivables")
      .select("amount, emission_date, due_date, document_type, status")
      .neq("status", "cancelado")
      .neq("document_type", "recibo"),
  ]);

  // Faturamento NF calculado do sistema, por ano-mês
  const calculado = new Map<string, number>();
  for (const r of receivables ?? []) {
    const ref = (r.emission_date ?? r.due_date) as string | null;
    if (!ref) continue;
    const key = ref.slice(0, 7); // YYYY-MM
    calculado.set(key, (calculado.get(key) ?? 0) + (Number(r.amount) || 0));
  }

  // Manual (histórico) tem prioridade sobre o calculado
  const manualMap = new Map<string, number>();
  for (const m of manual ?? []) {
    manualMap.set(
      `${m.year}-${String(m.month).padStart(2, "0")}`,
      Number(m.amount) || 0
    );
  }

  // Linha do tempo: do mês mais antigo com dado até dezembro do ano atual
  const agora = new Date();
  const chaves = [...manualMap.keys(), ...calculado.keys()].sort();
  const inicioAno = chaves.length ? Number(chaves[0].slice(0, 4)) : agora.getFullYear();
  const inicioMes = chaves.length ? Number(chaves[0].slice(5, 7)) : 1;

  interface Linha {
    key: string;
    label: string;
    valor: number;
    manual: boolean;
    saldo12: number | null;
    aliquota: number | null;
    atual: boolean;
  }
  const linhas: Linha[] = [];
  const serie: number[] = [];
  for (let y = inicioAno; y <= agora.getFullYear(); y++) {
    const m0 = y === inicioAno ? inicioMes : 1;
    for (let m = m0; m <= 12; m++) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      const isManual = manualMap.has(key);
      const valor = r2(isManual ? manualMap.get(key)! : calculado.get(key) ?? 0);
      serie.push(valor);
      const temJanela = serie.length >= 12;
      const saldo12 = temJanela
        ? r2(serie.slice(-12).reduce((a, b) => a + b, 0))
        : null;
      linhas.push({
        key,
        label: `${MESES_CURTOS[m - 1]}/${String(y).slice(2)}`,
        valor,
        manual: isManual,
        saldo12,
        aliquota: saldo12 !== null ? aliquotaPara(saldo12) : null,
        atual: y === agora.getFullYear() && m === agora.getMonth() + 1,
      });
    }
  }

  const linhaAtual = linhas.find((l) => l.atual);

  return (
    <div>
      <PageHeader
        title="Tabela ISS Mensal"
        description="Faturamento NF, saldo acumulado 12 meses e alíquota de ISS pela faixa do Simples Nacional"
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-brand-petrol p-4 text-white shadow-card">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-300">
            Alíquota ISS atual
          </p>
          <p className="mt-1 text-2xl font-bold text-brand-gold">
            {linhaAtual?.aliquota !== null && linhaAtual?.aliquota !== undefined
              ? `${linhaAtual.aliquota.toFixed(2).replace(".", ",")}%`
              : "—"}
          </p>
          <p className="text-[11px] text-gray-300">
            {linhaAtual?.label ?? ""} · saldo 12 meses{" "}
            {linhaAtual?.saldo12 !== null && linhaAtual?.saldo12 !== undefined
              ? formatMoney(linhaAtual.saldo12)
              : "—"}
          </p>
        </div>
        <div className="sm:col-span-2">
          <BillingHistoryForm />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card lg:col-span-2">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-ink">
              Faturamento × Saldo 12 meses × %ISS
            </h2>
            <p className="text-xs text-ink-muted">
              Meses com ✎ usam valor manual (histórico); os demais são
              calculados das notas do sistema
            </p>
          </div>
          <div className="max-h-[36rem] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5">Mês</th>
                  <th className="px-4 py-2.5 text-right">Faturamento NF</th>
                  <th className="px-4 py-2.5 text-right">Saldo 12 meses</th>
                  <th className="px-4 py-2.5 text-right">%ISS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {linhas.map((l) => (
                  <tr
                    key={l.key}
                    className={cn(
                      "hover:bg-gray-50/60",
                      l.atual && "bg-brand-teal/10 font-semibold"
                    )}
                  >
                    <td className="px-4 py-2 text-ink">
                      {l.label}
                      {l.manual && (
                        <span className="ml-1 text-xs text-ink-muted" title="Valor manual">✎</span>
                      )}
                      {l.atual && (
                        <span className="ml-2 rounded-full bg-brand-teal px-2 py-0.5 text-[10px] font-bold text-white">
                          ATUAL
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-ink">
                      {formatMoney(l.valor)}
                    </td>
                    <td className="px-4 py-2 text-right text-ink-muted">
                      {l.saldo12 !== null ? formatMoney(l.saldo12) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-danger">
                      {l.aliquota !== null
                        ? `${l.aliquota.toFixed(2).replace(".", ",")}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-ink">
              Faixas do Simples Nacional
            </h2>
            <p className="text-xs text-ink-muted">
              Alíquota de ISS pela receita bruta acumulada 12 meses
            </p>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-2.5">De</th>
                <th className="px-4 py-2.5">Até</th>
                <th className="px-4 py-2.5 text-right">%ISS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {FAIXAS_ISS.map(([teto, rate], i) => {
                const de = i === 0 ? 0 : FAIXAS_ISS[i - 1][0] + 0.01;
                const ativa =
                  linhaAtual?.saldo12 !== null &&
                  linhaAtual?.saldo12 !== undefined &&
                  linhaAtual.saldo12 > (i === 0 ? -1 : FAIXAS_ISS[i - 1][0]) &&
                  linhaAtual.saldo12 <= teto;
                return (
                  <tr key={teto} className={cn(ativa && "bg-brand-teal/10 font-semibold")}>
                    <td className="px-4 py-2 text-ink-muted">{formatMoney(de)}</td>
                    <td className="px-4 py-2 text-ink-muted">{formatMoney(teto)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-danger">
                      {rate.toFixed(2).replace(".", ",")}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
