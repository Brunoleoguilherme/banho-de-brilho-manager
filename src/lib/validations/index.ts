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

export type ClientInput = z.infer<typeof clientSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type EventInput = z.infer<typeof eventSchema>;
