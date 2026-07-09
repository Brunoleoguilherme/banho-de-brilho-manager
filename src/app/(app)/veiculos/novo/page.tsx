import { PageHeader } from "@/components/layout/PageHeader";
import { VehicleForm } from "@/components/vehicles/VehicleForm";

export default function NovoVeiculoPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Novo veículo"
        description="Cadastre um veículo da frota para reaproveitar na OS"
      />
      <VehicleForm />
    </div>
  );
}
