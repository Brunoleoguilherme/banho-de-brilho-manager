"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { logActivity, emptyToNull, type ActionResult } from "./helpers";

/** Atualiza os dados fiscais de uma conta a receber (Controle NFs e Recibos) */
export async function updateNfControlAction(
  id: string,
  input: {
    emission_date?: string | null;
    invoice_number?: string | null;
    document_type?: "nota_fiscal" | "recibo" | "outro";
    iss_amount?: number;
    inss_amount?: number;
    received_at?: string | null;
    received_amount?: number | null;
  }
): Promise<ActionResult> {
  const supabase = await createClient();

  const update: Record<string, unknown> = {};
  if (input.emission_date !== undefined)
    update.emission_date = input.emission_date || null;
  if (input.invoice_number !== undefined)
    update.invoice_number = input.invoice_number?.trim() || null;
  if (input.document_type) update.document_type = input.document_type;
  if (input.iss_amount !== undefined)
    update.iss_amount = Math.round((Number(input.iss_amount) || 0) * 100) / 100;
  if (input.inss_amount !== undefined)
    update.inss_amount = Math.round((Number(input.inss_amount) || 0) * 100) / 100;
  if (input.received_at !== undefined) {
    update.received_at = input.received_at || null;
    if (input.received_at) update.status = "recebido";
  }
  if (input.received_amount !== undefined)
    update.received_amount =
      input.received_amount === null
        ? null
        : Math.round((Number(input.received_amount) || 0) * 100) / 100;

  const { error } = await supabase
    .from("receivables")
    .update(update)
    .eq("id", id);
  if (error)
    return {
      ok: false,
      error:
        "Erro ao salvar. Se aparecer 'column does not exist', rode a migration 0023 no Supabase.",
    };

  revalidatePath("/financeiro/controle-nfs");
  revalidatePath("/financeiro/receber");
  revalidatePath("/financeiro");
  return { ok: true };
}

/** Salva as alíquotas de ISS do ano (tabela da planilha) */
export async function saveIssRatesAction(
  year: number,
  rates: number[]
): Promise<ActionResult> {
  if (rates.length !== 12) return { ok: false, error: "Informe os 12 meses." };
  const supabase = await createClient();
  const { error } = await supabase.from("iss_rates").upsert(
    rates.map((rate, i) => ({
      year,
      month: i + 1,
      rate: Math.round((Number(rate) || 0) * 10000) / 10000,
    }))
  );
  if (error) return { ok: false, error: "Erro ao salvar as alíquotas." };
  revalidatePath("/financeiro/controle-nfs");
  return { ok: true };
}

/** Salva/corrige o faturamento NF de um mês (Tabela ISS Mensal) */
export async function saveNfBillingAction(
  year: number,
  month: number,
  amount: number
): Promise<ActionResult> {
  if (month < 1 || month > 12 || year < 2020 || year > 2100)
    return { ok: false, error: "Mês/ano inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("nf_billing_history").upsert({
    year,
    month,
    amount: Math.round((Number(amount) || 0) * 100) / 100,
  });
  if (error)
    return {
      ok: false,
      error:
        "Erro ao salvar. Se aparecer 'nf_billing_history does not exist', rode a migration 0024 no Supabase.",
    };
  revalidatePath("/financeiro/tabela-iss");
  return { ok: true };
}

/** Adiciona despesa avulsa de equipe (transporte/refeição de funcionários) */
export async function addStaffExpenseAction(input: {
  expense_date: string;
  category: "transporte" | "refeicao";
  description?: string;
  amount: number;
}): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expense_date))
    return { ok: false, error: "Informe a data." };
  if (!["transporte", "refeicao"].includes(input.category))
    return { ok: false, error: "Categoria inválida." };
  const amount = Math.round((Number(input.amount) || 0) * 100) / 100;
  if (amount <= 0) return { ok: false, error: "Informe um valor maior que zero." };

  const supabase = await createClient();
  const { error } = await supabase.from("staff_expenses").insert({
    expense_date: input.expense_date,
    category: input.category,
    description: input.description?.trim() || null,
    amount,
  });
  if (error)
    return {
      ok: false,
      error:
        "Erro ao lançar. Se aparecer 'staff_expenses does not exist', rode a migration 0022 no Supabase.",
    };

  revalidatePath("/diarias");
  return { ok: true };
}

