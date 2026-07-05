import Link from "next/link";
import {
  Wallet,
  ListChecks,
  CalendarRange,
  FileSpreadsheet,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { HoursCalculator } from "@/components/finance/HoursCalculator";
import { getDiariasBase, quinzenasDoMes, mesAnoRef } from "@/lib/diarias";
import { MESES } from "@/lib/folha";
import { formatMoney } from "@/lib/utils";

export default async function DiariasPage() {
  const { rows } = await getDiariasBase();

  const aPagarRows = rows.filter((r) =>
    ["confirmado", "compareceu"].includes(r.status)
  );
  const aPagar = aPagarRows.reduce((acc, r) => acc + r.balance_amount, 0);

  // Quinzenas do mês atual (como a lateral da planilha)
  const { mes, ano, inicio, fim } = mesAnoRef({});
  const q = quinzenasDoMes(rows, inicio, fim);
  const dr = q.dr1 + q.dr2;
  const vr = q.vr1 + q.vr2;
  const vt = q.vt1 + q.vt2;
  const mesLabel = `${MESES[mes - 1]}/${ano}`;

  const sections = [
    {
      href: "/diarias/lancamentos",
      title: "Diárias",
      hint: "Todas as diárias agrupadas por funcionário: datas, locais, DR/VR/VT, pagamento em lote e exclusão",
      icon: Wallet,
      tone: "text-brand-petrol bg-brand-petrol/10",
    },
    {
      href: "/diarias/saldo",
      title: "Saldo por colaborador",
      hint: "Uma linha por pessoa com totais, saldo a receber e botão Pagar — como a lateral da planilha",
      icon: ListChecks,
      tone: "text-brand-teal bg-teal-100",
    },
    {
      href: "/diarias/resumo",
      title: "Resumo do mês",
      hint: "DR, VR e VT por quinzena + transporte e refeições avulsos da equipe",
      icon: CalendarRange,
      tone: "text-brand-gold bg-amber-100",
    },
    {
      href: "/diarias/contador",
      title: "Folha do contador",
      hint: "DIÁRIAS REFERENTE AO MÊS — quinzenas e horas, com PDF e envio por e-mail para o Devanir",
      icon: FileSpreadsheet,
      tone: "text-green-700 bg-green-100",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Diárias"
        description="DR, VR, VT, adiantamentos e pagamentos — marcar como pago lança automaticamente no Financeiro"
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title="Diárias a pagar"
          value={formatMoney(aPagar)}
          icon={Wallet}
          hint={`${aPagarRows.length} diária(s) aguardando pagamento`}
          tone="warning"
        />
        <HoursCalculator />
      </div>

      {/* Quinzenas do mês atual — como a lateral da planilha DIARIAS */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-amber-100 p-4 text-amber-900 shadow-card">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide">
            Diárias · {mesLabel}
          </p>
          <div className="grid grid-cols-2 gap-1 text-sm">
            <p className="opacity-75">1ª quinzena</p>
            <p className="text-right font-semibold">{formatMoney(q.dr1)}</p>
            <p className="opacity-75">2ª quinzena</p>
            <p className="text-right font-semibold">{formatMoney(q.dr2)}</p>
            <p className="font-bold">Total do mês</p>
            <p className="text-right font-bold">{formatMoney(dr)}</p>
          </div>
        </div>
        <div className="rounded-xl bg-lime-100 p-4 text-lime-900 shadow-card">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide">
            Vale Refeição (VR) · {mesLabel}
          </p>
          <div className="grid grid-cols-2 gap-1 text-sm">
            <p className="opacity-75">1ª quinzena</p>
            <p className="text-right font-semibold">{formatMoney(q.vr1)}</p>
            <p className="opacity-75">2ª quinzena</p>
            <p className="text-right font-semibold">{formatMoney(q.vr2)}</p>
            <p className="font-bold">Total do mês</p>
            <p className="text-right font-bold">{formatMoney(vr)}</p>
          </div>
        </div>
        <div className="rounded-xl bg-gray-200 p-4 text-gray-800 shadow-card">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide">
            Vale Transporte (VT) · {mesLabel}
          </p>
          <div className="grid grid-cols-2 gap-1 text-sm">
            <p className="opacity-75">1ª quinzena</p>
            <p className="text-right font-semibold">{formatMoney(q.vt1)}</p>
            <p className="opacity-75">2ª quinzena</p>
            <p className="text-right font-semibold">{formatMoney(q.vt2)}</p>
            <p className="font-bold">Total do mês</p>
            <p className="text-right font-bold">{formatMoney(vt)}</p>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-xl bg-brand-petrol p-4 text-white shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide">
            Total Diária + VR + VT · {mesLabel}
          </p>
          <p className="mt-2 text-2xl font-bold text-brand-gold">
            {formatMoney(dr + vr + vt)}
          </p>
          <p className="text-[11px] text-gray-300">
            1ª quinz. {formatMoney(q.dr1 + q.vr1 + q.vt1)} · 2ª quinz.{" "}
            {formatMoney(q.dr2 + q.vr2 + q.vt2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group relative rounded-xl border border-gray-100 bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <ChevronRight className="absolute right-4 top-4 h-5 w-5 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-brand-teal" />
            <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg ${s.tone}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-ink group-hover:text-brand-petrol">
              {s.title}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{s.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
