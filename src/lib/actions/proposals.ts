"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { proposalSchema, type ProposalInput } from "@/lib/validations/proposal";
import { calculatePricing, itemTotal } from "@/lib/money/pricing";
import { valorPorExtenso } from "@/lib/money/extenso";
import { logActivity, emptyToNull, type ActionResult } from "./helpers";

/** Verifica a senha de login do usuário atual (exclusões protegidas) */
async function verifyPassword(password: string): Promise<string | null> {
  if (!password) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const verifier = createSupabaseJs(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error } = await verifier.auth.signInWithPassword({
    email: user.email,
    password,
  });
  return error ? null : user.email;
}

/** Exclui uma proposta do sistema — exige senha; bloqueia se gerou contrato/OS */
export async function deleteProposalAction(
  id: string,
  password: string
): Promise<ActionResult> {
  const email = await verifyPassword(password);
  if (!email)
    return { ok: false, error: "Senha incorreta. Exclusão não autorizada." };

  const supabase = await createClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, code")
    .eq("id", id)
    .single();
  if (!proposal) return { ok: false, error: "Proposta não encontrada." };

  // Exclusão em CASCATA: apaga tudo que nasceu desta proposta — OS (com
  // turnos, escala, checklist e veículos), contas a receber e contratos.
  const { data: osList } = await supabase
    .from("operation_orders")
    .select("id")
    .eq("proposal_id", id);
  const osIds = (osList ?? []).map((o) => o.id as string);

  if (osIds.length > 0) {
    await supabase.from("employee_allocations").delete().in("operation_order_id", osIds);
    await supabase.from("operation_shifts").delete().in("operation_order_id", osIds);
    await supabase.from("operation_checklist_items").delete().in("operation_order_id", osIds);
    await supabase.from("os_vehicles").delete().in("operation_order_id", osIds);
    await supabase.from("receivables").delete().in("operation_order_id", osIds);
    await supabase.from("operation_orders").delete().in("id", osIds);
  }

  await supabase.from("receivables").delete().eq("proposal_id", id);
  await supabase.from("contracts").delete().eq("proposal_id", id);
  await supabase.from("email_logs").delete().eq("proposal_id", id);
  await supabase.from("proposal_schedule_items").delete().eq("proposal_id", id);
  await supabase.from("proposal_items").delete().eq("proposal_id", id);
  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) return { ok: false, error: "Erro ao excluir. " + error.message };

  await logActivity({
    entity_type: "proposal",
    entity_id: id,
    action: "deleted",
    description: `Proposta ${proposal.code} EXCLUÍDA com tudo vinculado (${osIds.length} OS, contratos e contas a receber) por ${email} (senha confirmada)`,
  });
  revalidatePath("/propostas");
  revalidatePath("/contratos");
  revalidatePath("/operacao");
  revalidatePath("/financeiro");
  return { ok: true };
}

/** Exclui um registro do histórico (OneDrive) — exige senha */
export async function deleteHistoricalProposalAction(
  id: string,
  password: string
): Promise<ActionResult> {
  const email = await verifyPassword(password);
  if (!email)
    return { ok: false, error: "Senha incorreta. Exclusão não autorizada." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("historical_proposals")
    .select("id, code, client_name")
    .eq("id", id)
    .single();
  if (!row) return { ok: false, error: "Registro não encontrado." };

  const { error } = await supabase
    .from("historical_proposals")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: "Erro ao excluir. " + error.message };

  await logActivity({
    entity_type: "historical_proposal",
    entity_id: id,
    action: "deleted",
    description: `Histórico ${row.code} (${row.client_name}) EXCLUÍDO por ${email} (senha confirmada)`,
  });
  revalidatePath("/propostas");
  revalidatePath("/propostas/historico");
  return { ok: true };
}

function buildCode(number: number, year: number, revision: number): string {
  const base = `BBP${String(number).padStart(3, "0")}`;
  // 1ª revisão = BBP003R/2026 (padrão histórico da BB); depois R2, R3...
  if (revision === 1) return `${base}R/${year}`;
  return revision > 1 ? `${base}R${revision}/${year}` : `${base}/${year}`;
}

