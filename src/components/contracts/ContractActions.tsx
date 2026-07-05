"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, Send, FileCheck2, Upload, Loader2, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  markContractSentAction,
  markContractSignedAction,
  saveCompanySignedAction,
} from "@/lib/actions/contracts";
import { sendContractEmailAction } from "@/lib/actions/send-contract";
import {
  sendToZapSignAction,
  checkZapSignStatusAction,
} from "@/lib/actions/zapsign";
import { FileCheck, PenLine, RefreshCw, LinkIcon } from "lucide-react";

interface ContractActionsProps {
  contractId: string;
  code: string;
  status: string;
  signedPdfPath: string | null;
  companySignedPath?: string | null;
  contactEmail?: string | null;
  contactName?: string | null;
  zapsignDocToken?: string | null;
  zapsignSignUrl?: string | null;
  zapsignStatus?: string | null;
}

export function ContractActions({
  contractId,
  code,
  status,
  signedPdfPath,
  companySignedPath,
  contactEmail,
  contactName,
  zapsignDocToken,
  zapsignSignUrl,
  zapsignStatus,
}: ContractActionsProps) {
  const [showZap, setShowZap] = useState(false);
  const [zapName, setZapName] = useState(contactName ?? "");
  const [zapEmail, setZapEmail] = useState(contactEmail ?? "");
  const [zapInfo, setZapInfo] = useState<string | null>(null);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const bbFileRef = useRef<HTMLInputElement>(null);

  async function handleUploadCompanySigned(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("bb-upload");
    setError(null);

    const supabase = createClient();
    const path = `contratos/${contractId}/bb-assinado-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error: uploadError } = await supabase.storage
      .from("documentos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError("Falha ao enviar o arquivo. " + uploadError.message);
      setBusy(null);
      return;
    }

    const result = await saveCompanySignedAction(contractId, path);
    if (!result.ok) setError(result.error);
    setBusy(null);
    if (bbFileRef.current) bbFileRef.current.value = "";
    router.refresh();
  }
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSend, setShowSend] = useState(false);
  const [email, setEmail] = useState(contactEmail ?? "");

  async function handleSendZap(e: React.FormEvent) {
    e.preventDefault();
    setBusy("zap");
    setError(null);
    const result = await sendToZapSignAction(contractId, zapName, zapEmail);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setShowZap(false);
    setZapInfo(
      "Enviado! O cliente recebe o e-mail da ZapSign para assinar, e a Banho de Brilho também."
    );
    router.refresh();
  }

  async function handleCheckZap() {
    setBusy("zap-check");
    setError(null);
    setZapInfo(null);
    const result = await checkZapSignStatusAction(contractId);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setZapInfo(result.statusLabel ?? null);
    router.refresh();
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    setError(null);
    const result = await sendContractEmailAction(contractId, email);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setShowSend(false);
    router.refresh();
  }

  const btn =
    "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50";

  async function handleMarkSent() {
    if (!confirm(`Marcar o contrato ${code} como enviado ao cliente?`)) return;
    setBusy("sent");
    const result = await markContractSentAction(contractId);
    if (!result.ok) setError(result.error);
    setBusy(null);
    router.refresh();
  }

  async function handleUploadSigned(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const signedByName = prompt(
      "Quem assinou pelo cliente? (nome do responsável)"
    );

    setBusy("upload");
    setError(null);

    const supabase = createClient();
    const path = `contratos/${contractId}/assinado-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;

    const { error: uploadError } = await supabase.storage
      .from("documentos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(
        "Falha ao enviar o arquivo. Verifique se a migration 0003 foi executada (bucket 'documentos'). " +
          uploadError.message
      );
      setBusy(null);
      return;
    }

    const result = await markContractSignedAction(contractId, {
      signedPdfPath: path,
      signedByName: signedByName ?? undefined,
    });

    if (!result.ok) setError(result.error);
    setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  async function handleViewSigned() {
    if (!signedPdfPath) return;
    setBusy("view");
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("documentos")
      .createSignedUrl(signedPdfPath, 60 * 10);
    setBusy(null);
    if (error || !data?.signedUrl) {
      setError("Não foi possível abrir o arquivo assinado.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <a
          href={`/contratos/${contractId}/pdf`}
          target="_blank"
          rel="noreferrer"
          className={`${btn} border border-gray-300 bg-white text-ink hover:bg-gray-50`}
        >
          <FileDown className="h-4 w-4" />
          Baixar contrato (PDF)
        </a>

        {status !== "assinado" && status !== "cancelado" && (
          <>
            <button
              onClick={() => bbFileRef.current?.click()}
              disabled={busy !== null}
              className={`${btn} border ${companySignedPath ? "border-green-300 bg-green-50 text-success" : "border-gray-300 bg-white text-ink"} hover:bg-gray-50`}
              title="Assine o PDF no gov.br e suba aqui — este arquivo será o anexado no e-mail ao cliente"
            >
              {busy === "bb-upload" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileCheck className="h-4 w-4" />
              )}
              {companySignedPath
                ? "✓ Assinado pela BB (trocar arquivo)"
                : "Subir assinado pela Banho de Brilho"}
            </button>
            <input
              ref={bbFileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleUploadCompanySigned}
            />
            {!zapsignDocToken ? (
              <button
                onClick={() => setShowZap((v) => !v)}
                className={`${btn} bg-brand-teal text-white hover:opacity-90`}
                title="O cliente assina online, sem baixar nada — o PDF assinado volta sozinho para o sistema"
              >
                <PenLine className="h-4 w-4" />
                Assinar via ZapSign
              </button>
            ) : (
              <>
                <button
                  onClick={handleCheckZap}
                  disabled={busy !== null}
                  className={`${btn} border border-teal-300 bg-teal-50 text-brand-petrol hover:bg-teal-100`}
                >
                  {busy === "zap-check" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  ZapSign: {zapsignStatus ?? "pendente"} — verificar
                </button>
                {zapsignSignUrl && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(zapsignSignUrl);
                      setZapInfo("Link de assinatura copiado! Cole no WhatsApp do cliente.");
                    }}
                    className={`${btn} border border-gray-300 bg-white text-ink hover:bg-gray-50`}
                    title="Copia o link de assinatura do cliente para enviar por WhatsApp"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Copiar link de assinatura
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => setShowSend((v) => !v)}
              className={`${btn} bg-brand-petrol text-white hover:bg-brand-dark`}
            >
              <Send className="h-4 w-4" />
              Enviar por e-mail para assinatura
            </button>
          </>
        )}

        {status === "gerado" && (
          <button
            onClick={handleMarkSent}
            disabled={busy !== null}
            className={`${btn} border border-gray-300 bg-white text-ink hover:bg-gray-50`}
          >
            {busy === "sent" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Marcar como enviado (sem e-mail)
          </button>
        )}

        {status !== "assinado" && status !== "cancelado" && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy !== null}
              className={`${btn} bg-success text-white hover:opacity-90`}
            >
              {busy === "upload" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {busy === "upload"
                ? "Enviando arquivo..."
                : "Subir contrato assinado"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={handleUploadSigned}
            />
          </>
        )}

        {status === "enviado" && (
          <button
            onClick={async () => {
              const name = prompt("Quem assinou pelo cliente?");
              if (name === null) return;
              setBusy("signed");
              const result = await markContractSignedAction(contractId, {
                signedByName: name || undefined,
              });
              if (!result.ok) setError(result.error);
              setBusy(null);
              router.refresh();
            }}
            disabled={busy !== null}
            className={`${btn} border border-green-200 bg-white text-success hover:bg-green-50`}
          >
            <FileCheck2 className="h-4 w-4" />
            Marcar assinado (sem arquivo)
          </button>
        )}

        {zapInfo && (
          <p className="w-full rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-brand-petrol">
            {zapInfo}
          </p>
        )}

        {showZap && (
          <form
            onSubmit={handleSendZap}
            className="flex w-full flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card"
          >
            <div className="min-w-48 flex-1">
              <label className="label-base">Quem assina pelo cliente</label>
              <input
                required
                className="input-base"
                placeholder="Nome completo"
                value={zapName}
                onChange={(e) => setZapName(e.target.value)}
              />
            </div>
            <div className="min-w-56 flex-1">
              <label className="label-base">E-mail do signatário</label>
              <input
                type="email"
                required
                className="input-base"
                placeholder="email@cliente.com.br"
                value={zapEmail}
                onChange={(e) => setZapEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={busy === "zap"}
              className={`${btn} bg-brand-teal text-white hover:opacity-90`}
            >
              {busy === "zap" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PenLine className="h-4 w-4" />
              )}
              {busy === "zap" ? "Enviando..." : "Enviar para ZapSign"}
            </button>
          </form>
        )}

        {showSend && (
          <form
            onSubmit={handleSendEmail}
            className="flex w-full flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card"
          >
            <div className="min-w-64 flex-1">
              <label className="label-base">
                Enviar contrato {code} com instruções de assinatura (gov.br) para:
              </label>
              <input
                type="email"
                required
                className="input-base"
                placeholder="email@cliente.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={busy === "email"}
              className={`${btn} bg-brand-petrol text-white hover:bg-brand-dark`}
            >
              {busy === "email" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {busy === "email" ? "Enviando..." : "Confirmar envio"}
            </button>
          </form>
        )}

        {signedPdfPath && (
          <button
            onClick={handleViewSigned}
            disabled={busy !== null}
            className={`${btn} border border-gray-300 bg-white text-ink hover:bg-gray-50`}
          >
            {busy === "view" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            Ver contrato assinado
          </button>
        )}
      </div>
    </div>
  );
}
