import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { EventForm } from "@/components/forms/EventForm";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: event }, { data: clients }, { data: schedules }, { data: respItems }] =
    await Promise.all([
      supabase.from("events").select("*").eq("id", id).single(),
      supabase.from("clients").select("id, name").order("name"),
      supabase
        .from("event_schedules")
        .select("service_type, service_date, start_time, end_time")
        .eq("event_id", id)
        .order("service_date"),
      supabase.from("responsibility_items").select("label").order("created_at"),
    ]);

  if (!event) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Editar evento" description={event.name}>
        <Link
          href={`/propostas/nova?evento=${event.id}`}
          className="flex items-center gap-2 rounded-lg bg-brand-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <FileText className="h-4 w-4" />
          Criar proposta
        </Link>
      </PageHeader>
      <EventForm
        event={event}
        schedules={schedules ?? []}
        clients={clients ?? []}
        responsibilityItems={(respItems ?? []).map((i) => i.label)}
      />
    </div>
  );
}
