"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Pencil,
  FileDown,
  Send,
  ThumbsUp,
  ThumbsDown,
  MessagesSquare,
  CopyPlus,
  Ban,
  Hash,
  Loader2,
} from "lucide-react";
import {
  changeProposalStatusAction,
  createRevisionAction,
  updateProposalNumberAction,
} from "@/lib/actions/proposals";
import { sendProposalEmailAction } from "@/lib/actions/send-proposal";
import { approveProposalAction } from "@/lib/actions/approve-proposal";

interface ProposalActionsProps {
  proposalId: string;
  code: string;
  number: number;
  canRenumber: boolean;
  status: string;
  hasBeenSent: boolean;
  contactEmail: string | null;
}

export function ProposalActions({
  proposalId,
  code,
  number,
  canRenumber,
  status,
  hasBeenSent,
  contactEmail,
}: ProposalActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSend, setShowSend] = useState(false);
  const [email, setEmail] = useState(contactEmail ?? "");
  const [showNumber, setShowNumber] = useState(false);
  const [numberValue, setNumberValue] = useState(String(number));

  async function handleNumber(e: React.FormEvent) {
    e.preventDefault();
    setBusy("number");
    setError(null);
    const result = await updateProposalNumberAction(
      proposalId,
      Number(numberValue)
    );
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }
    setShowNumber(false);
    setBusy(null);
    router.refresh();
  }

  // Proposta ainda "em aberto" (mostra aceite/recusa/negociação/cancelar)
  const editable = ["rascunho", "em_revisao_interna", "enviada", "em_negociacao"].includes(status);
  const isFinal = ["aprovada", "recusada", "cancelada", "convertida_contrato", "convertida_os"].includes(status);
  // Editar EM CIMA da proposta só antes de enviar ao cliente.
  const canEditInPlace =
    !hasBeenSent && ["rascunho", "em_revisao_interna"].includes(status);
  // Depois de enviada (ou já finalizada), alterar dados = criar revisão.
  const canRevise = status !== "cancelada" && (hasBeenSent || isFinal);

  async function changeStatus(
    newStatus: Parameters<typeof changeProposalStatusAction>[1],
    confirmText?: string
  ) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(newStatus);
    setError(null);
    const result = await changeProposalStatusAction(proposalId, newStatus);
    if (!result.ok) setError(result.error);
    setBusy(null);
    router.refresh();
  }

  async function handleApprove() {
    if (
      !confirm(
        `Confirmar o aceite da proposta ${code}?\n\nO sistema vai gerar automaticamente:\n• Contrato simplificado\n• Ordem de serviço com turnos e checklist\n• Conta a receber no Financeiro (${code})`
      )
    )
      return;
    setBusy("aprovada");
    setError(null);
    const result = await approveProposalAction(proposalId);
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }
    if (result.osId) {
      router.push(`/operacao/${result.osId}`);
    }
    router.refresh();
  }

  async function handleRevision() {
    if (
      !confirm(
        `Criar uma revisão de ${code}?\n\nSerá gerada uma nova versão com sufixo R (o número original é mantido), como rascunho, para você editar. Use isto quando a proposta já foi enviada ao cliente e precisa mudar algum dado.`
      )
    )
      return;
    setBusy("revision");
    const result = await createRevisionAction(proposalId);
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }
    router.push(`/propostas/${result.id}/editar`);
    router.refresh();
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setBusy("send");
    setError(null);
    const result = await sendProposalEmailAction(proposalId, email);
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }
    setShowSend(false);
    setBusy(null);
    router.refresh();
  }

  const btn =
    "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50";

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canEditInPlace && (
          <Link
            href={`/propostas/${proposalId}/editar`}
            className={`${btn} border border-gray-300 bg-white text-ink hover:bg-gray-50`}
          >
            <Pencil className="h-4 w-4" />
            Editar
          </Link>
        )}

        <a
          href={`/propostas/${proposalId}/pdf`}
          target="_blank"
          rel="noreferrer"
          className={`${btn} border border-gray-300 bg-white text-ink hover:bg-gray-50`}
        >
          <FileDown className="h-4 w-4" />
          Baixar PDF
        </a>

        {canRenumber && (
          <button
            onClick={() => setShowNumber((v) => !v)}
            className={`${btn} border border-gray-300 bg-white text-ink hover:bg-gray-50`}
          >
            <Hash className="h-4 w-4" />
            Alterar número
          </button>
        )}

        {!isFinal && (
          <button
            onClick={() => setShowSend((v) => !v)}
            className={`${btn} bg-brand-petrol text-white hover:bg-brand-dark`}
          >
            <Send className="h-4 w-4" />
            Enviar por e-mail
          </button>
        )}

        {editable && (
          <>
            <button
              onClick={handleApprove}
              disabled={busy !== null}
              className={`${btn} bg-success text-white hover:opacity-90`}
              title="Gera contrato, ordem de serviço, checklist e a conta a receber no Financeiro"
            >
              {busy === "aprovada" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ThumbsUp className="h-4 w-4" />
              )}
              Proposta aceita
            </button>
            <button
              onClick={() =>
                changeStatus("recusada", `Marcar ${code} como recusada?`)
              }
              disabled={busy !== null}
              className={`${btn} border border-red-200 bg-white text-danger hover:bg-red-50`}
            >
              <ThumbsDown className="h-4 w-4" />
              Recusada
            </button>
          </>
        )}

        {status === "enviada" && (
          <button
            onClick={() => changeStatus("em_negociacao")}
            disabled={busy !== null}
            className={`${btn} border border-amber-200 bg-white text-warning hover:bg-amber-50`}
          >
            <MessagesSquare className="h-4 w-4" />
            Em negociação
          </button>
        )}

        {canRevise && (
          <button
            onClick={handleRevision}
            disabled={busy !== null}
            className={`${btn} border border-gray-300 bg-white text-ink hover:bg-gray-50`}
          >
            {busy === "revision" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CopyPlus className="h-4 w-4" />
            )}
            Criar revisão
          </button>
        )}

        {!isFinal && status !== "rascunho" && (
          <button
            onClick={() =>
              changeStatus("cancelada", `Cancelar a proposta ${code}?`)
            }
            disabled={busy !== null}
            className={`${btn} text-ink-muted hover:bg-gray-100`}
          >
            <Ban className="h-4 w-4" />
            Cancelar proposta
          </button>
        )}
      </div>

      {showNumber && (
        <form
          onSubmit={handleNumber}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card"
        >
          <div>
            <label className="label-base">Novo número da proposta {code}</label>
            <input
              type="number"
              min={1}
              required
              className="input-base w-40"
              value={numberValue}
              onChange={(e) => setNumberValue(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={busy === "number"}
            className={`${btn} bg-brand-petrol text-white hover:bg-brand-dark`}
          >
            {busy === "number" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Hash className="h-4 w-4" />
            )}
            Salvar número
          </button>
          <p className="w-full text-xs text-ink-muted">
            O código é recalculado mantendo o ano e a revisão. Se a proposta tiver
            revisões, todas passam a usar o novo número. Não é permitido repetir um
            número já usado no mesmo ano.
          </p>
        </form>
      )}

      {showSend && (
        <form
          onSubmit={handleSend}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card"
        >
          <div className="min-w-64 flex-1">
            <label className="label-base">Enviar proposta {code} para:</label>
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
            disabled={busy === "send"}
            className={`${btn} bg-brand-petrol text-white hover:bg-brand-dark`}
          >
            {busy === "send" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {busy === "send" ? "Enviando..." : "Confirmar envio"}
          </button>
        </form>
      )}
    </div>
  );
}
