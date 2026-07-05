import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { labelFor, SERVICE_TYPES } from "@/lib/constants";
import {
  CalendarView,
  type CalendarEntry,
  type CalendarTask,
} from "@/components/calendar/CalendarView";

// Cor de cada tipo de serviço no calendário
const TYPE_COLORS: Record<string, string> = {
  limpeza_evento: "#0E7490",
  limpeza_montagem: "#3B82F6",
  limpeza_realizacao: "#06B6A9",
  limpeza_desmontagem: "#8B5CF6",
  limpeza_continua: "#16A34A",
  limpeza_especial: "#DB2777",
  apoio_operacional: "#F59E0B",
  outro: "#6B7280",
};

function rangeDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const d = new Date(start + "T12:00:00");
  const last = new Date((end || start) + "T12:00:00");
  let guard = 0;
  while (d <= last && guard < 60) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return dates;
}

export default async function CalendarPage() {
  const supabase = await createClient();

  const [{ data: events }, { data: schedules }, { data: tasks }] =
    await Promise.all([
      supabase
        .from("events")
        .select(
          "id, name, service_type, start_date, end_date, clients(name), operation_orders(id, code)"
        )
        .not("start_date", "is", null),
      supabase
        .from("event_schedules")
        .select("event_id, service_type, service_date"),
      supabase
        .from("calendar_tasks")
        .select("id, title, task_date, task_time, notes, done")
        .order("task_date"),
    ]);

  const entries: CalendarEntry[] = [];
  for (const e of events ?? []) {
    const os = (e.operation_orders as { id: string; code: string }[] | null)?.[0];
    const clientName =
      (e.clients as unknown as { name: string } | null)?.name ?? "";
    const eventSchedules = (schedules ?? []).filter(
      (s) => s.event_id === e.id && s.service_date
    );

    const base = {
      event_id: e.id as string,
      name: e.name as string,
      client_name: clientName,
      os_id: os?.id ?? null,
      os_code: os?.code ?? null,
    };

    if (eventSchedules.length > 0) {
      // Um chip por dia, na cor do tipo de serviço daquele dia
      for (const s of eventSchedules) {
        entries.push({
          ...base,
          key: `${e.id}-${s.service_type}-${s.service_date}`,
          date: s.service_date as string,
          type_label: labelFor(SERVICE_TYPES, s.service_type),
          color: TYPE_COLORS[s.service_type] ?? TYPE_COLORS.outro,
        });
      }
    } else if (e.start_date) {
      // Eventos antigos sem cronograma detalhado: usa o período geral
      const firstType = (e.service_type ?? "outro").split(",")[0].trim();
      for (const date of rangeDates(e.start_date, e.end_date ?? e.start_date)) {
        entries.push({
          ...base,
          key: `${e.id}-${date}`,
          date,
          type_label: labelFor(SERVICE_TYPES, firstType),
          color: TYPE_COLORS[firstType] ?? TYPE_COLORS.outro,
        });
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Calendário"
        description="Cada dia mostra o tipo de serviço na sua cor — passe o mouse num dia e clique no + para adicionar tarefa"
      />
      <CalendarView
        entries={entries}
        tasks={(tasks ?? []) as CalendarTask[]}
      />
    </div>
  );
}
