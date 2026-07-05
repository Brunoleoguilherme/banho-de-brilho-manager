import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmployeeForm } from "@/components/forms/EmployeeForm";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .eq("id", id)
    .single();

  if (!employee) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Editar funcionário" description={employee.full_name} />
      <EmployeeForm
        employeeId={employee.id}
        defaultValues={{
          employee_type: employee.employee_type ?? "funcionario",
          full_name: employee.full_name,
          document: employee.document ?? "",
          rg: employee.rg ?? "",
          phone: employee.phone ?? "",
          email: employee.email ?? "",
          address: employee.address ?? "",
          address_number: employee.address_number ?? "",
          address_complement: employee.address_complement ?? "",
          neighborhood: employee.neighborhood ?? "",
          zip_code: employee.zip_code ?? "",
          city: employee.city ?? "",
          state: employee.state ?? "",
          main_role: employee.main_role,
          secondary_roles: employee.secondary_roles ?? "",
          daily_rate: Number(employee.daily_rate) || 0,
          hourly_rate: Number(employee.hourly_rate) || 0,
          vr_rate: Number(employee.vr_rate) || 0,
          vt_rate: Number(employee.vt_rate) || 0,
          pix_key: employee.pix_key ?? "",
          bank_info: employee.bank_info ?? "",
          status: employee.status,
          notes: employee.notes ?? "",
        }}
      />
    </div>
  );
}
