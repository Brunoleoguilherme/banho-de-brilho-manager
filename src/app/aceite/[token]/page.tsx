import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { Sparkles, CalendarDays, MapPin, CheckCircle2 } from "lucide-react";
import { AcceptButton } from "./AcceptButton";
import { COMPANY } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function PublicAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = createSupabaseJs(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: proposal } = await supabase
    .from("proposals")
    .select(
      "id, code, status, total_amount, amount_in_words, payment_terms, valid_until, contact_name, clients(name), events(name, location_name, city, state, start_date, end_date)"
    )
    .eq("accept_token", token)
    .maybeSingle();

  const client = proposal?.clients as { name: string } | null;
  const event = proposal?.events as {
    name: string;
    location_name: string | null;
    city: string | null;
    state: string | null;
    start_date: string | null;
    end_date: string | null;
  } | null;

  const alreadyAccepted =
    proposal &&
    (proposal.status === "aprovada" || proposal.status.startsWith("convertida"));
  const unavailable =
    proposal && ["recusada", "cancelada"].includes(proposal.status);

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dark p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Banho de Brilho</h1>
          <p className="mt-1 text-sm text-gray-300">Limpezas Especiais</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          {!proposal ? (
            <div className="text-center">
              <p className="text-base font-semibold text-ink">
                Proposta não encontrada
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                Este link pode estar incorreto ou desatualizado. Fale com a
                Banho de Brilho: {COMPANY.phones}
              </p>
            </div>
          ) : alreadyAccepted ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-success" />
              <p className="text-lg font-semibold text-ink">
                Proposta {proposal.code} aceita!
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                Obrigado{proposal.contact_name ? `, ${proposal.contact_name.split(" ")[0]}` : ""}!
                Nossa equipe já foi avisada e entrará em contato para os
                próximos passos (contrato e planejamento da operação).
              </p>
            </div>
          ) : unavailable ? (
            <div className="text-center">
              <p className="text-base font-semibold text-ink">
                Proposta indisponível
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                A proposta {proposal.code} não está mais disponível para aceite
                online. Fale com a gente: {COMPANY.phones}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-ink-muted">
                Olá{proposal.contact_name ? `, ${proposal.contact_name.split(" ")[0]}` : ""}!
                Confira o resumo e confirme o aceite da proposta:
              </p>

              <div className="mt-4 rounded-xl bg-surface p-4">
                <p className="text-lg font-bold text-brand-petrol">
                  Proposta {proposal.code}
                </p>
                <p className="text-sm font-medium text-ink">{client?.name}</p>
                <div className="mt-3 space-y-1.5 text-sm text-ink">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-brand-teal" />
                    {event?.name} — {formatDate(event?.start_date)}
                    {event?.end_date && event.end_date !== event.start_date
                      ? ` a ${formatDate(event.end_date)}`
                      : ""}
                  </p>
                  {event?.location_name && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-brand-teal" />
                      {event.location_name}
                      {event.city ? ` · ${event.city}/${event.state ?? ""}` : ""}
                    </p>
                  )}
                </div>
                <div className="mt-4 border-t border-gray-200 pt-3">
                  <p className="text-xs text-ink-muted">Valor total</p>
                  <p className="text-2xl font-bold text-brand-petrol">
                    {formatMoney(Number(proposal.total_amount))}
                  </p>
                  {proposal.amount_in_words && (
                    <p className="text-xs italic text-ink-muted">
                      {proposal.amount_in_words}
                    </p>
                  )}
                  {proposal.payment_terms && (
                    <p className="mt-1 text-xs text-ink-muted">
                      Pagamento: {proposal.payment_terms}
                    </p>
                  )}
                  {proposal.valid_until && (
                    <p className="text-xs text-ink-muted">
                      Válida até {formatDate(proposal.valid_until)}
                    </p>
                  )}
                </div>
              </div>

              <AcceptButton token={token} code={proposal.code} />

              <p className="mt-4 text-center text-xs text-ink-muted">
                Dúvidas ou ajustes? Fale com a gente: {COMPANY.phones} ·{" "}
                {COMPANY.email}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
