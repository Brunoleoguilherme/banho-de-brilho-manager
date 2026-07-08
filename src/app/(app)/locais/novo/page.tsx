import { PageHeader } from "@/components/layout/PageHeader";
import { LocationForm } from "@/components/locations/LocationForm";

export default function NovoLocalPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Novo local"
        description="Cadastre um local para reaproveitar endereço, contato e banheiros nos eventos"
      />
      <LocationForm />
    </div>
  );
}
