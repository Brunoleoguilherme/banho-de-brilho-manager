import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { LocationsTable } from "@/components/locations/LocationsTable";
import { toLocationRow } from "@/components/locations/map";

export default async function LocaisPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_locations")
    .select("*")
    .order("name");

  const rows = (data ?? []).map(toLocationRow);

  return (
    <div>
      <PageHeader
        title="Locais de evento"
        description="Cadastro de locais para reaproveitar endereço, contato e banheiros nos eventos"
        actionLabel="Novo local"
        actionHref="/locais/novo"
      />
      <LocationsTable locations={rows} />
    </div>
  );
}
