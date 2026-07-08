"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, MapPin, Search, Loader2 } from "lucide-react";
import { deleteLocationAction } from "@/lib/actions/locations";
import type { LocationRow } from "@/components/locations/LocationForm";

function fullAddress(l: LocationRow): string {
  return [
    [l.address, l.address_number].filter(Boolean).join(", "),
    l.neighborhood,
    l.city ? `${l.city}/${l.state ?? ""}` : null,
  ]
    .filter(Boolean)
    .join(" — ");
}

export function LocationsTable({ locations }: { locations: LocationRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return locations;
    return locations.filter((l) =>
      [l.name, l.neighborhood, l.city, l.contact_name, l.contact_phone]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(t))
    );
  }, [q, locations]);

  async function handleDelete() {
    if (!confirmId) return;
    setBusy(true);
    setError(null);
    const result = await deleteLocationAction(confirmId, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirmId(null);
    setPassword("");
    router.refresh();
  }

  const total = (l: LocationRow) =>
    l.fem_cb + l.masc_cb + l.pne_cb;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          className="w-full text-sm outline-none"
          placeholder="Buscar por nome, bairro, cidade ou contato..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-ink-muted">
          <MapPin className="mx-auto mb-2 h-6 w-6 text-gray-300" />
          Nenhum local cadastrado ainda. Clique em “Novo local” para começar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3">Local</th>
                <th className="px-4 py-3">Endereço</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3 text-center">Cabines (F/M/PNE)</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-surface/60">
                  <td className="px-4 py-3 font-medium text-ink">{l.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{fullAddress(l) || "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {l.contact_name || "—"}
                    {l.contact_phone ? (
                      <span className="block text-xs">{l.contact_phone}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-center text-ink-muted">
                    {l.fem_cb} / {l.masc_cb} / {l.pne_cb}
                    <span className="ml-1 text-xs">(tot. {total(l)})</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/locais/${l.id}/editar`}
                        className="rounded p-1.5 text-gray-400 hover:text-brand-petrol"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmId(l.id);
                          setPassword("");
                          setError(null);
                        }}
                        className="rounded p-1.5 text-gray-400 hover:text-danger"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-ink">Excluir local</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Confirme sua senha para excluir. Os eventos que usam este local
              não serão apagados — apenas ficam sem o local vinculado.
            </p>
            <input
              type="password"
              className="input-base mt-4"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && <p className="mt-2 text-xs text-danger">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy || !password}
                className="flex items-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
