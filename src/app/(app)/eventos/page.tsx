import Link from "next/link";
import { CalendarDays, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteEventButton } from "@/components/forms/DeleteEventButton";
import { serviceTypesLabel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*, clients(name)")
    .order("start_date", { ascending: false, nullsFirst: false });

  return (
    <div>
      <PageHeader
        title="Eventos"
        description="Briefings de eventos e serviços para orçamento"
        actionLabel="Novo evento"
        actionHref="/eventos/novo"
      />

      {!events || events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhum evento cadastrado"
          description="Cadastre o briefing de um evento para depois montar a proposta comercial."
          actionLabel="Cadastrar evento"
          actionHref="/eventos/novo"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Local</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-ink">
                    {event.name}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {(event.clients as { name: string } | null)?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {serviceTypesLabel(event.service_type)}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {event.location_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {formatDate(event.start_date)}
                    {event.end_date && event.end_date !== event.start_date
                      ? ` a ${formatDate(event.end_date)}`
                      : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/eventos/${event.id}/editar`}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-petrol hover:bg-brand-petrol/5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Abrir
                      </Link>
                      <DeleteEventButton
                        eventId={event.id}
                        eventName={event.name}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}