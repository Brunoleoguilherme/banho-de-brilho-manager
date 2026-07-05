import Link from "next/link";
import { Calculator } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { CostSettingsBar } from "@/components/finance/CostSettingsBar";
import { formatMoney, cn } from "@/lib/utils";

// Valores padrão caso os parâmetros ainda não existam no banco (médias 2025)
const DEFAULTS: Record<string, number> = {
  custo_fixo_pct: 21.79,
  encargos_pct: 12.9,
  diversos_pct: 4.0,
};

const TEAM_CATEGORIES = [
  "Agente de limpeza",
  "Coordenador",
  "Vale-refeição",
  "Vale-transporte",
];

export default async function EventCostPage() {
  const supabase = await createClient();

  const [{ data: proposals }, { data: items }, { data: settings }] = await Promise.all([
    supabase
      .from("proposals")
      .select("id, code, status, total_nf, total_receipt, total_amount, clients(name), events(name)")
      .in("status", ["aprovada", "convertida_contrato", "convertida_os"])
      .order("year", { ascending: false })
      .order("number", { ascending: false }),
    supabase
      .from("proposal_items")
      .select("proposal_id, category, total_price, is_internal_cost"),
    supabase.from("app_settings").select("key, value"),
  ]);

  const pct = (key: string): number => {
    const found = (settings ?? []).find((s) => s.key === key);
    return found ? Number(found.value) : DEFAULTS[key];
  };
  const CUSTO_FIXO_PCT = pct("custo_fixo_pct");
  const ENCARGOS_PCT = pct("encargos_pct");
  const DIVERSOS_PCT = pct("diversos_pct");

  const rows = (proposals ?? []).map((p) => {
    const pItems = (items ?? []).filter(
      (i) => i.proposal_id === p.id && i.is_internal_cost
    );
    const drVrVt = pItems
      .filter((i) => TEAM_CATEGORIES.includes(i.category))
      .reduce((acc, i) => acc + (Number(i.total_price) || 0), 0);
    const custoDireto = pItems
      .filter((i) => !TEAM_CATEGORIES.includes(i.category))
      .reduce((acc, i) => acc + (Number(i.total_price) || 0), 0);

    const nf = Number(p.total_nf) || Number(p.total_amount) || 0;
    const rc = Number(p.total_receipt) || Number(p.total_amount) || 0;

    const custoFixo = (nf * CUSTO_FIXO_PCT) / 100;
    const encargos = (nf * ENCARGOS_PCT) / 100;
    const diversos = (nf * DIVERSOS_PCT) / 100;
    const custosTotais = custoFixo + encargos + diversos + drVrVt + custoDireto;

    const lucroNf = nf - custosTotais;
    const lucroRc = rc - (custoFixo + encargos + diversos + drVrVt + custoDireto);

    return {
      id: p.id,
      code: p.code as string,
      client: (p.clients as { name: string } | null)?.name ?? "—",
      event: (p.events as { name: string } | null)?.name ?? "—",
      nf, rc, custoFixo, encargos, diversos, drVrVt, custoDireto,
      lucroNf,
      lucroNfPct: nf > 0 ? (lucroNf / nf) * 100 : 0,
      lucroRc,
      lucroRcPct: rc > 0 ? (lucroRc / rc) * 100 : 0,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      nf: acc.nf + r.nf,
      drVrVt: acc.drVrVt + r.drVrVt,
      custoDireto: acc.custoDireto + r.custoDireto,
      lucroNf: acc.lucroNf + r.lucroNf,
    }),
    { nf: 0, drVrVt: 0, custoDireto: 0, lucroNf: 0 }
  );

  return (
    <div>
      <PageHeader
        title="Custo do Evento"
        description="Apuração automática por proposta aprovada — ajuste os percentuais abaixo e a tabela recalcula"
      >
        <ExportCsvButton
          filename={`custo-evento-${new Date().toISOString().slice(0, 10)}`}
          headers={[
            "Proposta", "Cliente", "Evento", "Contrato NF", "Contrato Recibo",
            "Custo Fixo", "Encargos", "Diversos", "DR/VR/VT", "Custo Direto",
            "Lucro NF", "Lucro NF %", "Lucro Recibo", "Lucro Recibo %",
          ]}
          rows={rows.map((r) => [
            r.code, r.client, r.event,
            r.nf.toFixed(2).replace(".", ","),
            r.rc.toFixed(2).replace(".", ","),
            r.custoFixo.toFixed(2).replace(".", ","),
            r.encargos.toFixed(2).replace(".", ","),
            r.diversos.toFixed(2).replace(".", ","),
            r.drVrVt.toFixed(2).replace(".", ","),
            r.custoDireto.toFixed(2).replace(".", ","),
            r.lucroNf.toFixed(2).replace(".", ","),
            r.lucroNfPct.toFixed(1).replace(".", ",") + "%",
            r.lucroRc.toFixed(2).replace(".", ","),
            r.lucroRcPct.toFixed(1).replace(".", ",") + "%",
          ])}
        />
      </PageHeader>

      <CostSettingsBar
        custoFixo={CUSTO_FIXO_PCT}
        encargos={ENCARGOS_PCT}
        diversos={DIVERSOS_PCT}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Calculator}
          title="Nenhuma proposta aprovada ainda"
          description="Quando uma proposta for aprovada, a apuração de custo e lucro do evento aparece aqui automaticamente, igual à planilha CUSTO EVENTO."
          actionLabel="Ver propostas"
          actionHref="/propostas"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-3 py-3">Proposta</th>
                <th className="px-3 py-3">Cliente / Evento</th>
                <th className="px-3 py-3 text-right">Contrato NF</th>
                <th className="px-3 py-3 text-right">Contrato RC</th>
                <th className="px-3 py-3 text-right">Custo fixo ({CUSTO_FIXO_PCT}%)</th>
                <th className="px-3 py-3 text-right">Encargos ({ENCARGOS_PCT}%)</th>
                <th className="px-3 py-3 text-right">Diversos ({DIVERSOS_PCT}%)</th>
                <th className="px-3 py-3 text-right">DR/VR/VT</th>
                <th className="px-3 py-3 text-right">Custo direto</th>
                <th className="px-3 py-3 text-right">Lucro NF</th>
                <th className="px-3 py-3 text-right">Lucro RC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/60">
                  <td className="px-3 py-3">
                    <Link
                      href={`/propostas/${r.id}`}
                      className="font-semibold text-brand-petrol hover:underline"
                    >
                      {r.code}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-ink">{r.client}</p>
                    <p className="text-xs text-ink-muted">{r.event}</p>
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-ink">
                    {formatMoney(r.nf)}
                  </td>
                  <td className="px-3 py-3 text-right text-ink-muted">
                    {formatMoney(r.rc)}
                  </td>
                  <td className="px-3 py-3 text-right text-ink-muted">
                    {formatMoney(r.custoFixo)}
                  </td>
                  <td className="px-3 py-3 text-right text-ink-muted">
                    {formatMoney(r.encargos)}
                  </td>
                  <td className="px-3 py-3 text-right text-ink-muted">
                    {formatMoney(r.diversos)}
                  </td>
                  <td className="px-3 py-3 text-right text-ink-muted">
                    {formatMoney(r.drVrVt)}
                  </td>
                  <td className="px-3 py-3 text-right text-ink-muted">
                    {formatMoney(r.custoDireto)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-3 text-right font-semibold",
                      r.lucroNf >= 0 ? "text-success" : "text-danger"
                    )}
                  >
                    {formatMoney(r.lucroNf)}
                    <span className="block text-[10px] font-normal text-ink-muted">
                      {r.lucroNfPct.toFixed(1)}%
                    </span>
                  </td>
                  <td
                    className={cn(
                      "px-3 py-3 text-right font-semibold",
                      r.lucroRc >= 0 ? "text-success" : "text-danger"
                    )}
                  >
                    {formatMoney(r.lucroRc)}
                    <span className="block text-[10px] font-normal text-ink-muted">
                      {r.lucroRcPct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-ink">
              <tr>
                <td colSpan={2} className="px-3 py-3">
                  Totais ({rows.length} proposta(s))
                </td>
                <td className="px-3 py-3 text-right">{formatMoney(totals.nf)}</td>
                <td colSpan={4} />
                <td className="px-3 py-3 text-right">{formatMoney(totals.drVrVt)}</td>
                <td className="px-3 py-3 text-right">{formatMoney(totals.custoDireto)}</td>
                <td
                  className={cn(
                    "px-3 py-3 text-right",
                    totals.lucroNf >= 0 ? "text-success" : "text-danger"
                  )}
                >
                  {formatMoney(totals.lucroNf)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
