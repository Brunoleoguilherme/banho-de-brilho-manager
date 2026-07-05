import { FileSignature } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ContractsTable,
  type ContractListRow,
} from "@/components/contracts/ContractsTable";
import { formatDate } from "@/lib/utils";

export default async function ContractsPage() {
  const supabase = await createClient();
  const [{ data: contracts }, { data: historical }] = await Promise.all([
    supabase
      .from("contracts")
      .select("*, clients(name), proposals(code, total_amount)")
      .order("created_at", { ascending: false }),
    supabase
      .from("historical_contracts")
      .select("*")
      .order("contract_date", { ascending: false }),
  ]);

  const rows: ContractListRow[] = [
    ...(contracts ?? []).map((c) => ({
      id: c.id as string,
      kind: "sistema" as const,
      code: c.code as string,
      client: (c.clients as { name: string } | null)?.name ?? "—",
      proposalCode:
        (c.proposals as { code: string } | null)?.code ?? "—",
      dateLabel: c.signed_at ? formatDate(c.signed_at) : "—",
      value:
        Number(
          (c.proposals as { total_amount: number } | null)?.total_amount
        ) || null,
      status: c.status as string,
      year: Number((c.code as string).split("/").pop()) || new Date().getFullYear(),
      signedBy: null,
      clientSignedBy: null,
    })),
    ...(historical ?? []).map((h) => ({
      id: h.id as string,
      kind: "onedrive" as const,
      code: (h.code as string | null) ?? "Contrato",
      client: h.client_name as string,
      proposalCode: (h.code as string | null) ?? "—",
      dateLabel: h.contract_date ? formatDate(h.contract_date) : "—",
      value:
        h.total_value !== null && h.total_value !== undefined
          ? Number(h.total_value)
          : null,
      status: null,
      year: Number(h.year) || 2026,
      signedBy: (h.signed_by as string | null) ?? null,
      clientSignedBy: (h.client_signed_by as string | null) ?? null,
      objectText: (h.object_text as string | null) ?? null,
      responsibilitiesText: (h.responsibilities_text as string | null) ?? null,
      termsText: (h.terms_text as string | null) ?? null,
    })),
  ].sort((a, b) => {
    // mais recentes primeiro: ano, depois número do código
    if (a.year !== b.year) return b.year - a.year;
    const num = (c: string) => Number((c.match(/(\d+)/) ?? [])[1]) || 0;
    return num(b.code) - num(a.code);
  });

  return (
    <div>
      <PageHeader
        title="Contratos"
        description="Contratos do sistema + histórico importado do OneDrive"
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="Nenhum contrato ainda"
          description="Quando uma proposta for aprovada, o contrato simplificado é gerado automaticamente aqui."
          actionLabel="Ver propostas"
          actionHref="/propostas"
        />
      ) : (
        <ContractsTable rows={rows} />
      )}
    </div>
  );
}
