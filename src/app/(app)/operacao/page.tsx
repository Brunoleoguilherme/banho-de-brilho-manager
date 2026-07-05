import Link from "next/link";
import { ClipboardList, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteOsButton } from "@/components/operations/DeleteOsButton";
import { formatDate } from "@/lib/utils";

export default async function OperationsPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("operation_orders")
    .select("*, clients(name), events(name, start_date)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Operação"
        description="Ordens de serviço das propostas aprovadas"
      />

      {!orders || orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma ordem de serviço"
          description="Quando uma proposta for aprovada, a OS é criada automaticamente com turnos e checklist."
          actionLabel="Ver propostas"
          actionHref="/propostas"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">OS</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((os) => {
                const event = os.events as {
                  name: string;
                  start_date: string | null;
                } | null;
                return (
                  <tr key={os.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-semibold text-brand-petrol">
                      {os.code}
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {(os.clients as { name: string } | null)?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {event?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {formatDate(event?.start_date)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={os.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/operacao/${os.id}`}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-petrol hover:bg-brand-petrol/5"
                        >
                          Abrir
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                        <DeleteOsButton
                          osId={os.id}
                          osCode={os.code}
                          clientName={
                            (os.clients as { name: string } | null)?.name ?? "—"
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
