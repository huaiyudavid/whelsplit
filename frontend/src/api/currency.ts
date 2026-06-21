import type { CurrencyCode } from "../types";

type ExpenseRateSnapshot = {
  currency: CurrencyCode;
  exchange_rate_to_usd?: number | null;
  exchange_rate_to_cad?: number | null;
  exchange_rate_to_jpy?: number | null;
};

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(amount);
}

export function convertWithExpenseSnapshot(
  amount: number,
  expense: ExpenseRateSnapshot,
  targetCurrency: CurrencyCode,
): number {
  if (expense.currency === targetCurrency) {
    return amount;
  }

  const rateByTargetCurrency: Record<CurrencyCode, number | null | undefined> = {
    USD: expense.exchange_rate_to_usd,
    CAD: expense.exchange_rate_to_cad,
    JPY: expense.exchange_rate_to_jpy,
  };

  const rate = rateByTargetCurrency[targetCurrency];
  if (rate === undefined || rate === null) {
    throw new Error(`Missing exchange rate snapshot for ${expense.currency} to ${targetCurrency}`);
  }

  return amount * rate;
}
