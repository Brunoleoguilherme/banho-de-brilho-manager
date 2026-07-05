"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, ShieldAlert, X } from "lucide-react";
import { deleteEventAction } from "@/lib/actions/events";

export function DeleteEventButton({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await deleteEventAction(eventId, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
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
        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-red-50"
        title="Excluir evento"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Excluir
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <form
            onSubmit={handleDelete}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <ShieldAlert className="h-5 w-5 text-danger" />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-gray-400 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h3 className="text-base font-semibold text-ink">
              Excluir o evento &quot;{eventName}&quot;?
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              Esta ação não pode ser desfeita. Para confirmar, digite a{" "}
              <strong>sua senha de login</strong>:
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
                className="flex items-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? "Excluindo..." : "Excluir evento"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
