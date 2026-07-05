"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Car, UtensilsCrossed, Plus, Trash2, Loader2 } from "lucide-react";
import {
  addStaffExpenseAction,
  deleteStaffExpenseAction,
} from "@/lib/actions/finance";
import { formatMoney, formatDate, cn } from "@/lib/utils";

export interface StaffExpense {
  id: string;
  expense_date: string;
  category: "transporte" | "refeicao";
  description: string | null;
  amount: number;
}

export interface QuinzenaTotais {
  dr1: number;
  dr2: number;
  vr1: number;
  vr2: number;
  vt1: number;
  vt2: number;
}

function ExpenseCard({
  title,
  hint,
  icon: Icon,
  category,
  mes,
  ano,
  expenses,
}: {
  title: string;
  hint: string;
  icon: typeof Car;
  category: "transporte" | "refeicao";
  mes: number;
  ano: number;
  expenses: StaffExpense[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: `${ano}-${String(mes).padStart(2, "0")}-01`,
    description: "",
    amount: "",
  });

  const q1 = expenses
    .filter((e) => Number(e.expense_date.slice(8, 10)) <= 15)
    .reduce((a, e) => a + e.amount, 0);
  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const q2 = total - q1;

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await addStaffExpenseAction({
        expense_date: form.date,
        category,
        description: form.description,
        amount: Number(form.amount),
      });
      if (!result.ok) {
        setError(result.error ?? "Erro ao lançar.");
        return;
      }
      setForm({ ...form, description: "", amount: "" });
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteStaffExpenseAction(id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4">
      <div className="mb-1 flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-teal" />
        <p className="text-sm font-semibold text-ink">{title}</p>
      </div>
      <p className="mb-3 text-[11px] text-ink-muted">{hint}</p>

      <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg bg-surface/60 p-2 text-center text-xs">
        <div>
          <p className="text-ink-muted">1ª quinz.</p>
          <p className="font-semibold text-ink">{formatMoney(q1)}</p>
        </div>
        <div>
          <p className="text-ink-muted">2ª quinz.</p>
          <p className="font-semibold text-ink">{formatMoney(q2)}</p>
        </div>
        <div>
          <p className="text-ink-muted">Total mês</p>
          <p className="font-bold text-brand-petrol">{formatMoney(total)}</p>
        </div>
      </div>

      {expenses.length > 0 && (
        <ul className="mb-3 max-h-36 divide-y divide-gray-50 overflow-y-auto text-sm">
          {expenses.map((e) => (
            <li key={e.id} className="flex items-center gap-2 py-1.5">
              <span className="w-16 shrink-0 text-xs text-ink-muted">
                {formatDate(e.expense_date)}
              </span>
              <span className="flex-1 truncate text-ink">
                {e.description || "—"}
              </span>
              <span className="font-medium text-ink">
                {formatMoney(e.amount)}
              </span>
              <button
                onClick={() => handleDelete(e.id)}
                disabled={isPending}
                className="rounded p-1 text-gray-400 hover:text-danger"
                title="Excluir lançamento"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mb-2 text-xs text-danger">{error}</p>}

      <div className="flex items-end gap-1.5">
        <input
          type="date"
          className="w-32 rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-brand-teal focus:outline-none"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <input
          type="text"
          placeholder="Descrição (Uber, marmitex...)"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-brand-teal focus:outline-none"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          type="number"
          min={0}
          step="0.01"
          placeholder="R$"
          className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-right text-xs focus:border-brand-teal focus:outline-none"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <button
          onClick={handleAdd}
          disabled={isPending || !form.amount || !form.date}
          className="flex items-center gap-1 rounded-lg bg-brand-teal px-2.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Lançar
        </button>
      </div>
    </div>
  );
}

function LinhaResumo({
  label,
  v1,
  v2,
  total,
  tone,
}: {
  label: string;
  v1: number;
  v2: number;
  total: number;
  tone: string;
}) {
  return (
    <div className={cn("rounded-lg p-3", tone)}>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide">{label}</p>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-[11px] opacity-75">1ª quinzena</p>
          <p className="font-semibold">{formatMoney(v1)}</p>
        </div>
        <div>
          <p className="text-[11px] opacity-75">2ª quinzena</p>
          <p className="font-semibold">{formatMoney(v2)}</p>
        </div>
        <div>
          <p className="text-[11px] opacity-75">Total do mês</p>
          <p className="font-bold">{formatMoney(total)}</p>
        </div>
      </div>
    </div>
  );
}

/** Resumo do mês: DR/VR/VT por quinzena + transporte e refeições avulsos */
export function ResumoMes({
  mes,
  ano,
  mesLabel,
  q,
  expenses,
}: {
  mes: number;
  ano: number;
  mesLabel: string;
  q: QuinzenaTotais;
  expenses: StaffExpense[];
}) {
  const dr = q.dr1 + q.dr2;
  const vr = q.vr1 + q.vr2;
  const vt = q.vt1 + q.vt2;
  const totalGeral = dr + vr + vt;
  const transporte = expenses.filter((e) => e.category === "transporte");
  const refeicao = expenses.filter((e) => e.category === "refeicao");

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-semibold text-ink">
          Resumo do mês — {mesLabel}
        </h2>
        <p className="text-xs text-ink-muted">
          Diárias, VR e VT por quinzena (da escala) + transporte e refeições
          avulsos da equipe
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
        <div className="space-y-3">
          <LinhaResumo
            label="Diárias"
            v1={q.dr1}
            v2={q.dr2}
            total={dr}
            tone="bg-amber-100 text-amber-900"
          />
          <LinhaResumo
            label="Vales refeições (VR)"
            v1={q.vr1}
            v2={q.vr2}
            total={vr}
            tone="bg-lime-100 text-lime-900"
          />
          <LinhaResumo
            label="Vales transporte (VT)"
            v1={q.vt1}
            v2={q.vt2}
            total={vt}
            tone="bg-gray-200 text-gray-800"
          />
          <div className="flex items-center justify-between rounded-lg bg-brand-petrol p-3 text-white">
            <p className="text-xs font-bold uppercase tracking-wide">
              Total diária + VR + VT
            </p>
            <p className="text-xl font-bold text-brand-gold">
              {formatMoney(totalGeral)}
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <ExpenseCard
            title="Transporte de funcionários"
            hint="Uber, táxi, mototáxi, vans..."
            icon={Car}
            category="transporte"
            mes={mes}
            ano={ano}
            expenses={transporte}
          />
          <ExpenseCard
            title="Refeições de funcionários"
            hint="Marmitex, lanches..."
            icon={UtensilsCrossed}
            category="refeicao"
            mes={mes}
            ano={ano}
            expenses={refeicao}
          />
        </div>
      </div>
    </div>
  );
}
