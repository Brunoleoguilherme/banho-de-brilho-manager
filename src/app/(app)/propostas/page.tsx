import Link from "next/link";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ProposalsTable,
  type ProposalListRow,
} from "@/components/proposals/ProposalsTable";
import { formatDate } from "@/lib/utils";

const FILTERS = [
  { value: "rascunho", label: "Rascunho" },
  { value: "enviada", label: "Enviada" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "aprovada", label: "Aprovada" },
  { value: "recusada", label: "Recusada" },
];

/** Ordena por ano e número BBP (decrescente) */
function sortKey(code: string): number {
  const year = Number(code.split("/")[1]) || 0;
  const num = Number((code.match(/BBP0*(\d+)/) ?? [])[1]) || 0;
  const rev = Number((code.match(/R(\d*)\//) ?? [])[1] || (code.includes("R") ? 1 : 0));
  return year * 100000 + num * 10 + rev;
}

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("proposals")
    .select("*, clients(name), events(name, start_date)");
  if (status) query = query.eq("status", status);

  const [{ data: proposals }, { data: historical }] = await Promise.all([
    query,
    // Histórico (OneDrive) só aparece em "Todas" — não tem status
    status
      ? Promise.resolve({ data: [] as never[] })
      : supabase.from("historical_proposals").select("*"),
  ]);

  const rows: ProposalListRow[] = [
    ...(proposals ?? []).map((p) => {
      const ev = p.events as { name: string; start_date: string | null } | null;
      return {
        id: p.id as string,
        kind: "sistema" as const,
        code: p.code as string,
        client: (p.clients as { name: string } | null)?.name ?? "—",
        event: ev?.name ?? "—",
        eventDateLabel: ev?.start_date ? formatDate(ev.start_date) : "—",
        proposalDateLabel: formatDate(p.issue_date),
        value: Number(p.total_amount) || 0,
        status: p.status as string,
      };
    }),
    ...(historical ?? []).map((h) => ({
      id: h.id as string,
      kind: "onedrive" as const,
      code: h.code as string,
      client: h.client_name as string,
      event: (h.event_name as string | null) ?? "—",
      eventDateLabel: h.event_date
        ? formatDate(h.event_date)
        : ((h.date_text as string | null) ?? "—"),
      proposalDateLabel: h.proposal_date ? formatDate(h.proposal_date) : "—",
      value:
        h.total_value !== null && h.total_value !== undefined
          ? Number(h.total_value)
          : null,
      status: null,
      location: (h.location as string | null) ?? null,
      dateText: (h.date_text as string | null) ?? null,
      schedule: (h.schedule as string | null) ?? null,
      totalAl: Number(h.total_al) || 0,
      totalCo: Number(h.total_co) || 0,
      contactName: (h.contact_name as string | null) ?? null,
      contactPhone: (h.contact_phone as string | null) ?? null,
      contactEmail: (h.contact_email as string | null) ?? null,
      docType: (h.doc_type as string | null) ?? null,
    })),
  ].sort((a, b) => sortKey(b.code) - sortKey(a.code));

  return (
    <div>
      <PageHeader
        title="Propostas"
        description="Propostas do sistema + histórico importado do OneDrive, com numeração BBP"
        actionLabel="Nova proposta"
        actionHref="/propostas/nova"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/propostas"
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            !status
              ? "bg-brand-petrol text-white"
              : "bg-white text-ink-muted hover:bg-gray-100"
          }`}
        >
          Todas
        </Link>
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/propostas?status=${f.value}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              status === f.value
                ? "bg-brand-petrol text-white"
                : "bg-white text-ink-muted hover:bg-gray-100"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma proposta encontrada"
          description="Crie a primeira proposta a partir de um evento cadastrado. A numeração BBP é gerada automaticamente."
          actionLabel="Nova proposta"
          actionHref="/propostas/nova"
        />
      ) : (
        <ProposalsTable rows={rows} />
      )}
    </div>
  );
}
