/**
 * Cálculo de preço de venda — mesma lógica da planilha
 * "CÁLCULO PREÇO DE VENDA" usada pela empresa.
 */

export interface PricingItemInput {
  quantity: number;
  hours: number | null;
  unit_price: number;
  is_internal_cost: boolean;
}

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
}): number {
  const qty = Number(item.quantity) || 0;
  const hours = Number(item.hours) || 0;
  const unit = Number(item.unit_price) || 0;
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
  const totalReceipt =
    taxReceipt < 1 ? round2(netPrice / (1 - taxReceipt)) : netPrice;

  return {
    subtotal,
    totalCost,
    priceWithMargin,
    bvAmount,
    discountAmount,
    netPrice,
    taxesNf: round2(totalNf - netPrice),
    taxesReceipt: round2(totalReceipt - netPrice),
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
