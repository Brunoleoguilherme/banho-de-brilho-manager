"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { acceptProposalPublicAction } from "@/lib/actions/public-accept";

export function AcceptButton({ token, code }: { token: string; code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    if (
      !confirm(
        `Confirmar o aceite da proposta ${code}?\n\nAo confirmar, a Banho de Brilho será avisada e dará sequência ao contrato.`
      )
    )
      return;
    setBusy(true);
    setError(null);
    const result = await acceptProposalPublicAction(token);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível registrar o aceite.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-5">
      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      <button
        onClick={handleAccept}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-success px-6 py-4 text-base font-bold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-5 w-5" />
        )}
        {busy ? "Registrando aceite..." : "Aceitar proposta"}
      </button>
    </div>
  );
}
