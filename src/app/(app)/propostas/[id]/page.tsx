import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, FileSignature, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProposalActions } from "@/components/proposals/ProposalActions";
import { formatDate, formatDateTime, formatMoney, formatTime } from "@/lib/utils";

const PHASE_LABELS: Record<string, string> = {
  continuo: "Turno contínuo",
  montagem: "Montagem",
  realizacao: "Realização",
  desmontagem: "Desmontagem",
};

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: proposal },
    { data: schedule },
    { data: items },
    { data: emailLogs },
    { data: logs },
    { data: contract },
    { data: os },
  ] = await Promise.all([
    supabase
      .from("proposals")
      .select("*, clients(name, document), events(name, location_name, city, state, start_date, estimated_public)")
      .eq("id", id)
      .single(),
    supabase
      .from("proposal_schedule_items")
      .select("*")
      .eq("proposal_id", id)
      .order("service_date"),
    supabase.from("proposal_items").select("*").eq("proposal_id", id),
    supabase
      .from("email_logs")
      .select("*")
      .eq("related_type", "proposal")
      .eq("related_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("*")
      .eq("entity_type", "proposal")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("contracts")
      .select("id, code, status")
      .eq("proposal_id", id)
      .maybeSingle(),
    supabase
      .from("operation_orders")
      .select("id, code, status")
      .eq("proposal_id", id)
      .maybeSingle(),
  ]);

  if (!proposal) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isAdmin = me?.role === "admin";

  // Proposta já enviada ao cliente? (status pós-envio OU e-mail efetivamente
  // enviado no histórico). Antes disso, editar em cima; depois, criar revisão.
  const SENT_STATUSES = [
    "enviada",
    "em_negociacao",
    "aprovada",
    "recusada",
    "cancelada",
    "convertida_contrato",
    "convertida_os",
  ];
  const hasBeenSent =
    SENT_STATUSES.includes(proposal.status) ||
    (emailLogs ?? []).some((e) => e.status === "enviado");

  const client = proposal.clients as { name: string; document: string | null } | null;
  const event = proposal.events as {
    name: string;
    location_name: string | null;
    city: string | null;
    state: string | null;
    start_date: string | null;
    estimated_public: number | null;
  } | null;

  return (
    <div>
      <PageHeader title={proposal.code} description={client?.name ?? ""}>
        <StatusBadge status={proposal.status} />
      </PageHeader>

      <div className="mb-6">
        <ProposalActions
          proposalId={proposal.id}
          code={proposal.code}
          number={proposal.number}
          canRenumber={isAdmin}
          status={proposal.status}
          hasBeenSent={hasBeenSent}
          contactEmail={proposal.contact_email}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-ink">Evento</h2>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-ink-muted">Evento</dt>
                <dd className="font-medium text-ink">{event?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Local</dt>
                <dd className="text-ink">
                  {event?.location_name ?? "—"}
                  {event?.city && ` · ${event.city}/${event.state ?? ""}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Data de realização</dt>
                <dd className="text-ink">{formatDate(event?.start_date)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Público estimado</dt>
                <dd className="text-ink">
                  {event?.estimated_public?.toLocaleString("pt-BR") ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Contato (A/c)</dt>
                <dd className="text-ink">{proposal.contact_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">E-mail / telefone</dt>
                <dd className="text-ink">
                  {[proposal.contact_email, proposal.contact_phone]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-ink">
              Cronograma de funcionários
            </h2>
            {!schedule || schedule.length === 0 ? (
              <p className="text-sm text-ink-muted">Sem cronograma cadastrado.</p>
            ) : (
              <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="pb-2">Fase</th>
                    <th className="pb-2">Data</th>
                    <th className="pb-2">Horário</th>
                    <th className="pb-2 text-center">AL</th>
                    <th className="pb-2 text-center">CO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {schedule.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2 font-medium text-ink">
                        {PHASE_LABELS[s.phase] ?? s.phase}
                      </td>
                      <td className="py-2 text-ink-muted">
                        {formatDate(s.service_date)}
                      </td>
                      <td className="py-2 text-ink-muted">
                        {s.start_time
                          ? `${formatTime(s.start_time)} às ${formatTime(s.end_time)}`
                          : "—"}
                      </td>
                      <td className="py-2 text-center text-ink">
                        {s.cleaning_agents}
                      </td>
                      <td className="py-2 text-center text-ink">
                        {s.coordinators}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-ink">
              Itens de precificação
            </h2>
            {!items || items.length === 0 ? (
              <p className="text-sm text-ink-muted">Sem itens cadastrados.</p>
            ) : (
              <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="pb-2">Item</th>
                    <th className="pb-2 text-center">Qtd.</th>
                    <th className="pb-2 text-center">Horas</th>
                    <th className="pb-2 text-right">Unit.</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td className="py-2">
                        <p className="font-medium text-ink">{i.description}</p>
                        <p className="text-xs text-ink-muted">{i.category}</p>
                      </td>
                      <td className="py-2 text-center text-ink-muted">
                        {Number(i.quantity)}
                      </td>
                      <td className="py-2 text-center text-ink-muted">
                        {i.hours !== null ? Number(i.hours) : "—"}
                      </td>
                      <td className="py-2 text-right text-ink-muted">
                        {formatMoney(Number(i.unit_price))}
                      </td>
                      <td className="py-2 text-right font-medium text-ink">
                        {formatMoney(Number(i.total_price))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {(contract || os) && (
            <div className="rounded-xl border border-brand-teal/30 bg-teal-50/50 p-6 shadow-card">
              <h2 className="mb-3 text-base font-semibold text-ink">
                Gerados desta proposta
              </h2>
              <ul className="space-y-2 text-sm">
                {contract && (
                  <li>
                    <Link
                      href={`/contratos/${contract.id}`}
                      className="flex items-center gap-2 font-medium text-brand-petrol hover:underline"
                    >
                      <FileSignature className="h-4 w-4" />
                      {contract.code}
                      <StatusBadge status={contract.status} />
                    </Link>
                  </li>
                )}
                {os && (
                  <li>
                    <Link
                      href={`/operacao/${os.id}`}
                      className="flex items-center gap-2 font-medium text-brand-petrol hover:underline"
                    >
                      <ClipboardList className="h-4 w-4" />
                      {os.code}
                      <StatusBadge status={os.status} />
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="rounded-xl bg-brand-dark p-6 text-white shadow-card">
            <h2 className="mb-4 text-base font-semibold">Valores</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-300">Custo total</dt>
                <dd>{formatMoney(Number(proposal.total_cost))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-300">Subtotal</dt>
                <dd>{formatMoney(Number(proposal.subtotal))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-300">BV</dt>
                <dd>{formatMoney(Number(proposal.bv))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-300">Desconto</dt>
                <dd>− {formatMoney(Number(proposal.discount))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-300">Impostos</dt>
                <dd>{formatMoney(Number(proposal.taxes))}</dd>
              </div>
              <div className="flex justify-between border-t border-white/15 pt-2.5">
                <dt className="font-semibold">
                  Total (
                  {proposal.emission_type === "recibo" ? "Recibo" : "Nota Fiscal"}
                  )
                </dt>
                <dd className="text-lg font-bold text-brand-teal">
                  {formatMoney(Number(proposal.total_amount))}
                </dd>
              </div>
            </dl>
            {proposal.amount_in_words && (
              <p className="mt-3 text-xs italic text-gray-300">
                {proposal.amount_in_words}
              </p>
            )}
            <div className="mt-4 space-y-1 border-t border-white/15 pt-3 text-xs text-gray-300">
              <p>Com NF: {formatMoney(Number(proposal.total_nf))}</p>
              <p>Com Recibo: {formatMoney(Number(proposal.total_receipt))}</p>
              <p>Pagamento: {proposal.payment_terms ?? "—"}</p>
              <p>Validade: {formatDate(proposal.valid_until)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-ink">Histórico</h2>
            {(emailLogs ?? []).length === 0 && (logs ?? []).length === 0 ? (
              <p className="text-sm text-ink-muted">
                Nenhuma atividade registrada ainda.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {(emailLogs ?? []).map((e) => (
                  <li key={e.id} className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" />
                    <div>
                      <p className="text-ink">
                        E-mail para <strong>{e.to_email}</strong>{" "}
                        <span
                          className={
                            e.status === "enviado"
                              ? "text-success"
                              : "text-danger"
                          }
                        >
                          ({e.status})
                        </span>
                      </p>
                      <p className="text-xs text-ink-muted">
                        {formatDateTime(e.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
                {(logs ?? []).map((l) => (
                  <li key={l.id} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-petrol" />
                    <div>
                      <p className="text-ink">{l.description}</p>
                      <p className="text-xs text-ink-muted">
                        {formatDateTime(l.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}