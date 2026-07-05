"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { getProposalPdfData } from "@/lib/pdf/proposal-data";
import { proposalPdfBuffer } from "@/lib/pdf/proposal-pdf";
import { logActivity, type ActionResult } from "./helpers";

export async function sendProposalEmailAction(
  proposalId: string,
  toEmail: string
): Promise<ActionResult> {
  const email = toEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Informe um e-mail válido." };

  if (!process.env.RESEND_API_KEY)
    return {
      ok: false,
      error:
        "RESEND_API_KEY não configurada. Preencha o .env.local (e as variáveis na Vercel) para enviar e-mails.",
    };

  const data = await getProposalPdfData(proposalId);
  if (!data) return { ok: false, error: "Proposta não encontrada." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Link público de aceite (botão no e-mail)
  const { data: proposalRow } = await supabase
    .from("proposals")
    .select("accept_token")
    .eq("id", proposalId)
    .single();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const acceptUrl = proposalRow?.accept_token
    ? `${appUrl}/aceite/${proposalRow.accept_token}`
    : null;

  const subject = `Proposta Comercial ${data.code} — Banho de Brilho`;
  const firstName = data.contact_name?.split(" ")[0] ?? "";
  const body = [
    `Olá${firstName ? ` ${firstName}` : ""}, tudo bem?`,
    ``,
    `Conforme solicitado, encaminhamos em anexo a proposta comercial ${data.code} referente ao serviço de limpeza para o evento ${data.event?.name ?? ""}.`,
    ``,
    ...(acceptUrl
      ? [
          `Para ACEITAR a proposta, basta clicar no link abaixo:`,
          acceptUrl,
          ``,
        ]
      : []),
    `Ficamos à disposição para ajustes ou esclarecimentos.`,
    ``,
    `Atenciosamente,`,
    `Banho de Brilho Limpezas Especiais`,
    `Telefones: (31) 3889-2960 / 99986-2960`,
  ].join("\n");

  const html = [
    `<p style="margin:0 0 8px">Olá${firstName ? ` ${firstName}` : ""}, tudo bem?</p>`,
    `<p style="margin:0 0 8px">Conforme solicitado, encaminhamos em anexo a proposta comercial <strong>${data.code}</strong> referente ao serviço de limpeza para o evento <strong>${data.event?.name ?? ""}</strong>.</p>`,
    ...(acceptUrl
      ? [
          `<div style="margin:20px 0;text-align:center">`,
          `<a href="${acceptUrl}" style="display:inline-block;background:#16A34A;color:#ffffff;font-weight:bold;font-size:16px;padding:14px 32px;border-radius:10px;text-decoration:none">✓ Aceitar proposta</a>`,
          `<p style="margin:8px 0 0;font-size:12px;color:#6B7280">Ao clicar, você confirma o aceite da proposta ${data.code} e nossa equipe é avisada na hora.</p>`,
          `</div>`,
        ]
      : []),
    `<p style="margin:0 0 8px">Ficamos à disposição para ajustes ou esclarecimentos.</p>`,
    `<p style="margin:16px 0 0">Atenciosamente,<br/>Banho de Brilho Limpezas Especiais<br/>Telefones: (31) 3889-2960 / 99986-2960</p>`,
  ].join("");

  let providerMessageId: string | null = null;
  let sendStatus = "enviado";
  let sendError: string | null = null;

  try {
    const pdf = await proposalPdfBuffer(data);
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data: sent, error } = await resend.emails.send({
      from: `Banho de Brilho <${process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"}>`,
      to: [email],
      subject,
      text: body,
      html,
      attachments: [
        {
          filename: `${data.code.replace("/", "-")}.pdf`,
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
    related_type: "proposal",
    related_id: proposalId,
    to_email: email,
    subject,
    body,
    provider: "resend",
    provider_message_id: providerMessageId,
    status: sendStatus,
    sent_by: user?.id ?? null,
  });

  if (sendStatus === "erro") {
    revalidatePath(`/propostas/${proposalId}`);
    return {
      ok: false,
      error: `Falha ao enviar: ${sendError}. O erro ficou registrado no histórico.`,
    };
  }

  // Rascunho/revisão vira "enviada" automaticamente
  if (["rascunho", "em_revisao_interna"].includes(data.status)) {
    await supabase
      .from("proposals")
      .update({ status: "enviada" })
      .eq("id", proposalId);
  }

  await logActivity({
    entity_type: "proposal",
    entity_id: proposalId,
    action: "email_sent",
    description: `Proposta ${data.code} enviada por e-mail para ${email}`,
  });

  revalidatePath("/propostas");
  revalidatePath(`/propostas/${proposalId}`);
  return { ok: true, id: proposalId };
}
