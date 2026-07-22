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
  await supabase.from("proposal_rental_items").delete().eq("proposal_id", id);
  await supabase.from("proposal_value_items").delete().eq("proposal_id", id);
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

/**
 * Status em que a proposta já saiu para o cliente (ou avançou além do envio).
 * A partir daqui, alterar dados NÃO edita em cima: gera-se uma revisão (BBP…R).
 */
const SENT_STATUSES = [
  "enviada",
  "em_negociacao",
  "aprovada",
  "recusada",
  "cancelada",
  "convertida_contrato",
  "convertida_os",
];

/**
 * A proposta já foi enviada ao cliente? Considera o status (envio muda para
 * "enviada" automaticamente) e também um e-mail efetivamente enviado no
 * histórico — assim, mesmo que o status volte para rascunho, respeita o envio.
 */
async function proposalAlreadySent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  status: string
): Promise<boolean> {
  if (SENT_STATUSES.includes(status)) return true;
  const { data } = await supabase
    .from("email_logs")
    .select("id")
    .eq("related_type", "proposal")
    .eq("related_id", id)
    .eq("status", "enviado")
    .limit(1)
    .maybeSingle();
  return !!data;
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

/** Total do modo manual: valores discriminados + itens de locação (qtd × valor) */
function manualTotal(data: ProposalInput): number {
  const values = (data.value_items ?? []).reduce(
    (acc, v) => acc + (Number(v.amount) || 0),
    0
  );
  const rentals = (data.rental_items ?? []).reduce(
    (acc, r) => acc + (Number(r.quantity) || 0) * (Number(r.unit_value) || 0),
    0
  );
  return Math.round((values + rentals) * 100) / 100;
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

  const isManual = data.pricing_mode === "manual";
  // No modo manual o valor é digitado direto (soma), sem passar pela margem.
  const total = isManual
    ? manualTotal(data)
    : data.emission_type === "recibo"
      ? pricing.totalReceipt
      : pricing.totalNf;
  const taxes = isManual
    ? 0
    : data.emission_type === "recibo"
      ? pricing.taxesReceipt
      : pricing.taxesNf;

  return {
    record: emptyToNull({
      event_id: data.event_id,
      pricing_mode: data.pricing_mode ?? "automatico",
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
      subtotal: isManual ? total : pricing.subtotal,
      total_cost: isManual ? 0 : pricing.totalCost,
      bv: isManual ? 0 : pricing.bvAmount,
      discount: isManual ? 0 : pricing.discountAmount,
      taxes,
      total_nf: isManual ? total : pricing.totalNf,
      total_receipt: isManual ? total : pricing.totalReceipt,
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
  await supabase
    .from("proposal_rental_items")
    .delete()
    .eq("proposal_id", proposalId);
  await supabase
    .from("proposal_value_items")
    .delete()
    .eq("proposal_id", proposalId);

  if (data.schedule.length > 0) {
    const { error } = await supabase.from("proposal_schedule_items").insert(
      data.schedule.map((s) => ({
        proposal_id: proposalId,
        phase: s.phase,
        service_date: s.service_date || null,
        start_time: s.start_time || null,
        end_time: s.end_time || null,
        time_label: s.time_label || null,
        cleaning_agents: s.cleaning_agents,
        coordinators: s.coordinators,
        notes: s.notes || null,
      }))
    );
    if (error) return error.message;
  }

  const rentals = data.rental_items ?? [];
  if (rentals.length > 0) {
    const { error } = await supabase.from("proposal_rental_items").insert(
      rentals.map((r, idx) => ({
        proposal_id: proposalId,
        description: r.description,
        quantity: r.quantity,
        unit_value: r.unit_value,
        sort_order: idx,
      }))
    );
    if (error) return error.message;
  }

  const valueItems = data.value_items ?? [];
  if (valueItems.length > 0) {
    const { error } = await supabase.from("proposal_value_items").insert(
      valueItems.map((v, idx) => ({
        proposal_id: proposalId,
        label: v.label,
        amount: v.amount,
        sort_order: idx,
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
  if (await proposalAlreadySent(supabase, id, existing.status))
    return {
      ok: false,
      error:
        "Esta proposta já foi enviada ao cliente. Para alterar os dados, crie uma revisão (BBP…R).",
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
 * Altera o número (código BBP) de uma proposta — apenas administradores.
 * Renumera a família inteira (a proposta e suas revisões que compartilham o
 * mesmo número/ano), recalculando o código de cada uma. Bloqueia se o novo
 * número já estiver em uso no mesmo ano.
 */
export async function updateProposalNumberAction(
  id: string,
  newNumber: number
): Promise<ActionResult> {
  const n = Math.trunc(Number(newNumber));
  if (!Number.isFinite(n) || n <= 0)
    return {
      ok: false,
      error: "Informe um número válido (inteiro maior que zero).",
    };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    return {
      ok: false,
      error: "Apenas administradores podem alterar o número da proposta.",
    };

  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, number, year, revision, code")
    .eq("id", id)
    .single();
  if (!proposal) return { ok: false, error: "Proposta não encontrada." };

  if (n === proposal.number)
    return { ok: false, error: `A proposta já é a de número ${n}.` };

  // Não pode colidir com outra proposta do mesmo ano
  const { data: clash } = await supabase
    .from("proposals")
    .select("code")
    .eq("year", proposal.year)
    .eq("number", n)
    .limit(1)
    .maybeSingle();
  if (clash)
    return {
      ok: false,
      error: `Já existe a proposta ${clash.code} com o número ${String(n).padStart(3, "0")} em ${proposal.year}. Escolha outro número.`,
    };

  // Renumera a família inteira (base + revisões que compartilham número/ano)
  const { data: family } = await supabase
    .from("proposals")
    .select("id, revision")
    .eq("year", proposal.year)
    .eq("number", proposal.number);

  const rows =
    family && family.length > 0
      ? family
      : [{ id: proposal.id, revision: proposal.revision }];

  for (const row of rows) {
    const { error } = await supabase
      .from("proposals")
      .update({ number: n, code: buildCode(n, proposal.year, row.revision) })
      .eq("id", row.id);
    if (error)
      return { ok: false, error: "Erro ao alterar o número. " + error.message };
  }

  const novoCode = buildCode(n, proposal.year, proposal.revision);
  await logActivity({
    entity_type: "proposal",
    entity_id: proposal.id,
    action: "number_changed",
    description: `Número da proposta alterado de ${proposal.code} para ${novoCode} por ${user.email}`,
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

  const [
    { data: proposal },
    { data: schedule },
    { data: items },
    { data: rentals },
    { data: valueItems },
  ] = await Promise.all([
    supabase.from("proposals").select("*").eq("id", id).single(),
    supabase.from("proposal_schedule_items").select("*").eq("proposal_id", id),
    supabase.from("proposal_items").select("*").eq("proposal_id", id),
    supabase.from("proposal_rental_items").select("*").eq("proposal_id", id),
    supabase.from("proposal_value_items").select("*").eq("proposal_id", id),
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
  if (rentals && rentals.length > 0) {
    await supabase.from("proposal_rental_items").insert(
      rentals.map(({ id: _i, ...s }) => ({ ...s, proposal_id: newProposal.id }))
    );
  }
  if (valueItems && valueItems.length > 0) {
    await supabase.from("proposal_value_items").insert(
      valueItems.map(({ id: _i, ...s }) => ({ ...s, proposal_id: newProposal.id }))
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
