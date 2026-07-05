"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { importRowsAction, type ImportType } from "@/lib/actions/import-data";

const TYPE_CONFIG: Record<
  ImportType,
  { label: string; fields: { key: string; label: string; required?: boolean }[] }
> = {
  funcionarios: {
    label: "Funcionários",
    fields: [
      { key: "full_name", label: "Nome completo", required: true },
      { key: "document", label: "CPF" },
      { key: "phone", label: "Telefone" },
      { key: "email", label: "E-mail" },
      { key: "city", label: "Cidade" },
      { key: "daily_rate", label: "Diária padrão" },
      { key: "vr_rate", label: "VR padrão" },
      { key: "vt_rate", label: "VT padrão" },
      { key: "pix_key", label: "Chave PIX" },
    ],
  },
  clientes: {
    label: "Clientes",
    fields: [
      { key: "name", label: "Nome / Fantasia", required: true },
      { key: "legal_name", label: "Razão social" },
      { key: "document", label: "CNPJ/CPF" },
      { key: "email", label: "E-mail" },
      { key: "phone", label: "Telefone" },
      { key: "city", label: "Cidade" },
      { key: "state", label: "UF" },
    ],
  },
  despesas: {
    label: "Despesas (contas a pagar)",
    fields: [
      { key: "description", label: "Descrição", required: true },
      { key: "amount", label: "Valor", required: true },
      { key: "category", label: "Categoria" },
      { key: "due_date", label: "Vencimento (dd/mm/aaaa)" },
      { key: "paid", label: "Pago? (sim/não)" },
    ],
  },
};

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";

  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      current.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      current.push(field);
      field = "";
      if (current.some((c) => c.trim() !== "")) rows.push(current);
      current = [];
    } else field += ch;
  }
  if (field !== "" || current.length > 0) {
    current.push(field);
    if (current.some((c) => c.trim() !== "")) rows.push(current);
  }

  const headers = (rows.shift() ?? []).map((h, i) => h.trim() || `Coluna ${i + 1}`);
  return { headers, rows };
}

