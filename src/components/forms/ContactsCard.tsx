"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Star, Loader2 } from "lucide-react";
import {
  createContactAction,
  deleteContactAction,
} from "@/lib/actions/clients";
import { formatPhone } from "@/lib/utils";
import type { ClientContact } from "@/types";

export function ContactsCard({
  clientId,
  contacts,
}: {
  clientId: string;
  contacts: ClientContact[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createContactAction({
      client_id: clientId,
      ...form,
      is_primary: contacts.length === 0,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setForm({ name: "", role: "", email: "", phone: "" });
    setShowForm(false);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este contato?")) return;
    await deleteContactAction(id, clientId);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Contatos</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-petrol hover:bg-brand-petrol/5"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>

      {contacts.length === 0 && !showForm && (
        <p className="text-sm text-ink-muted">
          Nenhum contato cadastrado ainda.
        </p>
      )}

      <ul className="space-y-3">
        {contacts.map((contact) => (
          <li
            key={contact.id}
            className="flex items-start justify-between rounded-lg border border-gray-100 p-3"
          >
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                {contact.name}
                {contact.is_primary && (
                  <Star className="h-3.5 w-3.5 fill-brand-gold text-brand-gold" />
                )}
              </p>
              {contact.role && (
                <p className="text-xs text-ink-muted">{contact.role}</p>
              )}
              <p className="text-xs text-ink-muted">
                {[contact.email, formatPhone(contact.phone)]
                  .filter((v) => v && v !== "—")
                  .join(" · ")}
              </p>
            </div>
            <button
              onClick={() => handleDelete(contact.id)}
              className="rounded p-1 text-gray-400 hover:text-danger"
              title="Remover contato"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      {showForm && (
        <form onSubmit={handleAdd} className="mt-4 space-y-3 rounded-lg bg-surface p-4">
          {error && <p className="text-xs text-danger">{error}</p>}
          <input
            required
            className="input-base"
            placeholder="Nome do contato *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="input-base"
            placeholder="Cargo (ex.: Produtora)"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />
          <input
            type="email"
            className="input-base"
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="input-base"
            placeholder="Telefone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-brand-petrol px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              Salvar contato
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
