import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClientsTable } from "@/components/clients/ClientsTable";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, legal_name, type, document, phone, city, state")
    .order("name");

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Empresas e pessoas atendidas pela Banho de Brilho"
        actionLabel="Novo cliente"
        actionHref="/clientes/novo"
      />

      {!clients || clients.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhum cliente cadastrado"
          description="Cadastre seu primeiro cliente para criar eventos e propostas."
          actionLabel="Cadastrar cliente"
          actionHref="/clientes/novo"
        />
      ) : (
        <ClientsTable rows={clients} />
      )}
    </div>
  );
}
