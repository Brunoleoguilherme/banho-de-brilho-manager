"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, MailCheck, Mail, Send } from "lucide-react";
import {
  inviteUserAction,
  resendInviteAction,
  updateUserAction,
} from "@/lib/actions/users";
import { cn } from "@/lib/utils";

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  active: boolean;
  confirmed: boolean; // já confirmou o e-mail e definiu senha
}

const PAPEIS = [
  { value: "admin", label: "Administrador" },
  { value: "comercial", label: "Comercial" },
  { value: "operacional", label: "Operacional" },
  { value: "financeiro", label: "Financeiro" },
  { value: "gestor", label: "Gestor" },
  { value: "consulta", label: "Consulta" },
];

export function UsersManager({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ full_name: "", email: "", role: "consulta" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const result = await inviteUserAction(form);
      if (result.ok) {
        setMsg({
          ok: true,
          text: `Convite enviado para ${form.email}. A pessoa recebe um e-mail, confirma e cria a própria senha.`,
        });
        setForm({ full_name: "", email: "", role: "consulta" });
        router.refresh();
      } else {
        setMsg({ ok: false, text: result.error ?? "Erro ao convidar." });
      }
    });
  }

  function handleResend(email: string) {
    setMsg(null);
    startTransition(async () => {
      const result = await resendInviteAction(email);
      setMsg(
        result.ok
          ? { ok: true, text: `Convite reenviado para ${email}.` }
          : { ok: false, text: result.error ?? "Erro ao reenviar." }
      );
    });
  }

  function handleUpdate(id: string, input: { role?: string; active?: boolean }) {
    startTransition(async () => {
      const result = await updateUserAction(id, input);
      if (!result.ok) setMsg({ ok: false, text: result.error ?? "Erro ao salvar." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Convidar novo usuário */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
        <div className="mb-1 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-brand-teal" />
          <h2 className="text-base font-semibold text-ink">Convidar novo usuário</h2>
        </div>
        <p className="mb-4 text-sm text-ink-muted">
          A pessoa recebe um e-mail de convite, confirma e define a própria
          senha — sem precisar mexer no Supabase.
        </p>

        {msg && (
          <div
            className={cn(
              "mb-4 rounded-lg border px-4 py-3 text-sm",
              msg.ok
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-danger"
            )}
          >
            {msg.text}
          </div>
        )}

        <form onSubmit={handleInvite} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            required
            className="input-base"
            placeholder="Nome completo *"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <input
            required
            type="email"
            className="input-base"
            placeholder="E-mail *"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <select
            className="input-base"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {PAPEIS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar convite
          </button>
        </form>
      </div>

      {/* Lista de usuários */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-ink">
            Usuários do sistema
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">E-mail confirmado</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-ink">{u.full_name || "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                      value={u.role}
                      disabled={isPending}
                      onChange={(e) => handleUpdate(u.id, { role: e.target.value })}
                    >
                      {PAPEIS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {u.confirmed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                        <MailCheck className="h-3.5 w-3.5" />
                        Confirmado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                        <Mail className="h-3.5 w-3.5" />
                        Aguardando
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                        u.active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {u.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                      {!u.confirmed && (
                        <button
                          onClick={() => handleResend(u.email)}
                          disabled={isPending}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-petrol hover:bg-brand-petrol/5"
                        >
                          Reenviar convite
                        </button>
                      )}
                      <button
                        onClick={() => handleUpdate(u.id, { active: !u.active })}
                        disabled={isPending}
                        className={cn(
                          "rounded-lg px-2.5 py-1.5 text-xs font-medium",
                          u.active
                            ? "text-danger hover:bg-red-50"
                            : "text-success hover:bg-green-50"
                        )}
                      >
                        {u.active ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
