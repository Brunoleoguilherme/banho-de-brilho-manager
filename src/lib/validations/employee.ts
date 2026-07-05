import { z } from "zod";

const rate = z.coerce.number().min(0, "Valor inválido");

export const employeeSchema = z.object({
  employee_type: z.enum(["funcionario", "freelancer"]).default("funcionario"),
  full_name: z.string().min(2, "Informe o nome completo"),
  document: z.string().optional(),
  rg: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  neighborhood: z.string().optional(),
  zip_code: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  main_role: z.enum([
    "agente_limpeza",
    "coordenador",
    "motorista",
    "apoio",
    "supervisor",
    "administrativo",
    "outro",
  ]),
  secondary_roles: z.string().optional(),
  daily_rate: rate,
  hourly_rate: rate,
  vr_rate: rate,
  vt_rate: rate,
  pix_key: z.string().optional(),
  bank_info: z.string().optional(),
  status: z.enum(["ativo", "inativo", "bloqueado"]),
  notes: z.string().optional(),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;

export const EMPLOYEE_ROLES = [
  { value: "agente_limpeza", label: "Agente de limpeza" },
  { value: "coordenador", label: "Coordenador" },
  { value: "motorista", label: "Motorista" },
  { value: "apoio", label: "Apoio" },
  { value: "supervisor", label: "Supervisor" },
  { value: "administrativo", label: "Administrativo" },
  { value: "outro", label: "Outro" },
] as const;

export const EMPLOYEE_STATUSES = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
  { value: "bloqueado", label: "Bloqueado" },
] as const;
