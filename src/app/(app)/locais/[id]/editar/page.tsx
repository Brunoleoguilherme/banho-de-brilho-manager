import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { LocationForm } from "@/components/locations/LocationForm";
import { toLocationRow } from "@/components/locations/map";

export default async function EditarLocalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_locations")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) notFound();

  const location = toLocationRow(data);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`Editar ${location.name}`}
        description="Atualize os dados do local"
      />
      <LocationForm location={location} />
    </div>
  );
}
