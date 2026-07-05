import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  HistoricalTable,
  type HistoricalRow,
} from "@/components/proposals/HistoricalTable";

/** Histórico de propostas antigas importadas dos Word (PDFs no OneDrive) */
export default async function HistoricoPropostasPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("historical_proposals")
    .select("*")
    .order("year", { ascending: false })
    .order("code", { ascending: false });

  const rows: HistoricalRow[] = (data ?? []).map((r) => ({
    id: r.id,
    code: r.code,
    year: r.year,
    client_name: r.client_name,
    event_name: r.event_name,
    location: r.location,
    event_date: r.event_date,
    date_text: r.date_text,
    total_value:
      r.total_value !== null && r.total_value !== undefined
        ? Number(r.total_value)
        : null,
    schedule: r.schedule ?? null,
    total_al: Number(r.total_al) || 0,
    total_co: Number(r.total_co) || 0,
  }));

  return (
    <div>
      <PageHeader
        title="Histórico de propostas"
        description="Registro resumido das propostas antigas (arquivos Word) — os PDFs completos ficam no OneDrive"
      />
      <HistoricalTable rows={rows} />
    </div>
  );
}
