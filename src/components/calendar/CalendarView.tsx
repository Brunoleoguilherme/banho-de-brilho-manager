"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  X,
  CalendarDays,
  FileDown,
} from "lucide-react";
import {
  createCalendarTaskAction,
  toggleCalendarTaskAction,
  deleteCalendarTaskAction,
} from "@/lib/actions/calendar";
import { cn } from "@/lib/utils";

export interface CalendarEntry {
  key: string;
  event_id: string;
  name: string;
  client_name: string;
  date: string;
  type_label: string;
  color: string;
  os_id: string | null;
  os_code: string | null;
}

export interface CalendarTask {
  id: string;
  title: string;
  task_date: string;
  task_time: string | null;
  notes: string | null;
  done: boolean;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function CalendarView({
  entries,
  tasks,
}: {
  entries: CalendarEntry[];
  tasks: CalendarTask[];
}) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", task_time: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate());
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function navigate(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function eventsOn(dayIso: string) {
    return entries.filter((e) => e.date === dayIso);
  }

  // Legenda com os tipos presentes no calendário
  const legend = Array.from(
    new Map(entries.map((e) => [e.type_label, e.color])).entries()
  );

  function tasksOn(dayIso: string) {
    return tasks
      .filter((t) => t.task_date === dayIso)
      .sort((a, b) => (a.task_time ?? "99") < (b.task_time ?? "99") ? -1 : 1);
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!modalDate) return;
    setBusy(true);
    setError(null);
    const result = await createCalendarTaskAction({
      title: form.title,
      task_date: modalDate,
      task_time: form.task_time || undefined,
      notes: form.notes || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setModalDate(null);
    setForm({ title: "", task_time: "", notes: "" });
    router.refresh();
  }

  async function handleToggle(task: CalendarTask) {
    await toggleCalendarTaskAction(task.id, !task.done);
    router.refresh();
  }

  async function handleDelete(task: CalendarTask) {
    if (!confirm(`Excluir a tarefa "${task.title}"?`)) return;
    await deleteCalendarTaskAction(task.id);
    router.refresh();
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-card print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg border border-gray-200 p-2 text-ink-muted hover:bg-gray-50"
            title="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="min-w-44 text-center text-lg font-bold text-ink">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            onClick={() => navigate(1)}
            className="rounded-lg border border-gray-200 p-2 text-ink-muted hover:bg-gray-50"
            title="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setYear(now.getFullYear());
              setMonth(now.getMonth());
            }}
            className="ml-2 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-petrol hover:bg-brand-petrol/5"
          >
            Hoje
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
          {legend.map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-petrol" />
            Tarefa
          </span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-gray-50"
            title="Gera um PDF do mês em exibição (escolha 'Salvar como PDF' na impressão)"
          >
            <FileDown className="h-4 w-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      <h2 className="mb-2 hidden text-lg font-bold text-ink print:block">
        Banho de Brilho — Calendário de {MONTH_NAMES[month]} {year}
      </h2>

      <div className="cal-grid overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card print:rounded-none print:shadow-none">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50 text-center text-xs font-semibold uppercase tracking-wide text-ink-muted print:bg-white print:text-black">
          {WEEKDAYS.map((d) => (
            <div key={d} className="cal-head py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (day === null)
              return <div key={i} className="cal-cell min-h-28 border-b border-r border-gray-50 bg-gray-50/50 print:bg-white" />;
            const dayIso = iso(year, month, day);
            const dayEvents = eventsOn(dayIso);
            const dayTasks = tasksOn(dayIso);
            const isToday = dayIso === todayIso;
            return (
              <div
                key={i}
                className={cn(
                  "cal-cell group min-h-28 border-b border-r border-gray-50 p-1.5 align-top print:bg-white",
                  isToday && "bg-teal-50/60"
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold print:text-sm print:font-bold print:text-black",
                      isToday ? "bg-brand-teal text-white print:bg-white" : "text-ink-muted"
                    )}
                  >
                    {day}
                  </span>
                  <button
                    onClick={() => {
                      setModalDate(dayIso);
                      setError(null);
                    }}
                    className="rounded p-0.5 text-gray-300 opacity-0 transition hover:bg-brand-petrol/10 hover:text-brand-petrol group-hover:opacity-100"
                    title="Adicionar tarefa neste dia"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {dayEvents.map((ev) => (
                    <Link
                      key={ev.key}
                      href={
                        ev.os_id
                          ? `/operacao/${ev.os_id}`
                          : `/eventos/${ev.event_id}/editar`
                      }
                      title={`${ev.name} — ${ev.client_name} · ${ev.type_label}${ev.os_code ? ` (${ev.os_code})` : " (sem OS)"}`}
                      className="cal-chip block break-words rounded px-1.5 py-0.5 text-[10px] font-medium leading-snug text-white hover:opacity-85"
                      style={{ backgroundColor: ev.color }}
                    >
                      {ev.name}
                      <span className="block text-[9px] font-normal opacity-85">
                        {ev.type_label}
                      </span>
                    </Link>
                  ))}
                  {dayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="group/task flex items-start gap-1 rounded bg-brand-petrol/10 px-1.5 py-0.5 print:border print:border-black print:border-dashed print:bg-white"
                      title={task.notes ?? task.title}
                    >
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => handleToggle(task)}
                        className="mt-0.5 h-3 w-3 rounded border-gray-300 text-brand-petrol focus:ring-brand-petrol print:hidden"
                      />
                      <span
                        className={cn(
                          "flex-1 break-words text-[10px] font-medium leading-snug text-brand-dark print:font-bold print:text-black",
                          task.done && "text-ink-muted line-through"
                        )}
                      >
                        {task.task_time ? `${task.task_time.slice(0, 5)} ` : ""}
                        {task.title}
                      </span>
                      <button
                        onClick={() => handleDelete(task)}
                        className="hidden text-gray-400 hover:text-danger group-hover/task:block"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setModalDate(null)}
        >
          <form
            onSubmit={handleAddTask}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-brand-teal" />
                <h3 className="text-base font-semibold text-ink">
                  Nova tarefa —{" "}
                  {modalDate.split("-").reverse().join("/")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalDate(null)}
                className="rounded p-1 text-gray-400 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <input
              required
              autoFocus
              className="input-base mb-3"
              placeholder="O que precisa ser feito? *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <div className="mb-3 flex gap-3">
              <div className="w-32">
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Horário (opcional)
                </label>
                <input
                  type="time"
                  className="input-base"
                  value={form.task_time}
                  onChange={(e) => setForm({ ...form, task_time: e.target.value })}
                />
              </div>
            </div>
            <textarea
              rows={2}
              className="input-base mb-4"
              placeholder="Observações (opcional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalDate(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy || !form.title.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-brand-petrol px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar tarefa
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
