"use client";

import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortDir } from "@/lib/useSortable";

/**
 * Cabeçalho de tabela clicável que dispara a ordenação por uma coluna.
 * Mostra seta para cima/baixo na coluna ativa e um ícone neutro nas demais.
 */
export function SortableHeader({
  label,
  columnKey,
  activeKey,
  dir,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  columnKey: string;
  activeKey: string | null;
  dir: SortDir;
  onSort: (key: string) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = activeKey === columnKey;
  return (
    <th
      className={cn(
        "px-4 py-3",
        align === "right" && "text-right",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={cn(
          "inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-ink",
          align === "right" && "flex-row-reverse",
          active && "text-ink"
        )}
        title={`Ordenar por ${label}`}
      >
        <span>{label}</span>
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronDown className="h-3 w-3 shrink-0" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-30" />
        )}
      </button>
    </th>
  );
}
