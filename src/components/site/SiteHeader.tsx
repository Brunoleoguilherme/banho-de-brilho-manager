"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, FileText, LogIn } from "lucide-react";
import { SiteLogo } from "./SiteLogo";

const NAV = [
  { href: "#home", label: "Home" },
  { href: "#eventos", label: "Eventos" },
  { href: "#clientes", label: "Clientes" },
  { href: "#contato", label: "Contato" },
];

const BTN_VERDE =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#A8CF00] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105";
const BTN_BORDA =
  "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#69A9CF] bg-white px-5 py-2.5 text-sm font-bold text-[#0F2742] transition hover:bg-[#69A9CF]/10";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="#home" aria-label="Banho de Brilho — início">
          <SiteLogo className="h-11 w-auto" />
        </a>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-[#0F2742]/80 transition hover:text-[#0F2742]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a href="#contato" className={BTN_VERDE}>
            <FileText className="h-4 w-4" />
            Solicitar proposta
          </a>
          <Link href="/login" className={BTN_BORDA}>
            <LogIn className="h-4 w-4" />
            Login
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-[#0F2742] lg:hidden"
          aria-label="Abrir menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-white px-4 pb-6 pt-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#0F2742]/80 hover:bg-[#F5F7FA]"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <a href="#contato" onClick={() => setOpen(false)} className={BTN_VERDE}>
              <FileText className="h-4 w-4" />
              Solicitar proposta
            </a>
            <Link href="/login" className={BTN_BORDA}>
              <LogIn className="h-4 w-4" />
              Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