/** Exclui despesa avulsa de equipe */
export async function deleteStaffExpenseAction(
  id: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("staff_expenses").delete().eq("id", id);
  if (error) return { ok: false, error: "Erro ao excluir o lançamento." };
  revalidatePath("/diarias");
  return { ok: true };
}

/** Exclui uma diária (escala) — exige a senha de login de quem solicita */
export async function deleteDiariaAction(
  allocationId: string,
  password: string
): Promise<ActionResult> {
  if (!password) return { ok: false, error: "Informe sua senha para confirmar." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const verifier = createSupabaseJs(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error: authError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (authError)
    return { ok: false, error: "Senha incorreta. Exclusão não autorizada." };

  const { data: alloc } = await supabase
    .from("employee_allocations")
    .select("id, status, employees(full_name)")
    .eq("id", allocationId)
    .single();
  if (!alloc) return { ok: false, error: "Diária não encontrada." };

  const { error } = await supabase
    .from("employee_allocations")
    .delete()
    .eq("id", allocationId);
  if (error) return { ok: false, error: "Erro ao excluir. " + error.message };

  await logActivity({
    entity_type: "employee_allocation",
    entity_id: allocationId,
    action: "deleted",
    description: `Diária de "${(alloc.employees as { full_name: string } | null)?.full_name ?? "?"}" (${alloc.status}) EXCLUÍDA por ${user.email} (senha confirmada)`,
  });

  revalidatePath("/diarias");
  return { ok: true };
}

const receivableSchema = z.object({
  client_id: z.string().optional(),
  description: z.string().min(2, "Descreva a conta a receber"),
  amount: z.coerce.number().min(0.01, "Informe o valor"),
  due_date: z.string().min(1, "Informe a data prevista"),
  document_type: z.enum(["nota_fiscal", "recibo", "outro"]),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
});

const payableSchema = z.object({
  category: z.string().min(1, "Selecione a categoria"),
  description: z.string().min(2, "Descreva a despesa"),
  amount: z.coerce.number().min(0.01, "Informe o valor"),
  interest_amount: z.coerce.number().min(0).optional().default(0),
  due_date: z.string().min(1, "Informe o vencimento"),
  competence_month: z.coerce.number().int().min(1).max(12),
  competence_year: z.coerce.number().int().min(2020).max(2100),
  payment_method: z.string().optional(),
  responsible: z.string().optional(),
  notes: z.string().optional(),
});

export async function createReceivableAction(input: unknown): Promise<ActionResult> {
  const parsed = receivableSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { client_id, ...rest } = parsed.data;
  const { error } = await supabase.from("receivables").insert({
    ...emptyToNull(rest),
    client_id: client_id || null,
    status: "pendente",
  });
  if (error) return { ok: false, error: "Erro ao salvar. " + error.message };

  revalidatePath("/financeiro/receber");
  revalidatePath("/financeiro");
  return { ok: true };
}

/** Edita uma conta a receber (descrição, valor, data, tipo) */
export async function updateReceivableAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = receivableSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { client_id, ...rest } = parsed.data;
  const { error } = await supabase
    .from("receivables")
    .update({ ...emptyToNull(rest), client_id: client_id || null })
    .eq("id", id);
  if (error) return { ok: false, error: "Erro ao salvar. " + error.message };

  revalidatePath("/financeiro/receber");
  revalidatePath("/financeiro");
  return { ok: true };
}

export async function updateReceivableStatusAction(
  id: string,
  status: "pendente" | "recebido" | "atrasado" | "cancelado"
): Promise<ActionResult> {
  const supabase = await createClient();
  const update: Record<string, unknown> = { status };
  update.received_at =
    status === "recebido" ? new Date().toISOString().slice(0, 10) : null;

  const { error } = await supabase
    .from("receivables")
    .update(update)
    .eq("id", id);
  if (error) return { ok: false, error: "Erro ao atualizar." };

  if (status === "recebido") {
    const { data: r } = await supabase
      .from("receivables")
      .select("description, amount")
      .eq("id", id)
      .single();
    await logActivity({
      entity_type: "receivable",
      entity_id: id,
      action: "received",
      description: `Recebido: ${r?.description ?? ""} (R$ ${Number(r?.amount ?? 0).toLocaleString("pt-BR")})`,
    });
  }

  revalidatePath("/financeiro/receber");
  revalidatePath("/financeiro");
  return { ok: true };
}

export async function deleteReceivableAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("receivables").delete().eq("id", id);
  if (error) return { ok: false, error: "Erro ao excluir." };
  revalidatePath("/financeiro/receber");
  return { ok: true };
}

