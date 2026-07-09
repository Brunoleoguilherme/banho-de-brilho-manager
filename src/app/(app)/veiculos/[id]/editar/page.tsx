import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { VehicleForm } from "@/components/vehicles/VehicleForm";
import { toVehicleRow } from "@/components/vehicles/map";

export default async function EditarVeiculoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) notFound();

  const vehicle = toVehicleRow(data);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Editar ${vehicle.model}`} description="Atualize os dados do veículo" />
      <VehicleForm vehicle={vehicle} />
    </div>
  );
}
