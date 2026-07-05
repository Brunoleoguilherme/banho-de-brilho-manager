import { PageHeader } from "@/components/layout/PageHeader";
import { EmployeeForm } from "@/components/forms/EmployeeForm";

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const isFreelancer = tipo === "freelancer";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isFreelancer ? "Novo free lancer" : "Novo funcionário"}
        description="Os valores padrão de diária, VR e VT são usados na escala automaticamente"
      />
      <EmployeeForm
        defaultValues={{
          employee_type: isFreelancer ? "freelancer" : "funcionario",
          main_role: "agente_limpeza",
          status: "ativo",
          daily_rate: 0,
          hourly_rate: 0,
          vr_rate: 0,
          vt_rate: 0,
        }}
      />
    </div>
  );
}
