"use client";

import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

type Accessor<T> = (row: T) => string | number | null | undefined;

/**
 * Ordenação client-side reutilizável para tabelas.
 * - `accessors`: mapa de chave da coluna -> função que extrai o valor.
 * - Valores nulos/vazios vão sempre para o fim, independente da direção.
 * - Clicar na mesma coluna alterna asc/desc; em outra coluna começa em asc.
 */
export function useSortable<T>(
  rows: T[],
  accessors: Record<string, Accessor<T>>,
  initial?: { key: string; dir: SortDir }
) {
  const [key, setKey] = useState<string | null>(initial?.key ?? null);
  const [dir, setDir] = useState<SortDir>(initial?.dir ?? "asc");

  const sorted = useMemo(() => {
    if (!key || !accessors[key]) return rows;
    const acc = accessors[key];
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = acc(a);
      const vb = acc(b);
      const aEmpty = va === null || va === undefined || va === "";
      const bEmpty = vb === null || vb === undefined || vb === "";
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1; // nulos sempre por último
      if (bEmpty) return -1;
      let cmp: number;
      if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb), "pt-BR", { numeric: true });
      }
      return dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, key, dir, accessors]);

  function toggle(nextKey: string) {
    if (key === nextKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setKey(nextKey);
      setDir("asc");
    }
  }

  return { sorted, sortKey: key, sortDir: dir, toggle };
}
