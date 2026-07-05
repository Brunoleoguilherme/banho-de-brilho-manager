import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ContractActions } from "@/components/contracts/ContractActions";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: contract }, { data: logs }] = await Promise.all([
    supabase
      .from("contracts")
      .select(
        "*, clients(name, document), proposals(id, code, total_amount, amount_in_words, payment_terms, contact_email, contact_name), operation_orders(id, code)"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("activity_logs")
      .select("*")
      .eq("entity_type", "contract")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (!contract) notFound();

  const client = contract.clients as { name: string; document: string | null } | null;
  const proposal = contract.proposals as {
    id: string;
    code: string;
    total_amount: number;
    amount_in_words: string | null;
    payment_terms: string | null;
  } | null;
  const os = (contract.operation_orders as { id: string; code: string }[] | null)?.[0];

  return (
    <div>
      <PageHeader title={contract.code} description={client?.name ?? ""}>
        <StatusBadge status={contract.status} />
      </PageHeader>

      <div className="mb-6">
        <ContractActions
          contractId={contract.id}
          code={contract.code}
          status={contract.status}
          signedPdfPath={contract.signed_pdf_url}
          companySignedPath={contract.generated_pdf_url}
          contactEmail={
            (contract.proposals as { contact_email?: string | null } | null)
              ?.contact_email
          }
          contactName={
            (contract.proposals as { contact_name?: string | null } | null)
              ?.contact_name
          }
          zapsignDocToken={contract.zapsign_doc_token}
          zapsignSignUrl={contract.zapsign_sign_url}
          zapsignStatus={contract.zapsign_status}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-ink">
            Dados do contrato
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-ink-muted">Proposta de origem</dt>
              <dd>
                {proposal ? (
                  <Link
                    href={`/propostas/${proposal.id}`}
                    className="font-medium text-brand-petrol hover:underline"
                  >
                    {proposal.code}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Ordem de serviço</dt>
              <dd>
                {os ? (
                  <Link
                    href={`/operacao/${os.id}`}
                    className="font-medium text-brand-petrol hover:underline"
                  >
                    {os.code}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Valor</dt>
              <dd className="font-semibold text-ink">
                {formatMoney(Number(proposal?.total_amount))}
              </dd>
            </div>
            {proposal?.amount_in_words && (
              <div>
                <dt className="text-xs text-ink-muted">Por extenso</dt>
                <dd className="italic text-ink-muted">{proposal.amount_in_words}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-ink-muted">Forma de pagamento</dt>
              <dd className="text-ink">{proposal?.payment_terms ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Enviado em</dt>
              <dd className="text-ink">{formatDateTime(contract.sent_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Assinado em</dt>
              <dd className="text-ink">
                {formatDate(contract.signed_at)}
                {contract.signed_by_name && ` — por ${contract.signed_by_name}`}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-ink">Histórico</h2>
          {!logs || logs.length === 0 ? (
            <p className="text-sm text-ink-muted">Sem registros.</p>
          ) : (
            <ul className="divide-y divide-gray-50 text-sm">
              {logs.map((log) => (
                <li key={log.id} className="py-2">
                  <p className="text-ink">{log.description}</p>
                  <p className="text-xs text-ink-muted">
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