export async function createPayableAction(input: unknown): Promise<ActionResult> {
  const parsed = payableSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const interest = Number(parsed.data.interest_amount) || 0;
  const { error } = await supabase.from("payables").insert({
    ...emptyToNull(parsed.data),
    // amount = valor original + juros (total a pagar)
    amount: Math.round((parsed.data.amount + interest) * 100) / 100,
    interest_amount: interest,
    status: "pendente",
  });
  if (error) return { ok: false, error: "Erro ao salvar. " + error.message };

  revalidatePath("/financeiro/pagar");
  revalidatePath("/financeiro");
  return { ok: true };
}

/** Edita uma conta a pagar (categoria, descrição, valores, datas) */
export async function updatePayableAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = payableSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const interest = Number(parsed.data.interest_amount) || 0;
  const { error } = await supabase
    .from("payables")
    .update({
      ...emptyToNull(parsed.data),
      // amount = valor original + juros (total), como no create
      amount: Math.round((parsed.data.amount + interest) * 100) / 100,
      interest_amount: interest,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Erro ao salvar. " + error.message };

  revalidatePath("/financeiro/pagar");
  revalidatePath("/financeiro");
  return { ok: true };
}

/**
 * Registra o pagamento pelo VALOR PAGO (como na planilha):
 * - pago acima do original → a diferença vira juros/encargos
 * - pago abaixo do original → pagamento parcial, o restante fica em aberto
 */
export async function payPayableAction(
  id: string,
  paidAmount: number
): Promise<ActionResult & { partial?: boolean; interest?: number }> {
  const supabase = await createClient();
  const { data: payable } = await supabase
    .from("payables")
    .select("*")
    .eq("id", id)
    .single();
  if (!payable) return { ok: false, error: "Despesa não encontrada." };

  const paid = Math.round((Number(paidAmount) || 0) * 100) / 100;
  if (paid <= 0) return { ok: false, error: "Informe o valor pago." };

  const original =
    Math.round(
      ((Number(payable.amount) || 0) - (Number(payable.interest_amount) || 0)) * 100
    ) / 100;
  const today = new Date().toISOString().slice(0, 10);

  if (paid >= original - 0.01) {
    // Pagamento integral (com ou sem juros)
    const interest = Math.max(0, Math.round((paid - original) * 100) / 100);
    const { error } = await supabase
      .from("payables")
      .update({
        amount: paid,
        interest_amount: interest,
        status: "pago",
        paid_at: today,
      })
      .eq("id", id);
    if (error) return { ok: false, error: "Erro ao registrar pagamento." };

    revalidatePath("/financeiro/pagar");
    revalidatePath("/financeiro");
    return { ok: true, interest };
  }

  // Pagamento parcial: quita o valor pago e cria o saldo restante
  const remainder = Math.round((original - paid) * 100) / 100;
  const { error } = await supabase
    .from("payables")
    .update({
      amount: paid,
      interest_amount: 0,
      status: "pago",
      paid_at: today,
      notes: `${payable.notes ? payable.notes + " | " : ""}Pago parcial: R$ ${paid.toFixed(2)} de R$ ${original.toFixed(2)}`,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Erro ao registrar pagamento." };

  await supabase.from("payables").insert({
    category: payable.category,
    description: `${payable.description} (saldo restante)`,
    amount: remainder,
    interest_amount: 0,
    due_date: payable.due_date,
    competence_month: payable.competence_month,
    competence_year: payable.competence_year,
    payment_method: payable.payment_method,
    status: "pendente",
    notes: `Saldo restante do pagamento parcial de "${payable.description}"`,
  });

  revalidatePath("/financeiro/pagar");
  revalidatePath("/financeiro");
  return { ok: true, partial: true };
}

export async function updatePayableStatusAction(
  id: string,
  status: "pendente" | "pago" | "atrasado" | "cancelado"
): Promise<ActionResult> {
  const supabase = await createClient();
  const update: Record<string, unknown> = { status };
  update.paid_at =
    status === "pago" ? new Date().toISOString().slice(0, 10) : null;

  // Desfazer pagamento: estorna os juros e volta ao valor original
  if (status === "pendente") {
    const { data: payable } = await supabase
      .from("payables")
      .select("amount, interest_amount")
      .eq("id", id)
      .single();
    if (payable && Number(payable.interest_amount) > 0) {
      update.amount =
        Math.round(
          ((Number(payable.amount) || 0) - (Number(payable.interest_amount) || 0)) * 100
        ) / 100;
      update.interest_amount = 0;
    }
  }

  const { error } = await supabase.from("payables").update(update).eq("id", id);
  if (error) return { ok: false, error: "Erro ao atualizar." };

  revalidatePath("/financeiro/pagar");
  revalidatePath("/financeiro");
  return { ok: true };
}

export async function deletePayableAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("payables").delete().eq("id", id);
  if (error) return { ok: false, error: "Erro ao excluir." };
  revalidatePath("/financeiro/pagar");
  return { ok: true };
}

/** Ajusta valores de uma diária (escala) — recalcula saldo e total. */
export async function updateAllocationValuesAction(
  allocationId: string,
  values: {
    daily_rate: number;
    vr_amount: number;
    vt_amount: number;
    advance_amount: number;
  }
): Promise<ActionResult> {
  const supabase = await createClient();

  const daily = Number(values.daily_rate) || 0;
  const vr = Number(values.vr_amount) || 0;
  const vt = Number(values.vt_amount) || 0;
  const advance = Number(values.advance_amount) || 0;
  const total = Math.round((daily + vr + vt) * 100) / 100;
  const balance = Math.round((total - advance) * 100) / 100;

  const { error } = await supabase
    .from("employee_allocations")
    .update({
      daily_rate: daily,
      vr_amount: vr,
      vt_amount: vt,
      advance_amount: advance,
      total_amount: total,
      balance_amount: balance,
    })
    .eq("id", allocationId);
  if (error) return { ok: false, error: "Erro ao ajustar valores." };

  revalidatePath("/diarias");
  return { ok: true };
}

export async function markAllocationsPaidAction(
  allocationIds: string[],
  options?: { paidDate?: string; label?: string }
): Promise<ActionResult & { totalPaid?: number }> {
  if (allocationIds.length === 0)
    return { ok: false, error: "Selecione pelo menos uma diária." };

  const supabase = await createClient();

  // Soma o que será pago (saldo de cada diária) antes de marcar
  const { data: allocations } = await supabase
    .from("employee_allocations")
    .select("id, balance_amount, total_amount")
    .in("id", allocationIds);
  const totalPaid =
    Math.round(
      (allocations ?? []).reduce(
        (acc, a) =>
          acc + (Number(a.balance_amount) || Number(a.total_amount) || 0),
        0
      ) * 100
    ) / 100;

  // Data do pagamento: informada pelo usuário ou hoje
  const payDate =
    options?.paidDate && /^\d{4}-\d{2}-\d{2}$/.test(options.paidDate)
      ? new Date(`${options.paidDate}T12:00:00`)
      : new Date();
  const payDateStr = payDate.toISOString().slice(0, 10);

  const { error } = await supabase
    .from("employee_allocations")
    .update({ status: "pago", paid: true, paid_at: payDate.toISOString() })
    .in("id", allocationIds);
  if (error) return { ok: false, error: "Erro ao marcar como pago." };

  // Alimenta o Financeiro: lança a despesa "Diárias Eventos" já paga
  if (totalPaid > 0) {
    await supabase.from("payables").insert({
      category: "Diárias Eventos",
      description: options?.label
        ? `Pagamento de diárias — ${options.label} (${allocationIds.length} diária(s))`
        : `Pagamento de diárias — ${allocationIds.length} diária(s)`,
      amount: totalPaid,
      interest_amount: 0,
      due_date: payDateStr,
      paid_at: payDateStr,
      competence_month: payDate.getMonth() + 1,
      competence_year: payDate.getFullYear(),
      status: "pago",
      payment_method: "PIX/Transferência",
      notes: "Lançado automaticamente pela tela de Diárias",
    });
  }

  await logActivity({
    entity_type: "employee_allocation",
    entity_id: null,
    action: "paid",
    description: `${allocationIds.length} diária(s) paga(s) — R$ ${totalPaid.toFixed(2)} lançado no Financeiro (Diárias Eventos)`,
  });

  revalidatePath("/diarias");
  revalidatePath("/financeiro/pagar");
  revalidatePath("/financeiro");
  return { ok: true, totalPaid };
}
