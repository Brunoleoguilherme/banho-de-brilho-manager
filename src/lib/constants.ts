export const SERVICE_TYPES = [
  { value: "limpeza_evento", label: "Limpeza de evento" },
  { value: "limpeza_montagem", label: "Limpeza montagem" },
  { value: "limpeza_realizacao", label: "Limpeza realização" },
  { value: "limpeza_desmontagem", label: "Limpeza desmontagem" },
  { value: "limpeza_continua", label: "Limpeza contínua" },
  { value: "limpeza_especial", label: "Limpeza especial" },
  { value: "apoio_operacional", label: "Apoio operacional" },
  { value: "outro", label: "Outro" },
] as const;

export const BILLING_TYPES = [
  { value: "nota_fiscal", label: "Nota fiscal" },
  { value: "recibo", label: "Recibo" },
  { value: "outro", label: "Outro" },
] as const;

export const CLIENT_TYPES = [
  { value: "empresa", label: "Empresa" },
  { value: "pessoa_fisica", label: "Pessoa física" },
] as const;

export const USER_ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "comercial", label: "Comercial" },
  { value: "operacional", label: "Operacional" },
  { value: "financeiro", label: "Financeiro" },
  { value: "gestor", label: "Gestor" },
  { value: "consulta", label: "Consulta" },
] as const;

export const BR_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

export const PAYABLE_CATEGORIES = [
  "Diárias Eventos",
  "Vale Refeição",
  "Vale Transporte",
  "FGTS",
  "INSS",
  "INSS/ISS Retidos",
  "Simples Nacional",
  "Insumos Eventos",
  "Veículos",
  "Cemig",
  "Copasa",
  "Vivo",
  "Bancos/Cartões",
  "Juros de Mora",
  "Pessoais",
  "Obra",
  "Custo Fixo",
  "Material Limpeza",
  "Material Descartável",
  "Manutenção",
  "Outros",
] as const;

export const COMPANY = {
  name: "BANHO DE BRILHO LIMPEZAS ESPECIAIS LTDA.",
  cnpj: "03.232.988/0001-02",
  address: "Rua Santa Cruz, 455 – Alto Barroca – Belo Horizonte/MG",
  zip: "30.431-045",
  phones: "(31) 3889-2960 / 99986-2960 / 99130-4768",
  email: "bh@banhodebrilho.com.br",
} as const;

/** Converte "limpeza_montagem,limpeza_desmontagem" em "Limpeza montagem + Limpeza desmontagem" */
export function serviceTypesLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .split(",")
    .filter(Boolean)
    .map((v) => labelFor(SERVICE_TYPES, v.trim()))
    .join(" + ");
}

export function labelFor(
  list: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined
): string {
  return list.find((i) => i.value === value)?.label ?? value ?? "—";
}
