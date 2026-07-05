"use server";

import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { Resend } from "resend";
import { approveProposalCore } from "@/lib/approval";
import { COMPANY } from "@/lib/constants";

/** Cliente admin (service role) — o visitante do link não tem login */
function adminClient() {
  return createSupabaseJs(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export interface PublicAcceptResult {
  ok: boolean;
  error?: string;
  code?: string;
}

/**
 * Aceite da proposta pelo CLIENTE, via link público enviado no e-mail.
 * Valida o token, roda a aprovação completa e avisa a Banho de Brilho.
 */
export async function acceptProposalPublicAction(
  acceptToken: string
): Promise<PublicAcceptResult> {
  if (!acceptToken || acceptToken.length < 30)
    return { ok: false, error: "Link inválido." };

  const supabase = adminClient();

  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, code, status, contact_name, contact_email, clients(name), events(name)")
    .eq("accept_token", acceptToken)
    .maybeSingle();

  if (!proposal)
    return { ok: false, error: "Proposta não encontrada. Confira o link com a Banho de Brilho." };

  if (proposal.status === "aprovada" || proposal.status.startsWith("convertida"))
    return { ok: true, code: proposal.code }; // já aceita — trata como sucesso

  if (["recusada", "cancelada"].includes(proposal.status))
    return {
      ok: false,
      error: `A proposta ${proposal.code} não está mais disponível para aceite. Fale com a Banho de Brilho: ${COMPANY.phones}.`,
    };

  const result = await approveProposalCore(
    supabase,
    proposal.id,
    `pelo CLIENTE via link de aceite (${proposal.contact_email ?? "e-mail não informado"})`,
    null
  );

  if (!result.ok) return { ok: false, error: result.error };

  // Aviso interno para a Banho de Brilho (não bloqueia o aceite se falhar)
  if (process.env.RESEND_API_KEY) {
    try {
      const clientName =
        (proposal.clients as unknown as { name: string } | null)?.name ?? "";
      const eventName =
        (proposal.events as unknown as { name: string } | null)?.name ?? "";
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `Banho de Brilho Manager <${process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"}>`,
        to: [COMPANY.email],
        subject: `✅ Proposta aceita pelo cliente — ${proposal.code}`,
        text: [
          `Boa notícia!`,
          ``,
          `A proposta ${proposal.code} (${clientName} — ${eventName}) foi ACEITA pelo cliente através do link de aceite.`,
          ``,
          `O sistema já gerou automaticamente:`,
          `• Contrato CT-${proposal.code}`,
          `• Ordem de serviço OS-${proposal.code}`,
          `• Conta a receber no Financeiro`,
          ``,
          `Próximos passos: enviar o contrato para assinatura e planejar a operação.`,
        ].join("\n"),
      });
    } catch {
      // segue sem aviso
    }
  }

  return { ok: true, code: proposal.code };
}
