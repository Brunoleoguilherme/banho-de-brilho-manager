import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProposalForm } from "@/components/proposals/ProposalForm";

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ evento?: string }>;
}) {
  const { evento } = await searchParams;
  const supabase = await createClient();

  const [{ data: events }, { data: eventSchedules }, { data: settings }] =
    await Promise.all([
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

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Nova proposta"
        description="O número BBP é gerado automaticamente ao salvar"
      />
      <ProposalForm
        events={eventOptions}
        defaultEventId={evento}
        costPercents={costPercents}
      />
    </div>
  );
}
