"use client";

import { Download } from "lucide-react";

interface ExportCsvButtonProps {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  label?: string;
}

/** Exporta CSV compatível com Excel brasileiro (separador ; e BOM UTF-8). */
export function ExportCsvButton({
  filename,
  headers,
  rows,
  label = "Exportar CSV",
}: ExportCsvButtonProps) {
  function handleExport() {
    const escape = (v: string | number | null | undefined) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.map(escape).join(";"),
      ...rows.map((row) => row.map(escape).join(";")),
    ];
    const blob = new Blob(["﻿" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      disabled={rows.length === 0}
      className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-gray-50 disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}
