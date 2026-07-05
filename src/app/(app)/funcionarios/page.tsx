import Link from "next/link";
import { HardHat, Zap, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  EmployeesTable,
  type EmployeeRow,
} from "@/components/team/EmployeesTable";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, main_role, phone, daily_rate, vr_rate, vt_rate, neighborhood, status, employee_type")
    .order("full_name");

  const all = (employees ?? []) as (EmployeeRow & { employee_type: string })[];
  const funcionarios = all.filter((e) => e.employee_type !== "freelancer");
  const freelancers = all.filter((e) => e.employee_type === "freelancer");

  return (
    <div>
      <PageHeader
        title="Equipe"
        description="Funcionários registrados e free lancers para escala e diárias"
      />

      <div className="space-y-6">
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-brand-petrol" />
              <h2 className="text-base font-semibold text-ink">
                1 · Funcionários
              </h2>
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
                {funcionarios.length}
              </span>
            </div>
            <Link
              href="/funcionarios/novo"
              className="flex items-center gap-2 rounded-lg bg-brand-petrol px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              <Plus className="h-4 w-4" />
              Novo funcionário
            </Link>
          </div>
          {funcionarios.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-ink-muted">
              Nenhum funcionário cadastrado.
            </p>
          ) : (
            <EmployeesTable rows={funcionarios} />
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-brand-gold" />
              <h2 className="text-base font-semibold text-ink">
                2 · Free Lancers
              </h2>
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
                {freelancers.length}
              </span>
            </div>
            <Link
              href="/funcionarios/novo?tipo=freelancer"
              className="flex items-center gap-2 rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Novo free lancer
            </Link>
          </div>
          {freelancers.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-ink-muted">
              Nenhum free lancer cadastrado ainda — clique em &quot;Novo free
              lancer&quot; para incluir o primeiro.
            </p>
          ) : (
            <EmployeesTable rows={freelancers} />
          )}
        </div>
      </div>
    </div>
  );
}
