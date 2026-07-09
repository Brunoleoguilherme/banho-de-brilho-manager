import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { VehiclesTable } from "@/components/vehicles/VehiclesTable";
import { toVehicleRow } from "@/components/vehicles/map";

export default async function VeiculosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .order("model");

  const rows = (data ?? []).map(toVehicleRow);

  return (
    <div>
      <PageHeader
        title="Veículos"
        description="Frota pré-cadastrada para escolher rapidamente na OS (Relação de Veículos)"
        actionLabel="Novo veículo"
        actionHref="/veiculos/novo"
      />
      <VehiclesTable vehicles={rows} />
    </div>
  );
}