export function ImportWizard() {
  const router = useRouter();
  const [type, setType] = useState<ImportType>("funcionarios");
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    skipped?: string[];
  } | null>(null);

  const config = TYPE_CONFIG[type];

  function autoMap(headers: string[], importType: ImportType) {
    const guesses: Record<string, string[]> = {
      full_name: ["nome", "funcion", "name"],
      name: ["nome", "cliente", "empresa", "fantasia"],
      legal_name: ["razao", "razão"],
      document: ["cpf", "cnpj", "documento"],
      phone: ["telefone", "fone", "celular", "whats"],
      email: ["mail"],
      city: ["cidade"],
      state: ["uf", "estado"],
      daily_rate: ["diaria", "diária", "dr"],
      vr_rate: ["vr", "refei"],
      vt_rate: ["vt", "transporte"],
      pix_key: ["pix"],
      description: ["descri", "item", "despesa", "historico", "histórico"],
      amount: ["valor", "total", "r$"],
      category: ["categoria", "tipo"],
      due_date: ["vencimento", "data"],
      paid: ["pago", "status"],
    };
    const map: Record<string, number> = {};
    for (const field of TYPE_CONFIG[importType].fields) {
      const terms = guesses[field.key] ?? [field.key];
      const idx = headers.findIndex((h) =>
        terms.some((t) => h.toLowerCase().includes(t))
      );
      if (idx >= 0) map[field.key] = idx;
    }
    return map;
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);

    let text = await file.text();
    if (text.includes("�")) {
      // Arquivo provavelmente em Windows-1252 (Excel brasileiro antigo)
      const buffer = await file.arrayBuffer();
      text = new TextDecoder("windows-1252").decode(buffer);
    }

    const parsed = parseCsv(text);
    setFileName(file.name);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping(autoMap(parsed.headers, type));
  }

  const mappedRows: Record<string, string>[] = rows.map((row) => {
    const obj: Record<string, string> = {};
    for (const field of config.fields) {
      const idx = mapping[field.key];
      obj[field.key] = idx !== undefined && idx >= 0 ? (row[idx] ?? "").trim() : "";
    }
    return obj;
  });

  const requiredKeys = config.fields.filter((f) => f.required).map((f) => f.key);
  const validCount = mappedRows.filter((r) =>
    requiredKeys.every((k) => r[k] && r[k].length > 1)
  ).length;

  async function handleImport() {
    if (
      !confirm(
        `Importar ${validCount} registro(s) de ${config.label.toLowerCase()}? Esta ação cria os cadastros no sistema.`
      )
    )
      return;
    setBusy(true);
    setResult(null);
    const response = await importRowsAction(type, mappedRows);
    setBusy(false);
    if (response.ok) {
      setResult({
        ok: true,
        message: `${response.inserted} registro(s) importado(s) com sucesso!`,
        skipped: response.skipped,
      });
      setRows([]);
      setHeaders([]);
      setFileName(null);
      router.refresh();
    } else {
      setResult({ ok: false, message: response.error, skipped: response.skipped });
    }
  }

  return (
    <div className="space-y-6">
      {result && (
        <div
          className={`rounded-xl border p-4 ${
            result.ok
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <p
            className={`flex items-center gap-2 text-sm font-medium ${
              result.ok ? "text-success" : "text-danger"
            }`}
          >
            {result.ok ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {result.message}
          </p>
          {result.skipped && result.skipped.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-xs text-ink-muted">
              {result.skipped.slice(0, 10).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
              {result.skipped.length > 10 && (
                <li>... e mais {result.skipped.length - 10} linha(s) ignorada(s)</li>
              )}
            </ul>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-ink">
          1. O que você quer importar?
        </h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_CONFIG) as ImportType[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t);
                if (headers.length > 0) setMapping(autoMap(headers, t));
              }}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                type === t
                  ? "bg-brand-petrol text-white"
                  : "bg-surface text-ink hover:bg-gray-200"
              }`}
            >
              {TYPE_CONFIG[t].label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-5 py-3 text-sm font-medium text-ink-muted transition hover:border-brand-teal hover:text-brand-petrol">
            <Upload className="h-4 w-4" />
            {fileName ?? "Escolher arquivo CSV..."}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
            />
          </label>
          <p className="mt-2 text-xs text-ink-muted">
            Dica: no Excel, use &quot;Salvar como → CSV&quot;. Acentos são detectados
            automaticamente.
          </p>
        </div>
      </div>

      {headers.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
          <h2 className="mb-1 text-base font-semibold text-ink">
            2. Ligue as colunas da planilha aos campos do sistema
          </h2>
          <p className="mb-4 text-sm text-ink-muted">
            {rows.length} linha(s) encontrada(s). Campos com * são obrigatórios.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {config.fields.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  {field.label}
                  {field.required && <span className="text-danger"> *</span>}
                </label>
                <select
                  className="input-base"
                  value={mapping[field.key] ?? -1}
                  onChange={(e) =>
                    setMapping({ ...mapping, [field.key]: Number(e.target.value) })
                  }
                >
                  <option value={-1}>— Não importar —</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {headers.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-ink">
            3. Confira a prévia ({validCount} de {rows.length} linhas válidas)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 uppercase tracking-wide text-ink-muted">
                <tr>
                  {config.fields.map((f) => (
                    <th key={f.key} className="px-3 py-2">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mappedRows.slice(0, 8).map((row, i) => {
                  const valid = requiredKeys.every((k) => row[k] && row[k].length > 1);
                  return (
                    <tr key={i} className={valid ? "" : "bg-red-50/50"}>
                      {config.fields.map((f) => (
                        <td key={f.key} className="px-3 py-2 text-ink">
                          {row[f.key] || <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length > 8 && (
              <p className="mt-2 text-xs text-ink-muted">
                ... e mais {rows.length - 8} linha(s)
              </p>
            )}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleImport}
              disabled={busy || validCount === 0}
              className="flex items-center gap-2 rounded-lg bg-brand-petrol px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {busy ? "Importando..." : `Importar ${validCount} registro(s)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
