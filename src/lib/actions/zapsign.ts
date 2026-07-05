"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProposalPdfData } from "@/lib/pdf/proposal-data";
import { contractPdfBuffer } from "@/lib/pdf/contract-pdf";
import { COMPANY } from "@/lib/constants";
import { logActivity, type ActionResult } from "./helpers";

const ZAPSIGN_API = "https://api.zapsign.com.br/api/v1";
const ZAPSIGN_FOLDER = "/Banho de Brilho";

function apiToken(): string | null {
  return process.env.ZAPSIGN_API_TOKEN || null;
}

/**
 * Envia o contrato para assinatura na ZapSign (pasta "Banho de Brilho").
 * Cria dois signatários: o cliente e a Banho de Brilho.
 */
export async function sendToZapSignAction(
  contractId: string,
  signerName: string,
  signerEmail: string
): Promise<ActionResult & { signUrl?: string }> {
  const token = apiToken();
  if (!token)
    return {
      ok: false,
      error:
        "ZAPSIGN_API_TOKEN não configurado no .env.local. Pegue o token em ZapSign > Configurações > API.",
    };

  const name = signerName.trim();
  const email = signerEmail.trim().toLowerCase();
  if (name.length < 2) return { ok: false, error: "Informe o nome de quem assina." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Informe um e-mail válido." };

  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, code, proposal_id, generated_pdf_url, zapsign_doc_token")
    .eq("id", contractId)
    .single();
  if (!contract) return { ok: false, error: "Contrato não encontrado." };
  if (contract.zapsign_doc_token)
    return {
      ok: false,
      error: "Este contrato já foi enviado à ZapSign. Use o botão de verificar assinatura.",
    };

  const data = await getProposalPdfData(contract.proposal_id);
  if (!data) return { ok: false, error: "Dados da proposta não encontrados." };

  // Usa a versão assinada pela BB se existir; senão o PDF gerado
  let pdf: Buffer;
  if (contract.generated_pdf_url) {
    const { data: file } = await supabase.storage
      .from("documentos")
      .download(contract.generated_pdf_url);
    if (!file)
      return { ok: false, error: "Não foi possível ler o PDF no Storage." };
    pdf = Buffer.from(await file.arrayBuffer());
  } else {
    pdf = await contractPdfBuffer(data, contract.code);
  }

  let response: Response;
  try {
    response = await fetch(`${ZAPSIGN_API}/docs/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Contrato ${contract.code} — ${data.client?.name ?? ""}`,
        base64_pdf: pdf.toString("base64"),
        folder_path: ZAPSIGN_FOLDER,
        lang: "pt-br",
        signers: [
          {
            name,
            email,
            send_automatic_email: true,
            auto_reminder: 2,
          },
          {
            name: "Banho de Brilho Limpezas Especiais",
            email: COMPANY.email,
            send_automatic_email: true,
          },
        ],
      }),
    });
  } catch {
    return { ok: false, error: "Falha de conexão com a ZapSign. Tente novamente." };
  }

  const result = (await response.json()) as {
    token?: string;
    signers?: { name: string; sign_url: string }[];
    detail?: string;
  };

  if (!response.ok || !result.token)
    return {
      ok: false,
      error: `ZapSign recusou o envio: ${result.detail ?? response.statusText}`,
    };

  const clientSignUrl = result.signers?.[0]?.sign_url ?? null;

  await supabase
    .from("contracts")
    .update({
      zapsign_doc_token: result.token,
      zapsign_sign_url: clientSignUrl,
      zapsign_status: "pendente",
      status: "enviado",
      sent_at: new Date().toISOString(),
    })
    .eq("id", contractId);

  await logActivity({
    entity_type: "contract",
    entity_id: contractId,
    action: "zapsign_sent",
    description: `Contrato ${contract.code} enviado para assinatura na ZapSign (${email}) — pasta ${ZAPSIGN_FOLDER}`,
  });

  revalidatePath(`/contratos/${contractId}`);
  revalidatePath("/contratos");
  return { ok: true, signUrl: clientSignUrl ?? undefined };
}

/**
 * Consulta o status na ZapSign. Se todos assinaram, baixa o PDF
 * assinado para o Storage e marca o contrato como assinado.
 */
export async function checkZapSignStatusAction(
  contractId: string
): Promise<ActionResult & { signed?: boolean; statusLabel?: string }> {
  const token = apiToken();
  if (!token)
    return { ok: false, error: "ZAPSIGN_API_TOKEN não configurado no .env.local." };

  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, code, zapsign_doc_token, status")
    .eq("id", contractId)
    .single();
  if (!contract?.zapsign_doc_token)
    return { ok: false, error: "Este contrato não foi enviado pela ZapSign." };

  let response: Response;
  try {
    response = await fetch(`${ZAPSIGN_API}/docs/${contract.zapsign_doc_token}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return { ok: false, error: "Falha de conexão com a ZapSign." };
  }

  const doc = (await response.json()) as {
    status?: string;
    signed_file?: string | null;
    signers?: { name: string; status: string }[];
    detail?: string;
  };
  if (!response.ok)
    return { ok: false, error: `Erro na ZapSign: ${doc.detail ?? response.statusText}` };

  const assinados =
    doc.signers?.filter((s) => s.status === "signed").length ?? 0;
  const totalSigners = doc.signers?.length ?? 0;

  if (doc.status !== "signed") {
    await supabase
      .from("contracts")
      .update({ zapsign_status: `pendente (${assinados}/${totalSigners} assinaram)` })
      .eq("id", contractId);
    revalidatePath(`/contratos/${contractId}`);
    return {
      ok: true,
      signed: false,
      statusLabel: `Ainda pendente: ${assinados} de ${totalSigners} assinatura(s) concluída(s).`,
    };
  }

  // Documento totalmente assinado — baixa e guarda no Storage
  let storagePath: string | null = null;
  if (doc.signed_file) {
    try {
      const fileResponse = await fetch(doc.signed_file);
      if (fileResponse.ok) {
        const buffer = Buffer.from(await fileResponse.arrayBuffer());
        storagePath = `contratos/${contractId}/zapsign-assinado-${Date.now()}.pdf`;
        const { error: upError } = await supabase.storage
          .from("documentos")
          .upload(storagePath, buffer, {
            contentType: "application/pdf",
            upsert: true,
          });
        if (upError) storagePath = null;
      }
    } catch {
      storagePath = null;
    }
  }

  await supabase
    .from("contracts")
    .update({
      zapsign_status: "assinado",
      status: "assinado",
      signed_at: new Date().toISOString(),
      signed_by_name: "Assinatura digital via ZapSign",
      ...(storagePath ? { signed_pdf_url: storagePath } : {}),
    })
    .eq("id", contractId);

  await logActivity({
    entity_type: "contract",
    entity_id: contractId,
    action: "zapsign_signed",
    description: `Contrato ${contract.code} totalmente ASSINADO via ZapSign${storagePath ? " (PDF arquivado no sistema)" : ""}`,
  });

  revalidatePath(`/contratos/${contractId}`);
  revalidatePath("/contratos");
  return { ok: true, signed: true, statusLabel: "Contrato assinado por todos!" };
}
