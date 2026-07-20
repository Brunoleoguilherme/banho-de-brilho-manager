import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  PayablesTable,
  type PayableRow,
} from "@/components/finance/PayablesTable";

export default async function PayablesPage() {
  const supabase = await createClient();

  const { data: payables } = await supabase
    .from("payables")
    .select("*")
    .order("due_date", { ascending: false, nullsFirst: false });

  const today = new Date().toISOString().slice(0, 10);
  const rows: PayableRow[] = (payables ?? []).map((p) => ({
    id: p.id,
    category: p.category,
    description: p.description,
    amount: Number(p.amount) || 0,
    interest_amount: Number(p.interest_amount) || 0,
    due_date: p.due_date,
    paid_at: p.paid_at,
    status:
      p.status === "pendente" && p.due_date && p.due_date < today
        ? "atrasado"
        : p.status,
    competence_month: p.competence_month,
    competence_year: p.competence_year,
    payment_method: p.payment_method ?? "",
  }));

  return (
    <div>
      <PageHeader
        title="Contas a pagar"
        description="Despesas por categoria — mesmas categorias do fluxo de caixa atual"
      />
      <PayablesTable rows={rows} />
    </div>
  );
}
