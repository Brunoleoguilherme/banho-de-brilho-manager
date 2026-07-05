"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { DeleteClientButton } from "@/components/forms/DeleteClientButton";
import { formatPhone, formatDocument } from "@/lib/utils";

export interface ClientRow {
  id: string;
  name: string;
  legal_name: string | null;
  type: string;
  document: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
}

export function ClientsTable({ rows }: { rows: ClientRow[] }) {
  const [search, setSearch] = useState("");

  const term = search.trim().toLowerCase();
  const termDigits = term.replace(/\D/g, "");

  const filtered = rows.filter((c) => {
    if (!term) return true;
    const nameMatch = `${c.name} ${c.legal_name ?? ""}`.toLowerCase().includes(term);
    const docDigits = (c.document ?? "").replace(/\D/g, "");
    const docMatch = termDigits.length >= 3 && docDigits.includes(termDigits);
    return nameMatch || docMatch;
  });

  return (
    <div>
      <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input-base pl-9"
            placeholder="Buscar por nome, razão social ou CNPJ/CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        {term && (
          <p className="mt-2 text-xs text-ink-muted">
            {filtered.length} de {rows.length} cliente(s)
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">CNPJ / CPF</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Cidade</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-muted">
                  Nenhum cliente encontrado para &quot;{search}&quot;.
                </td>
              </tr>
            )}
            {filtered.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{client.name}</p>
                  <p className="text-xs text-ink-muted">
                    {client.type === "empresa" ? "Empresa" : "Pessoa física"}
                  </p>
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {formatDocument(client.document)}
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {formatPhone(client.phone)}
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {client.city ? `${client.city}/${client.state ?? ""}` : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/clientes/${client.id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-petrol hover:bg-brand-petrol/5"
                    >
                      Abrir
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                    <DeleteClientButton
                      clientId={client.id}
                      clientName={client.name}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
