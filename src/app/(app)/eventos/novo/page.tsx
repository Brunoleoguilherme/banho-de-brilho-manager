import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { EventForm } from "@/components/forms/EventForm";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const { cliente } = await searchParams;
  const supabase = await createClient();
  const [{ data: clients }, { data: respItems }, { data: locations }] =
    await Promise.all([
      supabase.from("clients").select("id, name").order("name"),
      supabase
        .from("responsibility_items")
        .select("label")
        .order("created_at"),
      supabase.from("event_locations").select("id, name, address, address_number, address_complement, neighborhood, city, state, zip_code").order("name"),
    ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Novo evento"
        description="Briefing do serviço — base para a proposta comercial"
      />
      <EventForm
        clients={clients ?? []}
        locations={locations ?? []}
        defaultClientId={cliente}
        responsibilityItems={(respItems ?? []).map((i) => i.label)}
      />
    </div>
  );
}
