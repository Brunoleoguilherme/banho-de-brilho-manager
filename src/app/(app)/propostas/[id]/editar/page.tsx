import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProposalForm } from "@/components/proposals/ProposalForm";
import type { ProposalInput } from "@/lib/validations/proposal";

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: proposal },
    { data: schedule },
    { data: items },
    { data: events },
    { data: eventSchedules },
    { data: settings },
  ] =
    await Promise.all([
      supabase.from("proposals").select("*").eq("id", id).single(),
      supabase
        .from("proposal_schedule_items")
        .select("*")
        .eq("proposal_id", id)
        .order("service_date"),
      supabase.from("proposal_items").select("*").eq("proposal_id", id),
      supabase
        .from("events")
        .select("id, name, start_date, estimated_public, clients(name, email, phone)")
        .order("start_date", { ascending: false, nullsFirst: false }),
      supabase
        .from("event_schedules")
        .select("event_id, service_type, service_date, start_time, end_time")
        .order("service_date"),
      supabase.from("app_settings").select("key, value"),
    ]);

  if (!proposal) notFound();

  // Percentuais do Custo do Evento (mesmos do Financeiro)
  const pct = (key: string, fallback: number): number => {
    const found = (settings ?? []).find((s) => s.key === key);
    return found ? Number(found.value) : fallback;
  };
  const costPercents = {
    custoFixo: pct("custo_fixo_pct", 21.79),
    encargos: pct("encargos_pct", 12.9),
    diversos: pct("diversos_pct", 4.0),
  };

  const eventOptions = (events ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    start_date: e.start_date,
    estimated_public: e.estimated_public,
    client_name: (e.clients as unknown as { name: string } | null)?.name ?? "",
    client_email:
      (e.clients as unknown as { email: string | null } | null)?.email ?? "",
    client_phone:
      (e.clients as unknown as { phone: string | null } | null)?.phone ?? "",
    schedules: (eventSchedules ?? []).filter((s) => s.event_id === e.id),
  }));

  const defaultValues: Partial<ProposalInput> = {
    event_id: proposal.event_id,
    contact_name: proposal.contact_name ?? "",
    contact_email: proposal.contact_email ?? "",
    contact_phone: proposal.contact_phone ?? "",
    issue_date: proposal.issue_date ?? "",
    valid_until: proposal.valid_until ?? "",
    emission_type: proposal.emission_type ?? "nota_fiscal",
    payment_terms: proposal.payment_terms ?? "",
    payment_due_date: proposal.payment_due_date ?? "",
    responsibilities_company: proposal.responsibilities_company ?? "",
    responsibilities_client: proposal.responsibilities_client ?? "",
    notes: proposal.notes ?? "",
    margin_percent: Number(proposal.margin_percent) || 0,
    bv_percent: Number(proposal.bv_percent) || 0,
    discount_percent: Number(proposal.discount_percent) || 0,
    tax_percent_nf: Number(proposal.tax_percent_nf) || 0,
    tax_percent_receipt: Number(proposal.tax_percent_receipt) || 0,
    schedule: (schedule ?? []).map((s) => ({
      phase: s.phase,
      service_date: s.service_date ?? "",
      start_time: s.start_time?.slice(0, 5) ?? "",
      end_time: s.end_time?.slice(0, 5) ?? "",
      cleaning_agents: s.cleaning_agents ?? 0,
      coordinators: s.coordinators ?? 0,
      notes: s.notes ?? "",
    })),
    items: (items ?? []).map((i) => ({
      category: i.category,
      description: i.description,
      quantity: Number(i.quantity) || 0,
      hours: i.hours === null ? "" : Number(i.hours),
      unit_price: Number(i.unit_price) || 0,
      is_internal_cost: !!i.is_internal_cost,
      show_on_proposal: !!i.show_on_proposal,
      notes: i.notes ?? "",
    })),
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`Editar ${proposal.code}`}
        description="Alterações recalculam os valores automaticamente"
      />
      <ProposalForm
        events={eventOptions}
        proposalId={proposal.id}
        defaultValues={defaultValues}
        costPercents={costPercents}
      />
    </div>
  );
}
