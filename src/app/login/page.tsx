"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SiteLogo } from "@/components/site/SiteLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("E-mail ou senha incorretos. Verifique e tente novamente.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white p-4">
      {/* ===== Fundo com a identidade visual da marca ===== */}
      {/* brilho suave azul no topo direito */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-[#69A9CF]/15 blur-3xl" />
      {/* padrão de folhas à esquerda */}
      <div className="pointer-events-none absolute left-0 top-1/2 hidden -translate-y-1/2 sm:block">
        <svg width="180" height="360" viewBox="0 0 180 360" fill="none" aria-hidden>
          <path d="M60 20 A44 44 0 0 1 104 64 L60 64 Z" fill="#69A9CF" opacity="0.35" />
          <path d="M58 66 L58 110 A44 44 0 0 1 14 66 Z" fill="#69A9CF" opacity="0.35" />
          <path d="M106 66 A44 44 0 0 1 150 110 L106 110 Z" fill="#69A9CF" opacity="0.22" />
          <path d="M60 112 A44 44 0 0 1 104 156 L60 156 Z" fill="#A8CF00" opacity="0.35" />
          <path d="M58 158 L58 202 A44 44 0 0 1 14 158 Z" fill="#A8CF00" opacity="0.35" />
          <path d="M106 158 L150 158 A44 44 0 0 1 106 202 Z" fill="#A8CF00" opacity="0.25" />
        </svg>
      </div>
      {/* pontilhado no canto direito */}
      <svg
        className="pointer-events-none absolute right-6 top-24 hidden opacity-40 lg:block"
        width="140"
        height="140"
        aria-hidden
      >
        <defs>
          <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2.5" cy="2.5" r="2.5" fill="#69A9CF" />
          </pattern>
        </defs>
        <rect width="140" height="140" fill="url(#dots)" />
      </svg>
      {/* ondas verde → azul na base */}
      <svg
        className="pointer-events-none absolute bottom-0 left-0 w-full"
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="onda" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#A8CF00" />
            <stop offset="55%" stopColor="#7CBB55" />
            <stop offset="100%" stopColor="#4E8FC7" />
          </linearGradient>
        </defs>
        <path
          d="M0,110 C280,30 520,170 780,120 C1040,70 1240,140 1440,60 L1440,220 L0,220 Z"
          fill="url(#onda)"
        />
        <path
          d="M0,150 C300,80 560,190 820,150 C1080,110 1260,170 1440,110 L1440,220 L0,220 Z"
          fill="#4E8FC7"
          opacity="0.55"
        />
      </svg>

      {/* ===== Conteúdo ===== */}
      <div className="relative w-full max-w-md pb-24">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <SiteLogo className="h-20 w-auto" />
          </div>
          <p className="mt-2 text-sm font-medium text-[#64748B]">
            Sistema de gestão de limpezas especiais
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-100 bg-white/95 p-8 shadow-[0_20px_50px_-12px_rgba(15,39,66,0.25)] backdrop-blur"
        >
          <h2 className="mb-6 text-lg font-bold text-[#0F2742]">
            Entrar no sistema
          </h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-semibold text-[#0F2742]"
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#0F2742] outline-none transition focus:border-[#69A9CF] focus:ring-2 focus:ring-[#69A9CF]/30"
              placeholder="seu@email.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-semibold text-[#0F2742]"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#0F2742] outline-none transition focus:border-[#69A9CF] focus:ring-2 focus:ring-[#69A9CF]/30"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#A8CF00] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="mt-4 text-center">
            <Link
              href="/recuperar-senha"
              className="text-sm font-semibold text-[#4E8FC7] hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-[#64748B]">
          <Link href="/" className="font-semibold text-[#4E8FC7] hover:underline">
            ← Voltar para o site
          </Link>
        </p>
      </div>
    </div>
  );
}
