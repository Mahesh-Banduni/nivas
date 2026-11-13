/** Money is always integer paise. Never use floats for currency. */

export const HOLD_MINUTES = 15;
export const SERVICE_FEE_RATE = 0.08;
export const GST_RATE = 0.18; // applied to the platform service fee
export const COMMISSION_RATE = 0.15; // platform share of the nightly subtotal

export function formatINR(paise: number, opts: { compact?: boolean; decimals?: boolean } = {}): string {
  const rupees = paise / 100;
  if (opts.compact) {
    if (rupees >= 10_000_000) return `₹${(rupees / 10_000_000).toFixed(1)}Cr`;
    if (rupees >= 100_000) return `₹${(rupees / 100_000).toFixed(1)}L`;
    if (rupees >= 1_000) return `₹${(rupees / 1_000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  }).format(rupees);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export interface Quote {
  nights: number;
  nightlyPrice: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  taxAmount: number;
  total: number;
  platformFee: number;
  ownerAmount: number;
}

export function computeQuote(input: {
  nightlyPrice: number;
  cleaningFee: number;
  nights: number;
}): Quote {
  const subtotal = input.nightlyPrice * input.nights;
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  const taxAmount = Math.round(serviceFee * GST_RATE);
  const total = subtotal + input.cleaningFee + serviceFee + taxAmount;
  const platformFee = Math.round(subtotal * COMMISSION_RATE) + serviceFee + taxAmount;
  const ownerAmount = total - platformFee;
  return {
    nights: input.nights,
    nightlyPrice: input.nightlyPrice,
    subtotal,
    cleaningFee: input.cleaningFee,
    serviceFee,
    taxAmount,
    total,
    platformFee,
    ownerAmount,
  };
}

export function percent(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}
