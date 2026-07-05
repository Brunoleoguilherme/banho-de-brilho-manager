import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { formatMoney, cn } from "@/lib/utils";

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const { ano } = await searchParams;
  const year = Number(ano) || new Date().getFullYear();
  const supabase = await createClient();

  const [
    { data: proposals },
    { data: receivables },
    { data: events },
    { data: historico },
    { data: alocacoes },
  ] = await Promise.all([
    supabase
      .from("proposals")
      .select("*, clients(name), events(name)")
      .eq("year", year),
    supabase.from("receivables").select("client_id, amount, status, received_at"),
    supabase.from("events").select("id, name, start_date"),
    supabase
      .from("historical_proposals")
      .select("year, client_name, total_value, event_date, proposal_date, doc_type, total_al, total_co"),
    supabase
      .from("employee_allocations")
      .select("status, daily_rate, vr_amount, vt_amount, total_amount, employees(full_name), operation_shifts(service_date)"),
  ]);

  // ------- Relatório por cliente -------
  interface ClientReport {
    name: string;
    total: number;
    enviadas: number;
    aprovadas: number;
    valorAprovado: number;
    recebido: number;
  }
  const byClient = new Map<string, ClientReport>();
  const approvedStatuses = ["aprovada", "convertida_contrato", "convertida_os"];
  const sentStatuses = ["enviada", "em_negociacao", ...approvedStatuses, "recusada"];

  for (const p of proposals ?? []) {
    const clientId = p.client_id as string;
    const name = (p.clients as { name: string } | null)?.name ?? "—";
    const report = byClient.get(clientId) ?? {
      name, total: 0, enviadas: 0, aprovadas: 0, valorAprovado: 0, recebido: 0,
    };
    report.total += 1;
    if (sentStatuses.includes(p.status)) report.enviadas += 1;
    if (approvedStatuses.includes(p.status)) {
      report.aprovadas += 1;
      report.valorAprovado += Number(p.total_amount) || 0;
    }
    byClient.set(clientId, report);
  }
  for (const r of receivables ?? []) {
    if (r.status !== "recebido" || !r.client_id) continue;
    if (r.received_at && !r.received_at.startsWith(String(year))) continue;
    const report = byClient.get(r.client_id);
    if (report) report.recebido += Number(r.amount) || 0;
  }
  const clientRows = Array.from(byClient.values()).sort(
    (a, b) => b.valorAprovado - a.valorAprovado
  );

  // ------- Rentabilidade por proposta -------
  const profitRows = (proposals ?? [])
    .filter((p) => approvedStatuses.includes(p.status))
    .map((p) => {
      const total = Number(p.total_amount) || 0;
      const cost = Number(p.total_cost) || 0;
      const taxes = Number(p.taxes) || 0;
      const margin = total - cost - taxes;
      return {
        code: p.code as string,
        client: (p.clients as { name: string } | null)?.name ?? "—",
        event: (p.events as { name: string } | null)?.name ?? "—",
        total, cost, taxes, margin,
        marginPct: total > 0 ? (margin / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.margin - a.margin);

  // ------- Eventos por mês -------
  const eventsByMonth = Array.from({ length: 12 }, () => 0);
  for (const e of events ?? []) {
    if (e.start_date?.startsWith(String(year))) {
      eventsByMonth[Number(e.start_date.slice(5, 7)) - 1] += 1;
    }
  }
  const maxEvents = Math.max(...eventsByMonth, 1);

  // ======= VISÃO HISTÓRICA (propostas importadas do OneDrive + sistema) =======
  const hist = historico ?? [];

  // Ano a ano: propostas, valor total, ticket médio
  const porAno = new Map<number, { qtd: number; valor: number }>();
  for (const h of hist) {
    const a = porAno.get(h.year) ?? { qtd: 0, valor: 0 };
    a.qtd += 1;
    a.valor += Number(h.total_value) || 0;
    porAno.set(h.year, a);
  }
  for (const p of proposals ?? []) {
    const a = porAno.get(year) ?? { qtd: 0, valor: 0 };
    a.qtd += 1;
    a.valor += Number(p.total_amount) || 0;
    porAno.set(year, a);
  }
  const anosHist = Array.from(porAno.entries())
    .map(([a, v]) => ({ ano: a, ...v, ticket: v.qtd ? v.valor / v.qtd : 0 }))
    .sort((x, y) => x.ano - y.ano);
  const maxValorAno = Math.max(...anosHist.map((a) => a.valor), 1);

  // Top clientes de todos os tempos
  const topClientes = new Map<string, { qtd: number; valor: number }>();
  for (const h of hist) {
    const nome = (h.client_name || "—").toUpperCase().trim();
    const c = topClientes.get(nome) ?? { qtd: 0, valor: 0 };
    c.qtd += 1;
    c.valor += Number(h.total_value) || 0;
    topClientes.set(nome, c);
  }
  const topClientesRows = Array.from(topClientes.entries())
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 15);

  // Sazonalidade: valor emitido por mês (todos os anos, pela data do evento)
  const sazonal = Array.from({ length: 12 }, () => 0);
  for (const h of hist) {
    const d = (h.event_date ?? h.proposal_date) as string | null;
    if (d) sazonal[Number(d.slice(5, 7)) - 1] += Number(h.total_value) || 0;
  }
  const maxSazonal = Math.max(...sazonal, 1);

  // NF × Recibo por ano
  const docPorAno = new Map<number, { nf: number; recibo: number }>();
  for (const h of hist) {
    const d = docPorAno.get(h.year) ?? { nf: 0, recibo: 0 };
    if (h.doc_type === "nota_fiscal") d.nf += Number(h.total_value) || 0;
    if (h.doc_type === "recibo") d.recibo += Number(h.total_value) || 0;
    docPorAno.set(h.year, d);
  }
  const docRows = Array.from(docPorAno.entries())
    .map(([a, v]) => ({ ano: a, ...v }))
    .sort((x, y) => x.ano - y.ano);

  // Demanda de agentes (diárias de AL previstas) por mês do ano selecionado
  const alPorMes = Array.from({ length: 12 }, () => 0);
  for (const h of hist) {
    if (!h.event_date || Number(String(h.event_date).slice(0, 4)) !== year) continue;
    alPorMes[Number(String(h.event_date).slice(5, 7)) - 1] += Number(h.total_al) || 0;
  }
  const maxAl = Math.max(...alPorMes, 1);

  // Ranking de funcionários por diárias no ano (escala real do sistema)
  const porFuncionario = new Map<string, { diarias: number; valor: number }>();
  for (const a of alocacoes ?? []) {
    const sd = (a.operation_shifts as { service_date: string } | null)?.service_date;
    if (!sd || Number(sd.slice(0, 4)) !== year) continue;
    if (!["confirmado", "compareceu", "pago"].includes(a.status)) continue;
    const nome = (a.employees as { full_name: string } | null)?.full_name ?? "—";
    const f = porFuncionario.get(nome) ?? { diarias: 0, valor: 0 };
    f.diarias += 1;
    f.valor += Number(a.total_amount) || 0;
    porFuncionario.set(nome, f);
  }
  const rankingFunc = Array.from(porFuncionario.entries())
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => b.diarias - a.diarias)
    .slice(0, 15);

  // ------- Taxa de conversão -------
  const totalEnviadas = (proposals ?? []).filter((p) =>
    sentStatuses.includes(p.status)
  ).length;
  const totalAprovadas = (proposals ?? []).filter((p) =>
    approvedStatuses.includes(p.status)
  ).length;
  const conversao =
    totalEnviadas > 0 ? ((totalAprovadas / totalEnviadas) * 100).toFixed(0) : "—";

  return (
    <div>
      <PageHeader
        title={`Relatórios ${year}`}
        description={`${(proposals ?? []).length} propostas no ano · Taxa de conversão: ${conversao}${conversao !== "—" ? "%" : ""}`}
      >
        <form method="get" className="flex items-center gap-2">
          <select name="ano" defaultValue={year} className="input-base w-auto">
            {Array.from(
              new Set([
                ...anosHist.map((a) => a.ano),
                new Date().getFullYear(),
                year,
              ])
            )
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
      </PageHeader>

      <div className="space-y-6">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">
              Desempenho por cliente
            </h2>
            <ExportCsvButton
              filename={`relatorio-clientes-${year}`}
              headers={["Cliente", "Propostas", "Enviadas", "Aprovadas", "Valor aprovado", "Recebido"]}
              rows={clientRows.map((c) => [
                c.name, c.total, c.enviadas, c.aprovadas,
                c.valorAprovado.toFixed(2).replace(".", ","),
                c.recebido.toFixed(2).replace(".", ","),
              ])}
            />
          </div>
          {clientRows.length === 0 ? (
            <p className="text-sm text-ink-muted">Sem propostas em {year}.</p>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="pb-2">Cliente</th>
                  <th className="pb-2 text-center">Propostas</th>
                  <th className="pb-2 text-center">Aprovadas</th>
                  <th className="pb-2 text-right">Valor aprovado</th>
                  <th className="pb-2 text-right">Recebido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientRows.map((c) => (
                  <tr key={c.name}>
                    <td className="py-2.5 font-medium text-ink">{c.name}</td>
                    <td className="py-2.5 text-center text-ink-muted">{c.total}</td>
                    <td className="py-2.5 text-center text-ink-muted">{c.aprovadas}</td>
                    <td className="py-2.5 text-right font-medium text-ink">
                      {formatMoney(c.valorAprovado)}
                    </td>
                    <td className="py-2.5 text-right text-success">
                      {formatMoney(c.recebido)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">
              Rentabilidade por proposta aprovada
            </h2>
            <ExportCsvButton
              filename={`rentabilidade-${year}`}
              headers={["Proposta", "Cliente", "Evento", "Valor", "Custo", "Impostos", "Margem", "Margem %"]}
              rows={profitRows.map((p) => [
                p.code, p.client, p.event,
                p.total.toFixed(2).replace(".", ","),
                p.cost.toFixed(2).replace(".", ","),
                p.taxes.toFixed(2).replace(".", ","),
                p.margin.toFixed(2).replace(".", ","),
                p.marginPct.toFixed(1).replace(".", ",") + "%",
              ])}
            />
          </div>
          {profitRows.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Nenhuma proposta aprovada em {year}.
            </p>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="pb-2">Proposta</th>
                  <th className="pb-2">Cliente / Evento</th>
                  <th className="pb-2 text-right">Valor</th>
                  <th className="pb-2 text-right">Custo</th>
                  <th className="pb-2 text-right">Impostos</th>
                  <th className="pb-2 text-right">Margem</th>
                  <th className="pb-2 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {profitRows.map((p) => (
                  <tr key={p.code}>
                    <td className="py-2.5 font-semibold text-brand-petrol">{p.code}</td>
                    <td className="py-2.5">
                      <p className="text-ink">{p.client}</p>
                      <p className="text-xs text-ink-muted">{p.event}</p>
                    </td>
                    <td className="py-2.5 text-right text-ink">{formatMoney(p.total)}</td>
                    <td className="py-2.5 text-right text-ink-muted">{formatMoney(p.cost)}</td>
                    <td className="py-2.5 text-right text-ink-muted">{formatMoney(p.taxes)}</td>
                    <td
                      className={cn(
                        "py-2.5 text-right font-medium",
                        p.margin >= 0 ? "text-success" : "text-danger"
                      )}
                    >
                      {formatMoney(p.margin)}
                    </td>
                    <td className="py-2.5 text-right text-ink-muted">
                      {p.marginPct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-ink">
            Eventos por mês
          </h2>
          <div className="flex items-end gap-2" style={{ height: 140 }}>
            {eventsByMonth.map((count, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span className="text-xs font-medium text-ink">{count || ""}</span>
                <div
                  className="w-full rounded-t bg-brand-teal/80"
                  style={{ height: `${(count / maxEvents) * 100}px` }}
                />
                <span className="text-[10px] text-ink-muted">{MONTH_NAMES[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ================= VISÃO HISTÓRICA (2022 em diante) ================= */}
        {anosHist.length > 0 && (
          <>
            <div className="pt-4">
              <h2 className="text-lg font-bold text-ink">
                Visão histórica — todos os anos
              </h2>
              <p className="text-sm text-ink-muted">
                Calculada com as {hist.length} propostas importadas do OneDrive +
                as do sistema
              </p>
            </div>

            {/* Ano a ano */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink">
                  Propostas emitidas ano a ano
                </h2>
                <ExportCsvButton
                  filename="historico-ano-a-ano"
                  headers={["Ano", "Propostas", "Valor emitido", "Ticket médio"]}
                  rows={anosHist.map((a) => [
                    a.ano, a.qtd,
                    a.valor.toFixed(2).replace(".", ","),
                    a.ticket.toFixed(2).replace(".", ","),
                  ])}
                />
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="pb-2">Ano</th>
                      <th className="pb-2 text-center">Propostas</th>
                      <th className="pb-2 text-right">Valor emitido</th>
                      <th className="pb-2 text-right">Ticket médio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {anosHist.map((a) => (
                      <tr key={a.ano} className={a.ano === year ? "bg-brand-teal/10 font-semibold" : ""}>
                        <td className="py-2.5 font-semibold text-brand-petrol">{a.ano}</td>
                        <td className="py-2.5 text-center text-ink">{a.qtd}</td>
                        <td className="py-2.5 text-right font-medium text-ink">{formatMoney(a.valor)}</td>
                        <td className="py-2.5 text-right text-ink-muted">{formatMoney(a.ticket)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
                <div className="flex items-end gap-3" style={{ height: 160 }}>
                  {anosHist.map((a) => (
                    <div key={a.ano} className="flex flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-[10px] font-medium text-ink-muted">
                        {formatMoney(a.valor)}
                      </span>
                      <div
                        className="w-full rounded-t bg-brand-petrol/80"
                        style={{ height: `${(a.valor / maxValorAno) * 110}px` }}
                      />
                      <span className="text-xs font-semibold text-ink">{a.ano}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top clientes */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink">
                  Top 15 clientes de todos os tempos
                </h2>
                <ExportCsvButton
                  filename="top-clientes-historico"
                  headers={["Cliente", "Propostas", "Valor emitido"]}
                  rows={topClientesRows.map((c) => [
                    c.nome, c.qtd, c.valor.toFixed(2).replace(".", ","),
                  ])}
                />
              </div>
              <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="pb-2">#</th>
                    <th className="pb-2">Cliente</th>
                    <th className="pb-2 text-center">Propostas</th>
                    <th className="pb-2 text-right">Valor emitido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topClientesRows.map((c, i) => (
                    <tr key={c.nome}>
                      <td className="py-2.5 font-bold text-brand-teal">{i + 1}º</td>
                      <td className="py-2.5 font-medium text-ink">{c.nome}</td>
                      <td className="py-2.5 text-center text-ink-muted">{c.qtd}</td>
                      <td className="py-2.5 text-right font-medium text-ink">{formatMoney(c.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>

            {/* Sazonalidade + demanda de agentes */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
                <h2 className="mb-1 text-base font-semibold text-ink">
                  Sazonalidade — valor por mês
                </h2>
                <p className="mb-4 text-xs text-ink-muted">
                  Soma de todos os anos, pela data do evento — mostra os meses fortes
                </p>
                <div className="flex items-end gap-1.5" style={{ height: 140 }}>
                  {sazonal.map((v, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                      <div
                        className="w-full rounded-t bg-brand-teal/80"
                        style={{ height: `${(v / maxSazonal) * 100}px` }}
                        title={formatMoney(v)}
                      />
                      <span className="text-[10px] text-ink-muted">{MONTH_NAMES[i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
                <h2 className="mb-1 text-base font-semibold text-ink">
                  Demanda de agentes (AL) em {year}
                </h2>
                <p className="mb-4 text-xs text-ink-muted">
                  Diárias de Agente de Limpeza previstas nos cronogramas das propostas
                </p>
                <div className="flex items-end gap-1.5" style={{ height: 140 }}>
                  {alPorMes.map((v, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-[10px] font-medium text-ink">{v || ""}</span>
                      <div
                        className="w-full rounded-t bg-brand-petrol/70"
                        style={{ height: `${(v / maxAl) * 95}px` }}
                      />
                      <span className="text-[10px] text-ink-muted">{MONTH_NAMES[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* NF × Recibo + ranking de funcionários */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
                <h2 className="mb-4 text-base font-semibold text-ink">
                  Nota Fiscal × Recibo por ano
                </h2>
                <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="pb-2">Ano</th>
                      <th className="pb-2 text-right">Nota Fiscal</th>
                      <th className="pb-2 text-right">Recibo</th>
                      <th className="pb-2 text-right">% NF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {docRows.map((d) => (
                      <tr key={d.ano}>
                        <td className="py-2.5 font-semibold text-brand-petrol">{d.ano}</td>
                        <td className="py-2.5 text-right text-ink">{formatMoney(d.nf)}</td>
                        <td className="py-2.5 text-right text-ink-muted">{formatMoney(d.recibo)}</td>
                        <td className="py-2.5 text-right text-ink-muted">
                          {d.nf + d.recibo > 0
                            ? `${((d.nf / (d.nf + d.recibo)) * 100).toFixed(0)}%`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
                <p className="mt-3 text-[11px] text-ink-muted">
                  Considera só propostas em que o documento (NF/Recibo) foi
                  identificado no texto original.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-ink">
                    Funcionários com mais diárias em {year}
                  </h2>
                  <ExportCsvButton
                    filename={`ranking-funcionarios-${year}`}
                    headers={["Funcionário", "Diárias", "Valor"]}
                    rows={rankingFunc.map((f) => [
                      f.nome, f.diarias, f.valor.toFixed(2).replace(".", ","),
                    ])}
                  />
                </div>
                {rankingFunc.length === 0 ? (
                  <p className="text-sm text-ink-muted">
                    Sem diárias confirmadas em {year}.
                  </p>
                ) : (
                  <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="pb-2">#</th>
                        <th className="pb-2">Funcionário</th>
                        <th className="pb-2 text-center">Diárias</th>
                        <th className="pb-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rankingFunc.map((f, i) => (
                        <tr key={f.nome}>
                          <td className="py-2.5 font-bold text-brand-teal">{i + 1}º</td>
                          <td className="py-2.5 font-medium text-ink">{f.nome}</td>
                          <td className="py-2.5 text-center text-ink-muted">{f.diarias}</td>
                          <td className="py-2.5 text-right font-medium text-ink">{formatMoney(f.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
