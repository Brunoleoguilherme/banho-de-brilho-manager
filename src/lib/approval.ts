import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_CHECKLIST = [
  "Equipe escalada e confirmada",
  "Materiais de limpeza separados",
  "Materiais descartáveis conferidos",
  "Transporte definido",
  "Alimentação providenciada",
  "Uniformes conferidos",
  "Acesso ao local confirmado com a produção",
  "Pagamento de diárias programado",
];

export interface ApprovalResult {
  ok: boolean;
  error?: string;
  osId?: string;
  contractId?: string;
  code?: string;
}

/**
 * Núcleo da aprovação (usado pelo aceite interno e pelo link do cliente):
 * aprova a proposta e gera contrato, OS, turnos, checklist e conta a receber.
 */
export async function approveProposalCore(
  supabase: SupabaseClient,
  proposalId: string,
  actorDescription: string,
  actorUserId: string | null
): Promise<ApprovalResult> {
  const [{ data: proposal }, { data: schedule }] = await Promise.all([
    supabase.from("proposals").select("*").eq("id", proposalId).single(),
    supabase
      .from("proposal_schedule_items")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("service_date"),
  ]);

  if (!proposal) return { ok: false, error: "Proposta não encontrada." };
  if (proposal.status === "aprovada")
    return { ok: false, error: "Esta proposta já foi aceita." };

  const { data: existingOs } = await supabase
    .from("operation_orders")
    .select("id")
    .eq("proposal_id", proposalId)
    .maybeSingle();
  if (existingOs)
    return { ok: false, error: "Já existe uma ordem de serviço para esta proposta." };

  const { error: statusError } = await supabase
    .from("proposals")
    .update({ status: "aprovada", approved_at: new Date().toISOString() })
    .eq("id", proposalId);
  if (statusError)
    return { ok: false, error: "Erro ao aprovar. " + statusError.message };

  const contractCode = `CT-${proposal.code}`;
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .insert({
      proposal_id: proposalId,
      client_id: proposal.client_id,
      code: contractCode,
      status: "gerado",
    })
    .select("id, code")
    .single();
  if (contractError)
    return { ok: false, error: "Erro ao gerar contrato. " + contractError.message };

  const osCode = `OS-${proposal.code}`;
  const { data: os, error: osError } = await supabase
    .from("operation_orders")
    .insert({
      proposal_id: proposalId,
      contract_id: contract.id,
      event_id: proposal.event_id,
      client_id: proposal.client_id,
      code: osCode,
      status: "criada",
      commercial_owner_id: proposal.created_by,
    })
    .select("id, code")
    .single();
  if (osError) return { ok: false, error: "Erro ao criar OS. " + osError.message };

  if (schedule && schedule.length > 0) {
    await supabase.from("operation_shifts").insert(
      schedule.map((s) => ({
        operation_order_id: os.id,
        phase: s.phase,
        service_date: s.service_date,
        start_time: s.start_time,
        end_time: s.end_time,
        required_cleaning_agents: s.cleaning_agents ?? 0,
        required_coordinators: s.coordinators ?? 0,
      }))
    );
  }

  await supabase.from("operation_checklist_items").insert(
    DEFAULT_CHECKLIST.map((label, index) => ({
      operation_order_id: os.id,
      label,
      sort_order: index,
    }))
  );

  const { data: event } = await supabase
    .from("events")
    .select("name, start_date, end_date")
    .eq("id", proposal.event_id)
    .single();
  const dueDate =
    event?.end_date ??
    event?.start_date ??
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  await supabase.from("receivables").insert({
    client_id: proposal.client_id,
    proposal_id: proposalId,
    contract_id: contract.id,
    operation_order_id: os.id,
    description: `Proposta ${proposal.code} — ${event?.name ?? "evento"}`,
    amount: Number(proposal.total_amount) || 0,
    due_date: dueDate,
    status: "pendente",
    document_type:
      proposal.emission_type === "recibo" ? "recibo" : "nota_fiscal",
    payment_method: proposal.payment_terms,
  });

  await supabase.from("activity_logs").insert([
    {
      entity_type: "proposal",
      entity_id: proposalId,
      action: "approved",
      description: `Proposta ${proposal.code} ACEITA ${actorDescription} — contrato ${contract.code} e ${os.code} gerados automaticamente`,
      user_id: actorUserId,
    },
    {
      entity_type: "operation_order",
      entity_id: os.id,
      action: "created",
      description: `Ordem de serviço ${os.code} criada a partir da proposta ${proposal.code}`,
      user_id: actorUserId,
    },
  ]);

  return {
    ok: true,
    osId: os.id,
    contractId: contract.id,
    code: proposal.code,
  };
}
