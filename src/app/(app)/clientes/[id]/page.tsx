import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Pencil,
  Mail,
  Phone,
  MapPin,
  FileText,
  CalendarDays,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactsCard } from "@/components/forms/ContactsCard";
import { serviceTypesLabel } from "@/lib/constants";
import { formatPhone, formatDocument, formatDate } from "@/lib/utils";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: contacts }, { data: events }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", id)
        .order("is_primary", { ascending: false }),
      supabase
        .from("events")
        .select("*")
        .eq("client_id", id)
        .order("start_date", { ascending: false }),
    ]);

  if (!client) notFound();

  return (
    <div>
      <PageHeader
        title={client.name}
        description={
          client.type === "empresa" ? "Empresa" : "Pessoa física"
        }
      >
        <Link
          href={`/clientes/${client.id}/editar`}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-gray-50"
        >
          <Pencil className="h-4 w-4" />
          Editar
        </Link>
        <Link
          href={`/eventos/novo?cliente=${client.id}`}
          className="flex items-center gap-2 rounded-lg bg-brand-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          Novo evento
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-ink">Dados</h2>
            <dl className="space-y-3 text-sm">
              {client.legal_name && (
                <div>
                  <dt className="text-xs text-ink-muted">Razão social</dt>
                  <dd className="text-ink">{client.legal_name}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-ink-muted">CNPJ / CPF</dt>
                <dd className="text-ink">{formatDocument(client.document)}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-ink-muted" />
                <dd className="text-ink">{client.email ?? "—"}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-ink-muted" />
                <dd className="text-ink">{formatPhone(client.phone)}</dd>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                <dd className="text-ink">
                  {[
                    [client.address, client.address_number]
                      .filter(Boolean)
                      .join(", "),
                    client.address_complement,
                    client.neighborhood,
                    client.city && `${client.city}/${client.state ?? ""}`,
                    client.zip_code && `CEP ${client.zip_code}`,
                  ]
                    .filter(Boolean)
                    .join(" – ") || "—"}
                </dd>
              </div>
              {client.notes && (
                <div>
                  <dt className="text-xs text-ink-muted">Observações</dt>
                  <dd className="whitespace-pre-wrap text-ink">{client.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          <ContactsCard clientId={client.id} contacts={contacts ?? []} />
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">
                Eventos deste cliente
              </h2>
              <CalendarDays className="h-5 w-5 text-ink-muted" />
            </div>

            {!events || events.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-ink-muted">
                  Nenhum evento cadastrado ainda.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {events.map((event) => (
                  <li key={event.id} className="py-3">
                    <Link
                      href={`/eventos/${event.id}/editar`}
                      className="group flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-ink group-hover:text-brand-petrol">
                          {event.name}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {serviceTypesLabel(event.service_type)}
                          {event.location_name && ` · ${event.location_name}`}
                        </p>
                      </div>
                      <span className="text-sm text-ink-muted">
                        {formatDate(event.start_date)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
