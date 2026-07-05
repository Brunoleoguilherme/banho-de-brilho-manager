import { z } from "zod";

const optionalText = z.string().optional();
const money = z.coerce.number().min(0, "Valor inválido");
const percent = z.coerce.number().min(0, "Mínimo 0").max(100, "Máximo 100");

export const scheduleItemSchema = z.object({
  phase: z.enum(["montagem", "realizacao", "desmontagem"]),
  service_date: z.string().min(1, "Informe a data"),
  start_time: optionalText,
  end_time: optionalText,
  cleaning_agents: z.coerce.number().int().min(0),
  coordinators: z.coerce.number().int().min(0),
  notes: optionalText,
});

export const pricingItemSchema = z.object({
  category: z.string().min(1, "Categoria"),
  description: z.string().min(1, "Descrição"),
  quantity: z.coerce.number().min(0),
  hours: z.union([z.literal(""), z.coerce.number().min(0)]).optional(),
  unit_price: money,
  is_internal_cost: z.boolean(),
  show_on_proposal: z.boolean(),
  notes: optionalText,
});

export const proposalSchema = z.object({
  event_id: z.string().uuid("Selecione o evento"),
  contact_name: optionalText,
  contact_email: z
    .union([z.literal(""), z.string().email("E-mail inválido")])
    .optional(),
  contact_phone: optionalText,
  issue_date: z.string().min(1, "Informe a data de emissão"),
  valid_until: optionalText,
  emission_type: z.enum(["nota_fiscal", "recibo"]),
  payment_terms: optionalText,
  responsibilities_company: optionalText,
  responsibilities_client: optionalText,
  notes: optionalText,
  margin_percent: percent,
  bv_percent: percent,
  discount_percent: percent,
  tax_percent_nf: percent,
  tax_percent_receipt: percent,
  schedule: z
    .array(scheduleItemSchema)
    .min(1, "O evento selecionado não tem datas cadastradas — preencha as datas e horários na página do evento antes de criar a proposta"),
  items: z.array(pricingItemSchema),
});

export type ScheduleItemInput = z.infer<typeof scheduleItemSchema>;
export type PricingItemInput = z.infer<typeof pricingItemSchema>;
export type ProposalInput = z.infer<typeof proposalSchema>;

export const PRICING_CATEGORIES = [
  "Agente de limpeza",
  "Coordenador",
  "Vale-refeição",
  "Vale-transporte",
  "Caçamba",
  "Material de limpeza",
  "Lixeiras",
  "Material descartável",
  "Transporte",
  "Locação de lixeira",
  "Hospedagem",
  "Extra",
  "Outro",
] as const;

export const RESPONSIBILITIES_COMPANY_DEFAULT =
  "Funcionários devidamente uniformizados, transporte, refeições, encargos trabalhistas e fiscais.";
