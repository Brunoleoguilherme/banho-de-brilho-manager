"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Voltar SEMPRE sobe um nível na hierarquia do menu (não usa o histórico
 * do navegador): /diarias/contador → /diarias; /propostas → /dashboard.
 */

// Seções que têm página própria de detalhe (/secao/{id})
const COM_DETALHE = new Set(["propostas", "contratos", "operacao"]);

const isId = (s: string) => /^[0-9a-f]{8}-[0-9a-f-]{18,}$/i.test(s);

function parentOf(pathname: string): string {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length <= 1) return "/dashboard";

  const parentSegs = segs.slice(0, -1);
  const last = parentSegs[parentSegs.length - 1];

  // /eventos/{id}/editar → /eventos (não existe página /eventos/{id});
  // /propostas/{id}/editar → /propostas/{id} (detalhe existe)
  if (isId(last) && !COM_DETALHE.has(segs[0])) return "/" + segs[0];
  return "/" + parentSegs.join("/");
}

export function BackButton() {
  const pathname = usePathname();

  // No dashboard não faz sentido voltar
  if (pathname === "/dashboard") return null;

  return (
    <Link
      href={parentOf(pathname)}
      className="mb-3 flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-brand-petrol print:hidden"
      title="Voltar para o menu anterior"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </Link>
  );
}
