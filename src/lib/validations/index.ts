import { z } from "zod";

// Campos opcionais chegam como "" dos formulários;
// a conversão para null é feita no servidor (emptyToNull).
const optionalText = z.string().optional();
const optionalEmail = z
  .union([z.literal(""), z.string().email("E-mail inválido")])
  .optional();

export const clientSchema = z.object({
  type: z.enum(["empresa", "pessoa_fisica"]),
  name: z.string().min(2, "Informe o nome do cliente"),
  legal_name: optionalText,
  document: optionalText,
  email: optionalEmail,
  phone: optionalText,
  address: optionalText,
  address_number: optionalText,
  address_complement: optionalText,
  neighborhood: optionalText,
  city: optionalText,
  state: optionalText,
  zip_code: optionalText,
  // Responsável legal que assina o contrato (opcional)
  legal_rep_name: optionalText,
  legal_rep_cpf: optionalText,
  legal_rep_role: optionalText,
  notes: optionalText,
});

export const contactSchema = z.object({
  client_id: z.string().uuid(),
  name: z.string().min(2, "Informe o nome do contato"),
  role: optionalText,
  email: optionalText,
  phone: optionalText,
  is_primary: z.boolean().default(false),
  notes: optionalText,
});

export const eventSchema = z.object({
  client_id: z.string().uuid("Selecione o cliente"),
  // Local salvo (opcional) — preenche o endereço automaticamente
  location_id: optionalText,
  name: z.string().min(2, "Informe o nome do evento"),
  location_name: optionalText,
  address: optionalText,
  address_number: optionalText,
  address_complement: optionalText,
  neighborhood: optionalText,
  zip_code: optionalText,
  city: optionalText,
  state: optionalText,
  estimated_public: z
    .union([z.literal(""), z.coerce.number().int().min(0, "Valor inválido")])
    .optional(),
  // Um ou mais tipos, separados por vírgula (ex.: "limpeza_montagem,limpeza_desmontagem")
  service_type: z.string().min(1, "Selecione pelo menos um tipo de serviço"),
  billing_type: z.enum(["nota_fiscal", "recibo", "outro"]),
  // Datas e horários por tipo de serviço marcado:
  // período (início/fim) + horários dia a dia
  schedules: z
    .record(
      z.string(),
      z.object({
        start_date: optionalText,
        end_date: optionalText,
        // Dias avulsos fora do período (não sequenciais)
        extra_dates: z.array(z.string()).optional(),
        days: z
          .record(
            z.string(),
            z.object({
              start_time: optionalText,
              end_time: optionalText,
            })
          )
          .optional(),
      })
    )
    .optional(),
  responsibilities_company: optionalText,
  responsibilities_client: optionalText,
  notes: optionalText,
});

const optionalInt = z
  .union([z.literal(""), z.coerce.number().int().min(0, "Valor inválido")])
  .optional();

/** Local de evento reaproveitável (endereço, contato, banheiros e descartáveis) */
export const locationSchema = z.object({
  name: z.string().min(2, "Informe o nome do local"),
  address: optionalText,
  address_number: optionalText,
  address_complement: optionalText,
  neighborhood: optionalText,
  city: optionalText,
  state: optionalText,
  zip_code: optionalText,
  contact_name: optionalText,
  contact_phone: optionalText,
  contact_email: optionalEmail,
  soap_type: optionalText,
  paper_towel_type: optionalText,
  toilet_paper_type: optionalText,
  trash_bag: optionalText,
  fem_cb: optionalInt,
  fem_ph: optionalInt,
  fem_pt: optionalInt,
  fem_sb: optionalInt,
  masc_cb: optionalInt,
  masc_ph: optionalInt,
  masc_pt: optionalInt,
  masc_sb: optionalInt,
  pne_cb: optionalInt,
  pne_ph: optionalInt,
  pne_pt: optionalInt,
  pne_sb: optionalInt,
  notes: optionalText,
});

export type LocationInput = z.infer<typeof locationSchema>;

/** Veiculo do pre-cadastro (frota) para escolher na OS */
export const vehicleSchema = z.object({
  model: z.string().min(2, "Informe o modelo/descrição do veículo"),
  color: optionalText,
  plate: optionalText,
  notes: optionalText,
  active: z.boolean().default(true),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;

export type ClientInput = z.infer<typeof clientSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type EventInput = z.infer<typeof eventSchema>;
