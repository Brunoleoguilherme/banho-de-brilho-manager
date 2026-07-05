import { PageHeader } from "@/components/layout/PageHeader";
import { ClientForm } from "@/components/forms/ClientForm";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Novo cliente"
        description="Cadastre os dados que serão usados em propostas e contratos"
      />
      <ClientForm />
    </div>
  );
}
