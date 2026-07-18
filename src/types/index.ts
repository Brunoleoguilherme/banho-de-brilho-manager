export type UserRole =
  | "admin"
  | "comercial"
  | "operacional"
  | "financeiro"
  | "gestor"
  | "consulta";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  active: boolean;
}

export interface Client {
  id: string;
  type: "empresa" | "pessoa_fisica";
  name: string;
  legal_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
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
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  notes: string | null;
}

export type ServiceType =
  | "limpeza_evento"
  | "limpeza_montagem"
  | "limpeza_realizacao"
  | "limpeza_desmontagem"
  | "limpeza_continua"
  | "limpeza_especial"
  | "apoio_operacional"
  | "outro";

export interface Event {
  id: string;
  client_id: string;
  name: string;
  /** Solicitante do evento (A/c) — quem pediu a proposta */
  requester_name: string | null;
  requester_email: string | null;
  requester_phone: string | null;
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
  /** Um ou mais tipos separados por vírgula */
  service_type: string;
  billing_type: "nota_fiscal" | "recibo" | "outro" | null;
  responsibilities_company: string | null;
  responsibilities_client: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  description: string;
  user_id: string | null;
  created_at: string;
}
