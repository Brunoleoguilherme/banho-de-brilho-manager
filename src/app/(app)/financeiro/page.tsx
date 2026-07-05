import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Wallet,
  ChevronRight,
  AlertTriangle,
  CalendarClock,
  Calculator,
  Database,
  ReceiptText,
  Percent,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatMoney, cn } from "@/lib/utils";

export default async function FinancePage() {
  const supabase = await createClient();

  const year = new Date().getFullYear();
  const [
    { data: receivables },
    { data: payables },
    { data: pendingDiarias },
    { data: paidWithInterest },
  ] = await Promise.all([
    supabase
      .from("receivables")
      .select("amount, status")
      .in("status", ["pendente", "atrasado"]),
    supabase
      .from("payables")
      .select("amount, status")
      .in("status", ["pendente", "atrasado"]),
    supabase
      .from("employee_allocations")
      .select("balance_amount")
      .neq("status", "pago")
      .in("status", ["confirmado", "compareceu"]),
    supabase
      .from("payables")
      .select("interest_amount, paid_at")
      .eq("status", "pago")
      .gt("interest_amount", 0)
      .gte("paid_at", `${year}-01-01`)
      .lte("paid_at", `${year}-12-31`),
  ]);

  const totalReceber = (receivables ?? []).reduce(
    (acc, r) => acc + (Number(r.amount) || 0),
    0
  );
  const totalPagar = (payables ?? []).reduce(
    (acc, p) => acc + (Number(p.amount) || 0),
    0
  );
  const totalDiarias = (pendingDiarias ?? []).reduce(
    (acc, d) => acc + (Number(d.balance_amount) || 0),
    0
  );
  const jurosAcumulados = (paidWithInterest ?? []).reduce(
    (acc, p) => acc + (Number(p.interest_amount) || 0),
    0
  );
  const diasCorridos =
    Math.floor(
      (Date.now() - new Date(year, 0, 1).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
  const jurosDiarios = diasCorridos > 0 ? jurosAcumulados / diasCorridos : 0;

  const resumo: {
    label: string;
    value: string;
    hint: string;
    href?: string;
    icon: LucideIcon;
    tone: string;
    valueTone?: string;
  }[] = [
    {
      label: "Contas a receber",
      value: formatMoney(totalReceber),
      hint: `${(receivables ?? []).length} em aberto`,
      href: "/financeiro/receber",
      icon: TrendingUp,
      tone: "bg-green-100 text-success",
      valueTone: "text-success",
    },
    {
      label: "Contas a pagar",
      value: formatMoney(totalPagar),
      hint: `${(payables ?? []).length} em aberto`,
      href: "/financeiro/pagar",
      icon: TrendingDown,
      tone: "bg-red-100 text-danger",
      valueTone: "text-danger",
    },
    {
      label: "Diárias a pagar",
      value: formatMoney(totalDiarias),
      hint: `${(pendingDiarias ?? []).length} confirmadas não pagas`,
      href: "/diarias",
      icon: Wallet,
      tone: "bg-amber-100 text-warning",
    },
    {
      label: `Juros e encargos ${year}`,
      value: formatMoney(jurosAcumulados),
      hint: "Pagos por atraso — quanto menor, melhor",
      icon: AlertTriangle,
      tone: "bg-red-100 text-danger",
      valueTone: "text-danger",
    },
    {
      label: "Juros e encargos diários",
      value: formatMoney(jurosDiarios),
      hint: "Média por dia corrido do ano",
      icon: TrendingDown,
      tone: "bg-amber-100 text-warning",
    },
    {
      label: "Dias corridos",
      value: String(diasCorridos),
      hint: `Desde 1º de janeiro de ${year}`,
      icon: CalendarClock,
      tone: "bg-brand-petrol/10 text-brand-petrol",
    },
  ];

  const sections = [
    {
      href: "/financeiro/fluxo-caixa",
      title: "Fluxo de caixa",
      hint: "Consolidação mensal, despesas por categoria e receitas por cliente",
      icon: BarChart3,
      tone: "text-brand-petrol bg-brand-petrol/10",
    },
    {
      href: "/financeiro/custo-evento",
      title: "Custo do Evento",
      hint: "Apuração de custos e lucro por proposta aprovada — igual à planilha CUSTO EVENTO",
      icon: Calculator,
      tone: "text-brand-teal bg-teal-100",
    },
    {
      href: "/financeiro/dados",
      title: "Dados",
      hint: "Despesas por categoria × mês, faturamento NF × Recibo, impostos e Diárias/VT/VR — igual à aba Dados",
      icon: Database,
      tone: "text-brand-gold bg-amber-100",
    },
    {
      href: "/financeiro/controle-nfs",
      title: "Controle NFs e Recibos",
      hint: "Emissão, retenções ISS/INSS, valor líquido e recebimentos — igual à planilha",
      icon: ReceiptText,
      tone: "text-green-700 bg-green-100",
    },
    {
      href: "/financeiro/tabela-iss",
      title: "Tabela ISS Mensal",
      hint: "Faturamento NF, saldo 12 meses e alíquota de ISS pela faixa do Simples",
      icon: Percent,
      tone: "text-danger bg-red-100",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Visão geral de recebíveis, despesas e fluxo de caixa"
      />

      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-ink">
          Resumo financeiro
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumo.map((item) => {
            const content = (
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    item.tone
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-muted">
                    {item.label}
                  </p>
                  <p
                    className={cn(
                      "text-xl font-bold",
                      item.valueTone ?? "text-ink"
                    )}
                  >
                    {item.value}
                  </p>
                  <p className="text-xs text-ink-muted">{item.hint}</p>
                </div>
              </div>
            );
            return item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-lg p-2 transition hover:bg-surface"
              >
                {content}
              </Link>
            ) : (
              <div key={item.label} className="p-2">
                {content}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-xl border border-gray-100 bg-white p-6 shadow-card transition hover:border-brand-teal/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <div
                  className={cn(
                    "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg",
                    s.tone
                  )}
                >
                  <s.icon className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold text-ink group-hover:text-brand-petrol">
                  {s.title}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">{s.hint}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 transition group-hover:text-brand-petrol" />
            </div>
          </Link>
        ))}

      </div>
    </div>
  );
}
