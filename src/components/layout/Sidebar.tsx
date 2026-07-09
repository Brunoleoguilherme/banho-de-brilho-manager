"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Building2,
  CalendarDays,
  MapPin,
  CalendarRange,
  FileText,
  FileSignature,
  ClipboardList,
  HardHat,
  Truck,
  Wallet,
  Landmark,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_ONLY_SECTIONS } from "@/lib/constants";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Building2 },
  { href: "/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/locais", label: "Locais", icon: MapPin },
  { href: "/propostas", label: "Propostas", icon: FileText },
  { href: "/contratos", label: "Contratos", icon: FileSignature },
  { href: "/operacao", label: "Operação", icon: ClipboardList },
  { href: "/calendario", label: "Calendário", icon: CalendarRange },
  { href: "/funcionarios", label: "Equipe", icon: HardHat },
  { href: "/veiculos", label: "Veículos", icon: Truck },
  { href: "/diarias", label: "Diárias", icon: Wallet },
  { href: "/financeiro", label: "Financeiro", icon: Landmark },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar({ role = "admin" }: { role?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Comercial vê só de Dashboard até Equipe; o resto é do Administrador
  const nav =
    role === "admin"
      ? mainNav
      : mainNav.filter(
          (item) =>
            !ADMIN_ONLY_SECTIONS.some((s) => item.href.startsWith(s))
        );

  // Fecha o menu ao navegar (mobile)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Botão hambúrguer — só no celular/tablet */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-dark text-white shadow-lg lg:hidden print:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Fundo escurecido quando o menu está aberto no celular */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-dark transition-transform duration-200 lg:z-40 lg:translate-x-0 print:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex items-center rounded-lg bg-white px-2.5 py-1.5">
          {/* Logo oficial — salve em /public/images/logo-banho-de-brilho.png */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-banho-de-brilho.png"
            alt="Banho de Brilho"
            className="h-8 w-auto"
          />
        </div>
        <p className="text-[11px] font-semibold text-brand-teal">Manager</p>
        <button
          onClick={() => setOpen(false)}
          className="ml-auto rounded-lg p-1.5 text-gray-300 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-brand-teal text-white"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="text-[11px] text-gray-400">
          Banho de Brilho Limpezas Especiais
        </p>
      </div>
      </aside>
    </>
  );
}
