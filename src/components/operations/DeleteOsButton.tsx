"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ShieldAlert, Loader2 } from "lucide-react";
import { deleteOperationOrderAction } from "@/lib/actions/operations";

/** Lixeira da lista de OS — exclusão com confirmação por senha de login */
export function DeleteOsButton({
  osId,
  osCode,
  clientName,
}: {
  osId: string;
  osCode: string;
  clientName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await deleteOperationOrderAction(osId, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setPassword("");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setPassword("");
          setError(null);
        }}
        className="rounded p-1.5 text-gray-400 transition hover:text-danger"
        title="Excluir OS (pede senha)"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <form
            onSubmit={handleConfirm}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <ShieldAlert className="h-5 w-5 text-danger" />
            </div>
            <h3 className="text-base font-semibold text-ink">
              Excluir a {osCode}?
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              {clientName}. Os turnos, a escala e o checklist desta OS também
              serão apagados (diárias já pagas bloqueiam a exclusão). Para
              confirmar, digite a <strong>sua senha de login</strong>:
            </p>
            {error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}
            <input
              type="password"
              required
              autoFocus
              className="input-base mt-3"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy || !password}
                className="flex items-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Excluir OS
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
