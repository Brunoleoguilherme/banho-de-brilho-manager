/**
 * Cálculo de preço de venda — mesma lógica da planilha
 * "CÁLCULO PREÇO DE VENDA" usada pela empresa.
 */

export interface PricingItemInput {
  quantity: number;
  hours: number | null;
  unit_price: number;
  is_internal_cost: boolean;
  category?: string;
}

/**
 * Categorias em que o valor unitário é uma DIÁRIA de 9 horas.
 * Regra da BB: até 9h = 1 diária; da 10ª à 13ª hora paga-se a hora
 * proporcional (diária ÷ 9); a partir de 14h paga-se 2 diárias.
 */
const DIARIA_9H = ["Agente de limpeza", "Coordenador"];

/** Categorias sem campo de horas (valor fixo por unidade) */
export const SEM_HORAS = ["Vale-refeição", "Vale-transporte"];

export interface PricingConfig {
  margin_percent: number;
  bv_percent: number;
  discount_percent: number;
  tax_percent_nf: number;
  tax_percent_receipt: number;
}

export interface PricingResult {
  subtotal: number;
  totalCost: number;
  priceWithMargin: number;
  bvAmount: number;
  discountAmount: number;
  netPrice: number;
  taxesNf: number;
  taxesReceipt: number;
  totalNf: number;
  totalReceipt: number;
}

export function itemTotal(item: {
  quantity: number;
  hours?: number | null;
  unit_price: number;
  category?: string;
}): number {
  const qty = Number(item.quantity) || 0;
  const hours = Number(item.hours) || 0;
  const unit = Number(item.unit_price) || 0;

  // Agente/Coordenador: diária de 9h + hora extra até 13h; 14h+ = 2 diárias
  if (item.category && DIARIA_9H.includes(item.category) && hours > 0) {
    let porPessoa: number;
    if (hours <= 9) porPessoa = unit;
    else if (hours <= 13) porPessoa = unit + (hours - 9) * (unit / 9);
    else porPessoa = unit * 2;
    return round2(qty * porPessoa);
  }

  // VR/VT e afins: sempre qtd × valor (sem horas)
  if (item.category && SEM_HORAS.includes(item.category)) {
    return round2(qty * unit);
  }

  const base = hours > 0 ? qty * hours * unit : qty * unit;
  return round2(base);
}

export function calculatePricing(
  items: PricingItemInput[],
  config: PricingConfig
): PricingResult {
  const subtotal = round2(
    items.reduce((acc, item) => acc + itemTotal(item), 0)
  );
  const totalCost = round2(
    items
      .filter((i) => i.is_internal_cost)
      .reduce((acc, item) => acc + itemTotal(item), 0)
  );

  const margin = pct(config.margin_percent);
  const bv = pct(config.bv_percent);
  const discount = pct(config.discount_percent);
  const taxNf = pct(config.tax_percent_nf);
  const taxReceipt = pct(config.tax_percent_receipt);

  const priceWithMargin = round2(subtotal * (1 + margin));
  const bvAmount = round2(priceWithMargin * bv);
  const discountAmount = round2((priceWithMargin + bvAmount) * discount);
  const netPrice = round2(priceWithMargin + bvAmount - discountAmount);

  // Imposto "por dentro": valor final = líquido / (1 - imposto)
  const totalNf = taxNf < 1 ? round2(netPrice / (1 - taxNf)) : netPrice;

  // Recibo: se houver % de imposto de recibo, usa "por dentro" como na NF.
  // Senão, regra padrão da BB: Recibo = NF ÷ 1,1 (aplicando 10% sobre o
  // valor com recibo, volta-se ao valor com nota — ex.: 100 ÷ 1,1 = 90,91).
  let totalReceipt: number;
  let taxesReceipt: number;
  if (taxReceipt > 0 && taxReceipt < 1) {
    totalReceipt = round2(netPrice / (1 - taxReceipt));
    taxesReceipt = round2(totalReceipt - netPrice);
  } else {
    totalReceipt = round2(totalNf / 1.1);
    taxesReceipt = 0;
  }

  return {
    subtotal,
    totalCost,
    priceWithMargin,
    bvAmount,
    discountAmount,
    netPrice,
    taxesNf: round2(totalNf - netPrice),
    taxesReceipt,
    totalNf,
    totalReceipt,
  };
}

function pct(value: number): number {
  const n = Number(value) || 0;
  return n / 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