/** Data de hoje no fuso de Brasília (o servidor roda em UTC) */
function hojeBrasilia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function buildProposalRecord(data: ProposalInput) {
  const pricing = calculatePricing(
    data.items.map((i) => ({
      quantity: i.quantity,
      hours: i.hours === "" || i.hours === undefined ? null : i.hours,
      unit_price: i.unit_price,
      is_internal_cost: i.is_internal_cost,
      category: i.category,
    })),
    data
  );

  const total =
    data.emission_type === "recibo" ? pricing.totalReceipt : pricing.totalNf;
  const taxes =
    data.emission_type === "recibo" ? pricing.taxesReceipt : pricing.taxesNf;

  return {
    record: emptyToNull({
      event_id: data.event_id,
      contact_name: data.contact_name ?? "",
      contact_email: data.contact_email ?? "",
      contact_phone: data.contact_phone ?? "",
      issue_date: data.issue_date,
      valid_until: data.valid_until ?? "",
      emission_type: data.emission_type,
      payment_terms: data.payment_terms ?? "",
      payment_due_date: data.payment_due_date ?? "",
      responsibilities_company: data.responsibilities_company ?? "",
      responsibilities_client: data.responsibilities_client ?? "",
      notes: data.notes ?? "",
      margin_percent: data.margin_percent,
      bv_percent: data.bv_percent,
      discount_percent: data.discount_percent,
      tax_percent_nf: data.tax_percent_nf,
      tax_percent_receipt: data.tax_percent_receipt,
      subtotal: pricing.subtotal,
      total_cost: pricing.totalCost,
      bv: pricing.bvAmount,
      discount: pricing.discountAmount,
      taxes,
      total_nf: pricing.totalNf,
      total_receipt: pricing.totalReceipt,
      total_amount: total,
      amount_in_words: valorPorExtenso(total),
    }),
    pricing,
  };
}

async function saveChildren(
  supabase: Awaited<ReturnType<typeof createClient>>,
  proposalId: string,
  data: ProposalInput
): Promise<string | null> {
  await supabase
    .from("proposal_schedule_items")
    .delete()
    .eq("proposal_id", proposalId);
  await supabase.from("proposal_items").delete().eq("proposal_id", proposalId);

  if (data.schedule.length > 0) {
    const { error } = await supabase.from("proposal_schedule_items").insert(
      data.schedule.map((s) => ({
        proposal_id: proposalId,
        phase: s.phase,
        service_date: s.service_date,
        start_time: s.start_time || null,
        end_time: s.end_time || null,
        cleaning_agents: s.cleaning_agents,
        coordinators: s.coordinators,
        notes: s.notes || null,
      }))
    );
    if (error) return error.message;
  }

  if (data.items.length > 0) {
    const { error } = await supabase.from("proposal_items").insert(
      data.items.map((i) => ({
        proposal_id: proposalId,
        category: i.category,
        description: i.description,
        quantity: i.quantity,
        hours: i.hours === "" || i.hours === undefined ? null : i.hours,
        unit_price: i.unit_price,
        total_price: itemTotal({
          quantity: i.quantity,
          hours: i.hours === "" || i.hours === undefined ? null : i.hours,
          unit_price: i.unit_price,
          category: i.category,
        }),
        is_internal_cost: i.is_internal_cost,
        show_on_proposal: i.show_on_proposal,
        notes: i.notes || null,
      }))
    );
    if (error) return error.message;
  }

  return null;
}

export async function createProposalAction(
  input: unknown
): Promise<ActionResult> {
  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: event } = await supabase
    .from("events")
    .select("id, client_id, responsibilities_company, responsibilities_client")
    .eq("id", parsed.data.event_id)
    .single();
  if (!event) return { ok: false, error: "Evento não encontrado." };

  const year = new Date(parsed.data.issue_date + "T12:00:00").getFullYear();
  const { data: nextNumber, error: numberError } = await supabase.rpc(
    "next_proposal_number",
    { p_year: year }
  );
  if (numberError || !nextNumber)
    return { ok: false, error: "Erro ao gerar numeração BBP." };

  const { record } = buildProposalRecord(parsed.data);
  const code = buildCode(nextNumber, year, 0);

  const { data: proposal, error } = await supabase
    .from("proposals")
    .insert({
      ...record,
      // Responsabilidades vêm do cadastro do evento
      responsibilities_company: event.responsibilities_company,
      responsibilities_client: event.responsibilities_client,
      client_id: event.client_id,
      number: nextNumber,
      year,
      revision: 0,
      code,
      status: "rascunho",
      created_by: user?.id,
    })
    .select("id, code")
    .single();

  if (error)
    return { ok: false, error: "Erro ao salvar proposta. " + error.message };

  const childError = await saveChildren(supabase, proposal.id, parsed.data);
  if (childError)
    return { ok: false, error: "Erro ao salvar itens. " + childError };

  await logActivity({
    entity_type: "proposal",
    entity_id: proposal.id,
    action: "created",
    description: `Proposta ${proposal.code} criada`,
  });

  revalidatePath("/propostas");
  return { ok: true, id: proposal.id };
}

