"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { logActivity, type ActionResult } from "./helpers";

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

/** Exclui um contrato do sistema — exige senha de login */
export async function deleteContractAction(
  id: string,
  password: string
): Promise<ActionResult> {
  const email = await verifyPassword(password);
  if (!email)
    return { ok: false, error: "Senha incorreta. Exclusão não autorizada." };

  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, code, status")
    .eq("id", id)
    .single();
  if (!contract) return { ok: false, error: "Contrato não encontrado." };
  if (contract.status === "assinado")
    return {
      ok: false,
      error: `${contract.code} já está assinado e não pode ser excluído — isso apagaria um documento legal.`,
    };

  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) return { ok: false, error: "Erro ao excluir. " + error.message };

  await logActivity({
    entity_type: "contract",
    entity_id: id,
    action: "deleted",
    description: `Contrato ${contract.code} EXCLUÍDO por ${email} (senha confirmada)`,
  });
  revalidatePath("/contratos");
  return { ok: true };
}

/** Exclui um registro do histórico de contratos (OneDrive) — exige senha */
export async function deleteHistoricalContractAction(
  id: string,
  password: string
): Promise<ActionResult> {
  const email = await verifyPassword(password);
  if (!email)
    return { ok: false, error: "Senha incorreta. Exclusão não autorizada." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("historical_contracts")
    .select("id, code, client_name")
    .eq("id", id)
    .single();
  if (!row) return { ok: false, error: "Registro não encontrado." };

  const { error } = await supabase
    .from("historical_contracts")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: "Erro ao excluir. " + error.message };

  await logActivity({
    entity_type: "historical_contract",
    entity_id: id,
    action: "deleted",
    description: `Contrato histórico ${row.code ?? ""} (${row.client_name}) EXCLUÍDO por ${email} (senha confirmada)`,
  });
  revalidatePath("/contratos");
  return { ok: true };
}

export async function markContractSentAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, code")
    .eq("id", id)
    .single();
  if (!contract) return { ok: false, error: "Contrato não encontrado." };

  const { error } = await supabase
    .from("contracts")
    .update({ status: "enviado", sent_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "Erro ao atualizar contrato." };

  await logActivity({
    entity_type: "contract",
    entity_id: id,
    action: "sent",
    description: `Contrato ${contract.code} marcado como enviado`,
  });

  revalidatePath(`/contratos/${id}`);
  revalidatePath("/contratos");
  return { ok: true, id };
}

/** Guarda a versão do contrato já assinada pela Banho de Brilho (vai anexada no e-mail) */
export async function saveCompanySignedAction(
  id: string,
  path: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, code")
    .eq("id", id)
    .single();
  if (!contract) return { ok: false, error: "Contrato não encontrado." };

  const { error } = await supabase
    .from("contracts")
    .update({ generated_pdf_url: path })
    .eq("id", id);
  if (error) return { ok: false, error: "Erro ao salvar arquivo." };

  await logActivity({
    entity_type: "contract",
    entity_id: id,
    action: "company_signed",
    description: `Contrato ${contract.code}: versão assinada pela Banho de Brilho anexada`,
  });

  revalidatePath(`/contratos/${id}`);
  return { ok: true };
}

export async function markContractSignedAction(
  id: string,
  params: { signedPdfPath?: string; signedByName?: string }
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, code, proposal_id")
    .eq("id", id)
    .single();
  if (!contract) return { ok: false, error: "Contrato não encontrado." };

  const update: Record<string, unknown> = {
    status: "assinado",
    signed_at: new Date().toISOString(),
  };
  if (params.signedPdfPath) update.signed_pdf_url = params.signedPdfPath;
  if (params.signedByName) update.signed_by_name = params.signedByName;

  const { error } = await supabase.from("contracts").update(update).eq("id", id);
  if (error) return { ok: false, error: "Erro ao atualizar contrato." };

  if (params.signedPdfPath) {
    await supabase.from("documents").insert({
      related_type: "contract",
      related_id: id,
      file_name: params.signedPdfPath.split("/").pop() ?? "contrato-assinado.pdf",
      file_url: params.signedPdfPath,
      file_type: "application/pdf",
      uploaded_by: user?.id ?? null,
    });
  }

  // Proposta passa a "convertida em contrato"
  await supabase
    .from("proposals")
    .update({ status: "convertida_contrato" })
    .eq("id", contract.proposal_id)
    .eq("status", "aprovada");

  await logActivity({
    entity_type: "contract",
    entity_id: id,
    action: "signed",
    description: `Contrato ${contract.code} assinado${params.signedByName ? ` por ${params.signedByName}` : ""}`,
  });

  revalidatePath(`/contratos/${id}`);
  revalidatePath("/contratos");
  return { ok: true, id };
}
