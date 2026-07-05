"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/atualizar-senha`,
    });

    if (error) {
      setError("Não foi possível enviar o e-mail. Tente novamente.");
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dark p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Recuperar senha</h1>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          {sent ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
              <p className="text-sm text-ink">
                Enviamos um link de recuperação para <strong>{email}</strong>.
                Verifique sua caixa de entrada e o spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="mb-4 text-sm text-ink-muted">
                Informe seu e-mail e enviaremos um link para criar uma nova
                senha.
              </p>
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
                  {error}
                </div>
              )}
              <div className="mb-6">
                <label htmlFor="email" className="label-base">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="input-base"
                  placeholder="seu@email.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Enviar link de recuperação
              </button>
            </form>
          )}

          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="text-sm text-brand-petrol hover:underline"
            >
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
