"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { getFolhaData } from "@/lib/folha";
import { folhaPdfBuffer } from "@/lib/pdf/folha-pdf";
import { logActivity, type ActionResult } from "./helpers";

/** Envia a folha "DIÁRIAS REFERENTE AO MÊS" por e-mail para o contador. */
export async function sendFolhaContadorAction(
  mes: number,
  ano: number,
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

  const data = await getFolhaData(mes, ano);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const subject = `Diárias referente ${data.mesLabel} — Banho de Brilho`;
  const body = [
    `Olá, tudo bem?`,
    ``,
    `Segue em anexo a relação de diárias referente a ${data.mesLabel} da Banho de Brilho Limpezas Especiais.`,
    ``,
    `Resumo: ${data.totais.totalDiarias} diária(s), ${data.totais.totalHoras}h, proventos R$ ${data.totais.proventos.toFixed(2).replace(".", ",")}, total líquido R$ ${data.totais.liquido.toFixed(2).replace(".", ",")}.`,
    ``,
    `Qualquer dúvida ficamos à disposição.`,
    ``,
    `Atenciosamente,`,
    `Banho de Brilho Limpezas Especiais`,
    `Telefones: (31) 3889-2960 / 99986-2960`,
  ].join("\n");

  const html = [
    `<p style="margin:0 0 8px">Olá, tudo bem?</p>`,
    `<p style="margin:0 0 8px">Segue em anexo a relação de diárias referente a <strong>${data.mesLabel}</strong> da Banho de Brilho Limpezas Especiais.</p>`,
    `<p style="margin:0 0 8px">Resumo: <strong>${data.totais.totalDiarias}</strong> diária(s), <strong>${data.totais.totalHoras}h</strong>, proventos <strong>R$ ${data.totais.proventos.toFixed(2).replace(".", ",")}</strong>, total líquido <strong>R$ ${data.totais.liquido.toFixed(2).replace(".", ",")}</strong>.</p>`,
    `<p style="margin:0 0 8px">Qualquer dúvida ficamos à disposição.</p>`,
    `<p style="margin:16px 0 0">Atenciosamente,<br/>Banho de Brilho Limpezas Especiais<br/>Telefones: (31) 3889-2960 / 99986-2960</p>`,
  ].join("");

  let providerMessageId: string | null = null;
  let sendStatus = "enviado";
  let sendError: string | null = null;

  try {
    const pdf = await folhaPdfBuffer(data);
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data: sent, error } = await resend.emails.send({
      from: `Banho de Brilho <${process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"}>`,
      to: [email],
      subject,
      text: body,
      html,
      attachments: [
        {
          filename: `DIARIAS-${String(mes).padStart(2, "0")}-${ano}.pdf`,
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
    related_type: "folha_diarias",
    related_id: null,
    to_email: email,
    subject,
    body,
    provider: "resend",
    provider_message_id: providerMessageId,
    status: sendStatus,
    sent_by: user?.id ?? null,
  });

  if (sendStatus === "erro")
    return { ok: false, error: `Falha ao enviar: ${sendError}` };

  // Guarda o e-mail do contador para as próximas vezes
  await supabase
    .from("app_settings")
    .upsert({ key: "contador_email", value: 0, text_value: email });

  await logActivity({
    entity_type: "folha_diarias",
    entity_id: null,
    action: "email_sent",
    description: `Folha de diárias ${data.mesLabel} enviada para o contador (${email})`,
  });

  revalidatePath("/diarias");
  return { ok: true };
}
