"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Search } from "lucide-react";
import { DeleteEmployeeButton } from "@/components/forms/DeleteEmployeeButton";
import { EMPLOYEE_ROLES } from "@/lib/validations/employee";
import { labelFor } from "@/lib/constants";
import { formatMoney, formatPhone, cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  ativo: "bg-green-100 text-green-800",
  inativo: "bg-gray-100 text-gray-600",
  bloqueado: "bg-red-100 text-red-700",
};

export interface EmployeeRow {
  id: string;
  full_name: string;
  main_role: string;
  phone: string | null;
  daily_rate: number;
  vr_rate: number;
  vt_rate: number;
  neighborhood: string | null;
  status: string;
}

export function EmployeesTable({ rows }: { rows: EmployeeRow[] }) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const filtered = q
    ? rows.filter((emp) => {
        const roleLabel = labelFor(EMPLOYEE_ROLES, emp.main_role).toLowerCase();
        return (
          emp.full_name.toLowerCase().includes(q) ||
          roleLabel.includes(q) ||
          (emp.neighborhood ?? "").toLowerCase().includes(q) ||
          (qDigits.length >= 3 &&
            (emp.phone ?? "").replace(/\D/g, "").includes(qDigits))
        );
      })
    : rows;

  return (
    <div>
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, função, telefone ou bairro..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-ink-muted">
          Nenhum resultado para &quot;{query}&quot;.
        </p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Função</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3 text-right">VT</th>
                <th className="px-4 py-3">Bairro</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-ink">
                    {emp.full_name}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {labelFor(EMPLOYEE_ROLES, emp.main_role)}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {formatPhone(emp.phone)}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-muted">
                    {formatMoney(Number(emp.vt_rate))}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {emp.neighborhood ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                        STATUS_STYLE[emp.status] ?? "bg-gray-100 text-gray-700"
                      )}
                    >
                      {emp.status === "ativo"
                        ? "Ativo"
                        : emp.status === "inativo"
                          ? "Inativo"
                          : "Bloqueado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/funcionarios/${emp.id}/editar`}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-petrol hover:bg-brand-petrol/5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Link>
                      <DeleteEmployeeButton
                        employeeId={emp.id}
                        employeeName={emp.full_name}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