export async function updateProposalAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("proposals")
    .select("id, code, status")
    .eq("id", id)
    .single();
  if (!existing) return { ok: false, error: "Proposta não encontrada." };
  if (["aprovada", "convertida_contrato", "convertida_os"].includes(existing.status))
    return {
      ok: false,
      error: "Proposta aprovada não pode ser editada. Crie uma revisão.",
    };

  // Responsabilidades sempre refletem o cadastro atual do evento
  const { data: event } = await supabase
    .from("events")
    .select("responsibilities_company, responsibilities_client")
    .eq("id", parsed.data.event_id)
    .single();

  const { record } = buildProposalRecord(parsed.data);
  const { error } = await supabase
    .from("proposals")
    .update({
      ...record,
      responsibilities_company: event?.responsibilities_company ?? null,
      responsibilities_client: event?.responsibilities_client ?? null,
    })
    .eq("id", id);
  if (error)
    return { ok: false, error: "Erro ao atualizar proposta. " + error.message };

  const childError = await saveChildren(supabase, id, parsed.data);
  if (childError)
    return { ok: false, error: "Erro ao salvar itens. " + childError };

  await logActivity({
    entity_type: "proposal",
    entity_id: id,
    action: "updated",
    description: `Proposta ${existing.code} atualizada`,
  });

  revalidatePath("/propostas");
  revalidatePath(`/propostas/${id}`);
  return { ok: true, id };
}

export async function changeProposalStatusAction(
  id: string,
  status:
    | "rascunho"
    | "em_revisao_interna"
    | "enviada"
    | "em_negociacao"
    | "aprovada"
    | "recusada"
    | "cancelada"
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, code")
    .eq("id", id)
    .single();
  if (!proposal) return { ok: false, error: "Proposta não encontrada." };

  const extra: Record<string, string> = {};
  if (status === "aprovada") extra.approved_at = new Date().toISOString();
  if (status === "recusada") extra.rejected_at = new Date().toISOString();

  const { error } = await supabase
    .from("proposals")
    .update({ status, ...extra })
    .eq("id", id);
  if (error) return { ok: false, error: "Erro ao mudar status." };

  const labels: Record<string, string> = {
    rascunho: "voltou para rascunho",
    em_revisao_interna: "em revisão interna",
    enviada: "marcada como enviada",
    em_negociacao: "em negociação",
    aprovada: "APROVADA",
    recusada: "recusada",
    cancelada: "cancelada",
  };

  await logActivity({
    entity_type: "proposal",
    entity_id: id,
    action: "status_changed",
    description: `Proposta ${proposal.code} ${labels[status]}`,
  });

  revalidatePath("/propostas");
  revalidatePath(`/propostas/${id}`);
  return { ok: true, id };
}

/**
 * Cria uma revisão da proposta: mesmo número, revision + 1,
 * código BBPxxxRn/ano, status rascunho.
 */
export async function createRevisionAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: proposal }, { data: schedule }, { data: items }] =
    await Promise.all([
      supabase.from("proposals").select("*").eq("id", id).single(),
      supabase
        .from("proposal_schedule_items")
        .select("*")
        .eq("proposal_id", id),
      supabase.from("proposal_items").select("*").eq("proposal_id", id),
    ]);

  if (!proposal) return { ok: false, error: "Proposta não encontrada." };

  const { data: maxRev } = await supabase
    .from("proposals")
    .select("revision")
    .eq("number", proposal.number)
    .eq("year", proposal.year)
    .order("revision", { ascending: false })
    .limit(1)
    .single();

  const newRevision = (maxRev?.revision ?? proposal.revision) + 1;
  const code = buildCode(proposal.number, proposal.year, newRevision);

  const {
    id: _id,
    created_at: _c,
    updated_at: _u,
    approved_at: _a,
    rejected_at: _r,
    ...rest
  } = proposal;

  const { data: newProposal, error } = await supabase
    .from("proposals")
    .insert({
      ...rest,
      revision: newRevision,
      code,
      status: "rascunho",
      // Revisão sai com a data de hoje (pedido do Cláudio)
      issue_date: hojeBrasilia(),
      created_by: user?.id,
    })
    .select("id, code")
    .single();

  if (error)
    return { ok: false, error: "Erro ao criar revisão. " + error.message };

  if (schedule && schedule.length > 0) {
    await supabase.from("proposal_schedule_items").insert(
      schedule.map(({ id: _i, ...s }) => ({ ...s, proposal_id: newProposal.id }))
    );
  }
  if (items && items.length > 0) {
    await supabase.from("proposal_items").insert(
      items.map(({ id: _i, ...s }) => ({ ...s, proposal_id: newProposal.id }))
    );
  }

  await logActivity({
    entity_type: "proposal",
    entity_id: newProposal.id,
    action: "revision_created",
    description: `Revisão ${newProposal.code} criada a partir de ${proposal.code}`,
  });

  revalidatePath("/propostas");
  return { ok: true, id: newProposal.id };
}
