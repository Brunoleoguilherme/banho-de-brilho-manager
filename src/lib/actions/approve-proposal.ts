"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { approveProposalCore } from "@/lib/approval";
import { type ActionResult } from "./helpers";

/**
 * Aceite manual da proposta (botão "Proposta aceita"):
 * gera contrato, OS, turnos, checklist e conta a receber.
 */
export async function approveProposalAction(
  proposalId: string
): Promise<ActionResult & { osId?: string; contractId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = await approveProposalCore(
    supabase,
    proposalId,
    `por ${user?.email ?? "usuário interno"}`,
    user?.id ?? null
  );

  if (!result.ok) return { ok: false, error: result.error ?? "Erro ao aprovar." };

  revalidatePath("/propostas");
  revalidatePath(`/propostas/${proposalId}`);
  revalidatePath("/contratos");
  revalidatePath("/operacao");
  revalidatePath("/financeiro/receber");

  return {
    ok: true,
    id: proposalId,
    osId: result.osId,
    contractId: result.contractId,
  };
}
