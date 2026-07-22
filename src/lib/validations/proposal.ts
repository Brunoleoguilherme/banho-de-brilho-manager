import { z } from "zod";

const optionalText = z.string().optional();
const money = z.coerce.number().min(0, "Valor inválido");
const percent = z.coerce.number().min(0, "Mínimo 0").max(100, "Máximo 100");
// Margem pode passar de 100% (ex.: markup de 150%) e ficar negativa
// (contraproposta abaixo do custo, usada só para análise)
const marginPercent = z.coerce
  .number()
  .min(-100, "Mínimo -100")
  .max(1000, "Máximo 1000");

export const scheduleItemSchema = z.object({
  phase: z.enum(["continuo", "montagem", "realizacao", "desmontagem"]),
  // Opcional: no modo manual a proposta pode não ter data definida ainda.
  // A obrigatoriedade no modo automático é validada no proposalSchema.
  service_date: optionalText,
  start_time: optionalText,
  end_time: optionalText,
  // Modo manual: texto livre de horário/carga horária (ex.: "Carga horária de 08 horas")
  time_label: optionalText,
  cleaning_agents: z.coerce.number().int().min(0),
  coordinators: z.coerce.number().int().min(0),
  notes: optionalText,
});

// Modo manual — itens de locação/equipamentos (descrição, quantidade e valor)
export const rentalItemSchema = z.object({
  description: z.string().min(1, "Descrição"),
  quantity: z.coerce.number().min(0),
  unit_value: money,
});

// Modo manual — valores discriminados (rótulo + valor) que somam no total
export const valueItemSchema = z.object({
  label: z.string().min(1, "Descrição do valor"),
  amount: money,
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

export const proposalSchema = z
  .object({
    event_id: z.string().uuid("Selecione o evento"),
    pricing_mode: z.enum(["automatico", "manual"]).default("automatico"),
    contact_name: optionalText,
    contact_email: z
      .union([z.literal(""), z.string().email("E-mail inválido")])
      .optional(),
    contact_phone: optionalText,
    issue_date: z.string().min(1, "Informe a data de emissão"),
    valid_until: optionalText,
    emission_type: z.enum(["nota_fiscal", "recibo"]),
    payment_terms: optionalText,
    payment_due_date: optionalText,
    responsibilities_company: optionalText,
    responsibilities_client: optionalText,
    notes: optionalText,
    margin_percent: marginPercent,
    bv_percent: percent,
    discount_percent: percent,
    tax_percent_nf: percent,
    tax_percent_receipt: percent,
    schedule: z.array(scheduleItemSchema),
    items: z.array(pricingItemSchema),
    // Modo manual
    rental_items: z.array(rentalItemSchema).default([]),
    value_items: z.array(valueItemSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.pricing_mode === "automatico") {
      // No modo automático o cronograma alimenta o cálculo: exige pelo menos
      // uma linha e data em cada uma (comportamento original).
      if (data.schedule.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["schedule"],
          message:
            "O evento selecionado não tem datas cadastradas — preencha as datas e horários na página do evento antes de criar a proposta",
        });
      }
      data.schedule.forEach((s, i) => {
        if (!s.service_date) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["schedule", i, "service_date"],
            message: "Informe a data",
          });
        }
      });
    } else {
      // Modo manual: precisa de algo para compor o valor (valores discriminados
      // ou itens de locação).
      if (data.value_items.length === 0 && data.rental_items.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["value_items"],
          message:
            "Adicione ao menos um valor discriminado ou um item de locação para compor o total.",
        });
      }
    }
  });

export type ScheduleItemInput = z.infer<typeof scheduleItemSchema>;
export type PricingItemInput = z.infer<typeof pricingItemSchema>;
export type RentalItemInput = z.infer<typeof rentalItemSchema>;
export type ValueItemInput = z.infer<typeof valueItemSchema>;
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
