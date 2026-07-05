import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  ReceivablesTable,
  type ReceivableRow,
} from "@/components/finance/ReceivablesTable";

export default async function ReceivablesPage() {
  const supabase = await createClient();

  const [{ data: receivables }, { data: clients }] = await Promise.all([
    supabase
      .from("receivables")
      .select("*, clients(name)")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("clients").select("id, name").order("name"),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const rows: ReceivableRow[] = (receivables ?? []).map((r) => ({
    id: r.id,
    client_id: r.client_id ?? null,
    client_name: (r.clients as { name: string } | null)?.name ?? "—",
    description: r.description,
    amount: Number(r.amount) || 0,
    due_date: r.due_date,
    received_at: r.received_at,
    status:
      r.status === "pendente" && r.due_date && r.due_date < today
        ? "atrasado"
        : r.status,
    document_type: r.document_type,
    payment_method: r.payment_method,
  }));

  return (
    <div>
      <PageHeader
        title="Contas a receber"
        description="Recebíveis gerados das propostas aprovadas + lançamentos manuais"
      />
      <ReceivablesTable rows={rows} clients={clients ?? []} />
    </div>
  );
}
