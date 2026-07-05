"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { getProposalPdfData } from "@/lib/pdf/proposal-data";
import { contractPdfBuffer } from "@/lib/pdf/contract-pdf";
import { logActivity, type ActionResult } from "./helpers";

export async function sendContractEmailAction(
  contractId: string,
  toEmail: string
): Promise<ActionResult> {
  const email = toEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Informe um e-mail válido." };

  if (!process.env.RESEND_API_KEY)
    return {
      ok: false,
      error: "RESEND_API_KEY não configurada no .env.local (e na Vercel).",
    };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, code, proposal_id, status, generated_pdf_url")
    .eq("id", contractId)
    .single();
  if (!contract) return { ok: false, error: "Contrato não encontrado." };

  const data = await getProposalPdfData(contract.proposal_id);
  if (!data) return { ok: false, error: "Dados da proposta não encontrados." };

  // Se existir versão já assinada pela Banho de Brilho, anexa ela;
  // senão, gera o PDF padrão do contrato
  let pdf: Buffer;
  let assinadoPelaBB = false;
  if (contract.generated_pdf_url) {
    const { data: file, error: dlError } = await supabase.storage
      .from("documentos")
      .download(contract.generated_pdf_url);
    if (dlError || !file)
      return {
        ok: false,
        error: "Não foi possível ler o contrato assinado pela Banho de Brilho no Storage.",
      };
    pdf = Buffer.from(await file.arrayBuffer());
    assinadoPelaBB = true;
  } else {
    pdf = await contractPdfBuffer(data, contract.code);
  }

  const firstName = data.contact_name?.split(" ")[0] ?? "";
  const subject = `Contrato ${contract.code} para assinatura — Banho de Brilho`;
  const body = [
    `Olá${firstName ? ` ${firstName}` : ""}, tudo bem?`,
    ``,
    `Encaminhamos em anexo o contrato ${contract.code}, referente à proposta ${data.code} (evento ${data.event?.name ?? ""})${assinadoPelaBB ? ", já assinado pela Banho de Brilho," : ""} para assinatura.`,
    ``,
    `Como assinar digitalmente (gratuito e com validade jurídica):`,
    `1. Acesse o Assinador do Governo Federal: https://assinatura.iti.gov.br`,
    `2. Entre com sua conta gov.br (nível prata ou ouro)`,
    `3. Envie o PDF anexo, posicione a assinatura e baixe o arquivo assinado`,
    `4. Responda este e-mail com o contrato assinado`,
    ``,
    `Se preferir assinar por outra plataforma (ZapSign, Clicksign etc.) ou de forma manuscrita, também aceitamos.`,
    ``,
    `Qualquer dúvida, estamos à disposição.`,
    ``,
    `Atenciosamente,`,
    `Banho de Brilho Limpezas Especiais`,
    `Telefones: (31) 3889-2960 / 99986-2960`,
  ].join("\n");

  const html = body
    .split("\n")
    .map((line) =>
      line
        ? `<p style="margin:0 0 4px">${line.replace(
            /(https?:\/\/\S+)/g,
            '<a href="$1">$1</a>'
          )}</p>`
        : "<br/>"
    )
    .join("");

  let providerMessageId: string | null = null;
  let sendStatus = "enviado";
  let sendError: string | null = null;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data: sent, error } = await resend.emails.send({
      from: `Banho de Brilho <${process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"}>`,
      to: [email],
      subject,
      text: body,
      html,
      attachments: [
        {
          filename: `${contract.code.replace("/", "-")}.pdf`,
          content: pdf,
        },
      ],
    });
    if (error) {
      sendStatus = "erro";
      sendError = error.message;
    } else {
      providerMessageId = sent?.id ?? null;
    }
  } catch (err) {
    sendStatus = "erro";
    sendError = err instanceof Error ? err.message : "Falha no envio";
  }

  await supabase.from("email_logs").insert({
    related_type: "contract",
    related_id: contractId,
    to_email: email,
    subject,
    body,
    provider: "resend",
    provider_message_id: providerMessageId,
    status: sendStatus,
    sent_by: user?.id ?? null,
  });

  if (sendStatus === "erro")
    return {
      ok: false,
      error: `Falha ao enviar: ${sendError}. O erro ficou registrado no histórico.`,
    };

  if (contract.status === "gerado") {
    await supabase
      .from("contracts")
      .update({ status: "enviado", sent_at: new Date().toISOString() })
      .eq("id", contractId);
  }

  await logActivity({
    entity_type: "contract",
    entity_id: contractId,
    action: "email_sent",
    description: `Contrato ${contract.code} enviado por e-mail para ${email} (com instruções de assinatura gov.br)`,
  });

  revalidatePath(`/contratos/${contractId}`);
  revalidatePath("/contratos");
  return { ok: true };
}
