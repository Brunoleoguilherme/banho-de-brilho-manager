import { PageHeader } from "@/components/layout/PageHeader";
import { FolhaContador } from "@/components/finance/FolhaContador";
import { getFolhaData, MESES } from "@/lib/folha";
import { mesAnoRef } from "@/lib/diarias";

export default async function DiariasContadorPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const params = await searchParams;
  const { mes, ano } = mesAnoRef(params);
  const agora = new Date();
  const folha = await getFolhaData(mes, ano);

  return (
    <div>
      <PageHeader
        title="Folha do contador"
        description="DIÁRIAS REFERENTE AO MÊS — quinzenas, horas, proventos e encargos, com PDF e envio por e-mail"
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Mês</label>
          <select name="mes" defaultValue={String(mes)} className="input-base w-auto">
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m.charAt(0) + m.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Ano</label>
          <select name="ano" defaultValue={String(ano)} className="input-base w-auto">
            {Array.from({ length: 7 }, (_, i) => agora.getFullYear() - 5 + i).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-brand-petrol px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
          Ver mês
        </button>
      </form>

      <FolhaContador data={folha} />
    </div>
  );
}
