import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Users, FileDown, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { OperationStatusSelect } from "@/components/operation/OperationStatusSelect";
import { ChecklistCard } from "@/components/operation/ChecklistCard";
import { OperationInfoForm } from "@/components/operation/OperationInfoForm";
import { BulkAllocationValues } from "@/components/operation/BulkAllocationValues";
import { OsVehicles, type OsVehicle } from "@/components/operation/OsVehicles";
import {
  ShiftAllocations,
  type AllocationRow,
  type EmployeeOption,
} from "@/components/operation/ShiftAllocations";
import { formatDate, formatDateTime, formatTime, formatMoney } from "@/lib/utils";

const PHASE_LABELS: Record<string, string> = {
  montagem: "Montagem",
  realizacao: "Realização",
  desmontagem: "Desmontagem",
};

export default async function OperationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: os },
    { data: shifts },
    { data: allocations },
    { data: checklist },
    { data: employees },
    { data: profiles },
    { data: logs },
    { data: vehicles },
  ] = await Promise.all([
    supabase
      .from("operation_orders")
      .select(
        "*, clients(name), events(name, location_name, city, state, start_date, end_date), proposals(id, code, total_amount), contracts(id, code, status)"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("operation_shifts")
      .select("*")
      .eq("operation_order_id", id)
      .order("service_date"),
    supabase
      .from("employee_allocations")
      .select("*, employees(full_name)")
      .eq("operation_order_id", id),
    supabase
      .from("operation_checklist_items")
      .select("id, label, done")
      .eq("operation_order_id", id)
      .order("sort_order"),
    supabase
      .from("employees")
      .select("id, full_name, main_role, daily_rate, vr_rate, vt_rate")
      .eq("status", "ativo")
      .order("full_name"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("active", true)
      .order("full_name"),
    supabase
      .from("activity_logs")
      .select("*")
      .eq("entity_type", "operation_order")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("os_vehicles")
      .select("id, model, plate, driver_name, driver_document")
      .eq("operation_order_id", id)
      .order("created_at"),
  ]);

  if (!os) notFound();

  const event = os.events as {
    name: string;
    location_name: string | null;
    city: string | null;
    state: string | null;
    start_date: string | null;
    end_date: string | null;
  } | null;
  const proposal = os.proposals as {
    id: string;
    code: string;
    total_amount: number;
  } | null;
  const contract = os.contracts as {
    id: string;
    code: string;
    status: string;
  } | null;

  const employeeOptions: EmployeeOption[] = (employees ?? []).map((e) => ({
    id: e.id,
    full_name: e.full_name,
    main_role: e.main_role,
    daily_rate: Number(e.daily_rate) || 0,
    vr_rate: Number(e.vr_rate) || 0,
    vt_rate: Number(e.vt_rate) || 0,
  }));

  const allocationsByShift = new Map<string, AllocationRow[]>();
  for (const a of allocations ?? []) {
    const row: AllocationRow = {
      id: a.id,
      employee_id: a.employee_id,
      employee_name:
        (a.employees as { full_name: string } | null)?.full_name ?? "—",
      role: a.role,
      status: a.status,
      daily_rate: Number(a.daily_rate) || 0,
      vr_amount: Number(a.vr_amount) || 0,
      vt_amount: Number(a.vt_amount) || 0,
      advance_amount: Number(a.advance_amount) || 0,
      total_amount: Number(a.total_amount) || 0,
    };
    const list = allocationsByShift.get(a.operation_shift_id) ?? [];
    list.push(row);
    allocationsByShift.set(a.operation_shift_id, list);
  }

  const totalPrevisto = (allocations ?? []).reduce(
    (acc, a) => acc + (Number(a.total_amount) || 0),
    0
  );

  return (
    <div>
      <PageHeader
        title={os.code}
        description={`${(os.clients as { name: string } | null)?.name ?? ""} · ${event?.name ?? ""}`}
      >
        <a
          href={`/operacao/${os.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-gray-50"
        >
          <FileDown className="h-4 w-4" />
          Gerar PDF
        </a>
        <a
          href={`/operacao/${os.id}/colaboradores`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-gray-50"
          title="Colaboradores confirmados (nome, CPF e RG) por turno + veículos — para credenciamento"
        >
          <ClipboardList className="h-4 w-4" />
          Lista de colaboradores e veículos
        </a>
        <OperationStatusSelect osId={os.id} status={os.status} />
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-card">
          <p className="text-xs text-ink-muted">Evento</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-ink">
            <CalendarDays className="h-4 w-4 text-brand-teal" />
            {formatDate(event?.start_date)}
            {event?.end_date && event.end_date !== event.start_date
              ? ` a ${formatDate(event.end_date)}`
              : ""}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {event?.location_name}
            {event?.city && ` · ${event.city}/${event.state ?? ""}`}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-card">
          <p className="text-xs text-ink-muted">Origem</p>
          <p className="mt-1 text-sm">
            {proposal && (
              <Link
                href={`/propostas/${proposal.id}`}
                className="font-medium text-brand-petrol hover:underline"
              >
                {proposal.code}
              </Link>
            )}
            {contract && (
              <>
                {" · "}
                <Link
                  href={`/contratos/${contract.id}`}
                  className="font-medium text-brand-petrol hover:underline"
                >
                  {contract.code}
                </Link>
              </>
            )}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Valor da proposta: {formatMoney(Number(proposal?.total_amount))}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-card">
          <p className="text-xs text-ink-muted">Custo previsto da equipe</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Users className="h-4 w-4 text-brand-teal" />
            {formatMoney(totalPrevisto)}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {(allocations ?? []).length} escalado(s)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
            <h2 className="mb-1 text-base font-semibold text-ink">
              Turnos e escala de equipe
            </h2>
            <p className="mb-4 text-sm text-ink-muted">
              Turnos criados a partir do cronograma da proposta. Escale os
              funcionários em cada turno.
            </p>

            <BulkAllocationValues osId={os.id} />

            {!shifts || shifts.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Nenhum turno cadastrado para esta OS.
              </p>
            ) : (
              <div className="space-y-6">
                {shifts.map((shift) => {
                  const shiftAllocations =
                    allocationsByShift.get(shift.id) ?? [];
                  const confirmed = shiftAllocations.filter((a) =>
                    ["confirmado", "compareceu", "pago"].includes(a.status)
                  ).length;
                  const required =
                    (shift.required_cleaning_agents ?? 0) +
                    (shift.required_coordinators ?? 0);
                  return (
                    <div
                      key={shift.id}
                      className="rounded-lg border border-gray-100 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {PHASE_LABELS[shift.phase] ?? shift.phase} —{" "}
                            {formatDate(shift.service_date)}
                          </p>
                          <p className="text-xs text-ink-muted">
                            {shift.start_time
                              ? `${formatTime(shift.start_time)} às ${formatTime(shift.end_time)}`
                              : "Horário a definir"}
                            {" · "}Previsto: {shift.required_cleaning_agents} AL
                            + {shift.required_coordinators} CO
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            confirmed >= required && required > 0
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {confirmed}/{required} confirmados
                        </span>
                      </div>
                      <ShiftAllocations
                        osId={os.id}
                        shiftId={shift.id}
                        allocations={shiftAllocations}
                        employees={employeeOptions}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <OperationInfoForm
            osId={os.id}
            profiles={profiles ?? []}
            defaults={{
              operational_owner_id: os.operational_owner_id,
              materials_notes: os.materials_notes,
              transport_notes: os.transport_notes,
              food_notes: os.food_notes,
              uniforms_notes: os.uniforms_notes,
              notes: os.notes,
            }}
          />
        </div>

        <div className="space-y-6">
          <ChecklistCard osId={os.id} items={checklist ?? []} />

          <OsVehicles osId={os.id} vehicles={(vehicles ?? []) as OsVehicle[]} />

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-ink">Histórico</h2>
            {!logs || logs.length === 0 ? (
              <p className="text-sm text-ink-muted">Sem registros.</p>
            ) : (
              <ul className="divide-y divide-gray-50 text-sm">
                {logs.map((log) => (
                  <li key={log.id} className="py-2">
                    <p className="text-ink">{log.description}</p>
                    <p className="text-xs text-ink-muted">
                      {formatDateTime(log.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
