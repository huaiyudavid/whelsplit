import type { CurrencyCode } from "../types";

interface CurrencySelectorProps {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
}

export function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  return (
    <label className="flex w-full items-center justify-between rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-800 shadow-sm dark:border-brand-700 dark:bg-brand-900/70 dark:text-brand-100 dark:shadow-black/20">
      <span>Display Currency</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as CurrencyCode)}
        className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800 dark:border-brand-600 dark:bg-brand-800 dark:text-brand-100"
      >
        <option value="USD">USD</option>
        <option value="CAD">CAD</option>
        <option value="JPY">JPY</option>
      </select>
    </label>
  );
}
