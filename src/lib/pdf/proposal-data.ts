import { createClient } from "@/lib/supabase/server";

export interface ProposalPdfData {
  code: string;
  issue_date: string | null;
  valid_until: string | null;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  total_amount: number;
  amount_in_words: string | null;
  payment_terms: string | null;
  payment_due_date: string | null;
  emission_type: string;
  responsibilities_company: string | null;
  responsibilities_client: string | null;
  client: {
    name: string;
    email: string | null;
    phone: string | null;
    legal_name: string | null;
    document: string | null;
    address: string | null;
    address_number: string | null;
    address_complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    legal_rep_name: string | null;
    legal_rep_cpf: string | null;
    legal_rep_role: string | null;
  } | null;
  event: {
    name: string;
    location_name: string | null;
    address: string | null;
    address_number: string | null;
    address_complement: string | null;
    neighborhood: string | null;
    zip_code: string | null;
    city: string | null;
    state: string | null;
    start_date: string | null;
    end_date: string | null;
    event_start_time: string | null;
    event_end_time: string | null;
    estimated_public: number | null;
  } | null;
  pricing_mode: string;
  schedule: {
    phase: string;
    service_date: string | null;
    start_time: string | null;
    end_time: string | null;
    time_label: string | null;
    cleaning_agents: number;
    coordinators: number;
    notes: string | null;
  }[];
  rental_items: {
    description: string;
    quantity: number;
    unit_value: number;
  }[];
  value_items: {
    label: string;
    amount: number;
  }[];
}

/** Monta o endereço completo do local do evento para os PDFs */
export function eventFullLocation(event: ProposalPdfData["event"]): string {
  if (!event) return "";
  return [
    event.location_name,
    [event.address, event.address_number].filter(Boolean).join(", "),
    event.address_complement,
    event.neighborhood,
    event.city ? `${event.city}/${event.state ?? ""}` : null,
    event.zip_code ? `CEP: ${event.zip_code}` : null,
  ]
    .filter(Boolean)
    .join(" – ");
}

export async function getProposalPdfData(
  id: string
): Promise<ProposalPdfData | null> {
  const supabase = await createClient();

  const [
    { data: proposal },
    { data: schedule },
    { data: rentalItems },
    { data: valueItems },
  ] = await Promise.all([
    supabase
      .from("proposals")
      .select(
        "*, clients(name, email, phone, legal_name, document, address, address_number, address_complement, neighborhood, city, state, zip_code, legal_rep_name, legal_rep_cpf, legal_rep_role), events(name, location_name, address, address_number, address_complement, neighborhood, zip_code, city, state, start_date, end_date, event_start_time, event_end_time, estimated_public)"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("proposal_schedule_items")
      .select("*")
      .eq("proposal_id", id)
      .order("service_date", { nullsFirst: true }),
    supabase
      .from("proposal_rental_items")
      .select("*")
      .eq("proposal_id", id)
      .order("sort_order"),
    supabase
      .from("proposal_value_items")
      .select("*")
      .eq("proposal_id", id)
      .order("sort_order"),
  ]);

  if (!proposal) return null;

  return {
    code: proposal.code,
    issue_date: proposal.issue_date,
    valid_until: proposal.valid_until,
    status: proposal.status,
    contact_name: proposal.contact_name,
    contact_email: proposal.contact_email,
    contact_phone: proposal.contact_phone,
    total_amount: Number(proposal.total_amount) || 0,
    amount_in_words: proposal.amount_in_words,
    payment_terms: proposal.payment_terms,
    payment_due_date: proposal.payment_due_date ?? null,
    emission_type: proposal.emission_type ?? "nota_fiscal",
    responsibilities_company: proposal.responsibilities_company,
    responsibilities_client: proposal.responsibilities_client,
    client: proposal.clients as ProposalPdfData["client"],
    event: proposal.events as ProposalPdfData["event"],
    pricing_mode: proposal.pricing_mode ?? "automatico",
    schedule: (schedule ?? []).map((s) => ({
      phase: s.phase,
      service_date: s.service_date,
      start_time: s.start_time,
      end_time: s.end_time,
      time_label: s.time_label ?? null,
      cleaning_agents: s.cleaning_agents ?? 0,
      coordinators: s.coordinators ?? 0,
      notes: s.notes ?? null,
    })),
    rental_items: (rentalItems ?? []).map((r) => ({
      description: r.description,
      quantity: Number(r.quantity) || 0,
      unit_value: Number(r.unit_value) || 0,
    })),
    value_items: (valueItems ?? []).map((v) => ({
      label: v.label,
      amount: Number(v.amount) || 0,
    })),
  };
}
