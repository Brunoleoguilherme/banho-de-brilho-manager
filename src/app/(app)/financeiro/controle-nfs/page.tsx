import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  NfControlTable,
  IssRatesCard,
  type NfRow,
} from "@/components/finance/NfControlTable";
import { formatMoney } from "@/lib/utils";

/** Controle de Notas Fiscais e Recibos — igual à aba da planilha */
export default async function ControleNfsPage({
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
  const [{ data: receivables }, { data: issRates }] = await Promise.all([
    supabase
      .from("receivables")
      .select("*, clients(name), proposals(code)")
      .neq("status", "cancelado")
      .order("emission_date", { ascending: true, nullsFirst: false })
      .order("due_date", { ascending: true }),
    supabase.from("iss_rates").select("month, rate").eq("year", ano).order("month"),
  ]);

  const rows: NfRow[] = (receivables ?? [])
    .filter((r) => {
      const ref = (r.emission_date ?? r.due_date) as string | null;
      return ref ? Number(ref.slice(0, 4)) === ano : true;
    })
    .map((r) => ({
      id: r.id,
      emission_date: r.emission_date ?? null,
      document_type: r.document_type ?? "nota_fiscal",
      invoice_number: r.invoice_number ?? null,
      proposal_code: (r.proposals as { code: string } | null)?.code ?? null,
      received_at: r.received_at ?? null,
      client_name: (r.clients as { name: string } | null)?.name ?? "",
      description: r.description ?? "",
      amount: Number(r.amount) || 0,
      iss_amount: Number(r.iss_amount) || 0,
      inss_amount: Number(r.inss_amount) || 0,
      received_amount:
        r.received_amount !== null && r.received_amount !== undefined
          ? Number(r.received_amount)
          : null,
      status: r.status,
    }));

  const liquido = (r: NfRow) => r.amount - r.iss_amount - r.inss_amount;
  const nf = rows.filter((r) => r.document_type !== "recibo");
  const recibos = rows.filter((r) => r.document_type === "recibo");
  const abertoNF = nf
    .filter((r) => r.status !== "recebido")
    .reduce((a, r) => a + liquido(r), 0);
  const abertoRecibo = recibos
    .filter((r) => r.status !== "recebido")
    .reduce((a, r) => a + liquido(r), 0);
  const totNF = nf.reduce((a, r) => a + r.amount, 0);
  const totRecibo = recibos.reduce((a, r) => a + r.amount, 0);
  const totRetido = rows.reduce((a, r) => a + r.iss_amount + r.inss_amount, 0);

  const rates = Array.from({ length: 12 }, (_, i) => {
    const found = (issRates ?? []).find((r) => r.month === i + 1);
    return found ? Number(found.rate) : 0;
  });

  const cards = [
    { title: "Notas Fiscais", value: formatMoney(totNF), hint: `${nf.length} emitida(s)` },
    { title: "Recibos", value: formatMoney(totRecibo), hint: `${recibos.length} emitido(s)` },
    { title: "ISS + INSS retidos", value: formatMoney(totRetido), hint: "Somados no ano" },
    { title: "NF em aberto", value: formatMoney(abertoNF), hint: "A receber (líquido)" },
    { title: "Recibo em aberto", value: formatMoney(abertoRecibo), hint: "A receber (líquido)" },
  ];

  return (
    <div>
      <PageHeader
        title={`Controle de Notas Fiscais e Recibos ${ano}`}
        description="Emissão, retenções (ISS/INSS), valor líquido e recebimentos — igual à planilha"
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

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.title} className="rounded-xl border border-gray-100 bg-white p-4 shadow-card">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{c.title}</p>
            <p className="mt-1 text-xl font-bold text-ink">{c.value}</p>
            <p className="text-[11px] text-ink-muted">{c.hint}</p>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <IssRatesCard year={ano} rates={rates} />
      </div>

      <NfControlTable rows={rows} />
    </div>
  );
}
