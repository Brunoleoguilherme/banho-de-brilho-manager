import Link from "next/link";
import {
  Building2,
  CalendarDays,
  FileText,
  ClipboardList,
  Activity,
  Handshake,
  ThumbsUp,
  Percent,
} from "lucide-react";
import { addDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { labelFor, SERVICE_TYPES } from "@/lib/constants";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";

const APPROVED = ["aprovada", "convertida_contrato", "convertida_os"];
const OPEN = ["rascunho", "em_revisao_interna", "enviada", "em_negociacao"];

const WEEKDAY = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default async function DashboardPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const in7days = addDays(new Date(), 7).toISOString().slice(0, 10);
  const in30days = addDays(new Date(), 30).toISOString().slice(0, 10);
  const year = new Date().getFullYear();

  const [
    { count: openOperations },
    { count: clientsTotal },
    { count: eventsUpcoming },
    { data: yearProposals },
    { data: recentProposals },
    { data: weekSchedules },
    { data: weekTasks },
    { data: recentActivity },
  ] = await Promise.all([
    supabase
      .from("operation_orders")
      .select("*", { count: "exact", head: true })
      .not("status", "in", "(finalizada,em_conferencia,encerrada)"),
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("start_date", today)
      .lte("start_date", in30days),
    supabase.from("proposals").select("status, total_amount").eq("year", year),
    supabase
      .from("proposals")
      .select("id, code, status, total_amount, clients(name), events(name)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("event_schedules")
      .select("service_date, service_type, start_time, events(id, name)")
      .gte("service_date", today)
      .lte("service_date", in7days)
      .order("service_date"),
    supabase
      .from("calendar_tasks")
      .select("id, title, task_date, task_time, done")
      .gte("task_date", today)
      .lte("task_date", in7days)
      .eq("done", false)
      .order("task_date"),
    supabase
      .from("activity_logs")
      .select("id, description, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  // Indicadores comerciais do ano
  const proposals = yearProposals ?? [];
  const openProps = proposals.filter((p) => OPEN.includes(p.status));
  const approvedProps = proposals.filter((p) => APPROVED.includes(p.status));
  const decided = proposals.filter((p) =>
    [...APPROVED, "recusada"].includes(p.status)
  );
  const openValue = openProps.reduce((a, p) => a + (Number(p.total_amount) || 0), 0);
  const approvedValue = approvedProps.reduce(
    (a, p) => a + (Number(p.total_amount) || 0),
    0
  );
  const conversion =
    decided.length > 0
      ? Math.round((approvedProps.length / decided.length) * 100)
      : null;

  // Agenda da semana: junta cronogramas de eventos e tarefas por dia
  interface AgendaItem {
    kind: "evento" | "tarefa";
    label: string;
    sub: string;
    href: string;
  }
  const agenda = new Map<string, AgendaItem[]>();
  for (const s of weekSchedules ?? []) {
    const ev = s.events as unknown as { id: string; name: string } | null;
    const list = agenda.get(s.service_date) ?? [];
    list.push({
      kind: "evento",
      label: ev?.name ?? "Evento",
      sub: `${labelFor(SERVICE_TYPES, s.service_type)}${s.start_time ? ` · ${s.start_time.slice(0, 5)}` : ""}`,
      href: ev ? `/eventos/${ev.id}/editar` : "/eventos",
    });
    agenda.set(s.service_date, list);
  }
  for (const t of weekTasks ?? []) {
    const list = agenda.get(t.task_date) ?? [];
    list.push({
      kind: "tarefa",
      label: t.title,
      sub: t.task_time ? `Tarefa · ${t.task_time.slice(0, 5)}` : "Tarefa",
      href: "/calendario",
    });
    agenda.set(t.task_date, list);
  }
  const agendaDays = Array.from(agenda.entries()).sort((a, b) =>
    a[0] < b[0] ? -1 : 1
  );

  return (
    <div>
      <PageHeader title="Dashboard" description="Visão comercial e operacional" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/operacao">
          <StatCard
            title="Operações em andamento"
            value={openOperations ?? 0}
            icon={ClipboardList}
            hint="Ordens de serviço abertas"
          />
        </Link>
        <Link href="/clientes">
          <StatCard
            title="Clientes"
            value={clientsTotal ?? 0}
            icon={Building2}
            tone="success"
            hint="Carteira cadastrada"
          />
        </Link>
        <Link href="/eventos">
          <StatCard
            title="Eventos próximos"
            value={eventsUpcoming ?? 0}
            icon={CalendarDays}
            hint="Próximos 30 dias"
            tone="warning"
          />
        </Link>
        <Link href="/propostas">
          <StatCard
            title={`Propostas em ${year}`}
            value={proposals.length}
            icon={FileText}
            hint="Numeração BBP automática"
            tone="gold"
          />
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/propostas">
          <StatCard
            title="Em aberto / negociação"
            value={formatMoney(openValue)}
            icon={Handshake}
            hint={`${openProps.length} proposta(s) aguardando decisão`}
            tone="warning"
          />
        </Link>
        <Link href="/propostas?status=aprovada">
          <StatCard
            title={`Aprovadas em ${year}`}
            value={formatMoney(approvedValue)}
            icon={ThumbsUp}
            hint={`${approvedProps.length} proposta(s) fechada(s)`}
            tone="success"
          />
        </Link>
        <Link href="/relatorios">
          <StatCard
            title="Taxa de conversão"
            value={conversion === null ? "—" : `${conversion}%`}
            icon={Percent}
            hint="Aprovadas ÷ decididas no ano"
            tone="gold"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-petrol" />
              <h2 className="text-base font-semibold text-ink">
                Propostas recentes
              </h2>
            </div>
            <Link
              href="/propostas"
              className="text-xs font-medium text-brand-petrol hover:underline"
            >
              Ver todas
            </Link>
          </div>
          {!recentProposals || recentProposals.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma proposta ainda.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentProposals.map((p) => (
                <li key={p.id} className="py-2.5">
                  <Link href={`/propostas/${p.id}`} className="group block">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-brand-petrol group-hover:underline">
                        {p.code}
                      </p>
                      <span className="text-sm font-medium text-ink">
                        {formatMoney(Number(p.total_amount))}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {(p.clients as { name: string } | null)?.name}
                      {(p.events as { name: string } | null)?.name &&
                        ` · ${(p.events as { name: string } | null)?.name}`}
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={p.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-brand-teal" />
              <h2 className="text-base font-semibold text-ink">
                Agenda dos próximos 7 dias
              </h2>
            </div>
            <Link
              href="/calendario"
              className="text-xs font-medium text-brand-petrol hover:underline"
            >
              Calendário
            </Link>
          </div>
          {agendaDays.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Semana livre — nada agendado nos próximos 7 dias.
            </p>
          ) : (
            <div className="space-y-3">
              {agendaDays.map(([date, items]) => (
                <div key={date}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    {WEEKDAY[new Date(date + "T12:00:00").getDay()]} ·{" "}
                    {formatDate(date)}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {items.map((item, i) => (
                      <li key={i}>
                        <Link
                          href={item.href}
                          className={`block rounded-lg px-2.5 py-1.5 text-sm transition hover:opacity-80 ${
                            item.kind === "evento"
                              ? "bg-teal-50 text-brand-petrol"
                              : "bg-brand-petrol/5 text-ink"
                          }`}
                        >
                          <span className="font-medium">{item.label}</span>
                          <span className="block text-xs text-ink-muted">
                            {item.sub}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-brand-petrol" />
            <h2 className="text-base font-semibold text-ink">
              Atividade recente
            </h2>
          </div>
          {!recentActivity || recentActivity.length === 0 ? (
            <p className="text-sm text-ink-muted">
              As ações da equipe aparecerão aqui.
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentActivity.map((log) => (
                <li key={log.id} className="py-2.5">
                  <p className="text-sm text-ink">{log.description}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {formatDateTime(log.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
