export type CurrencyCode = "USD" | "CAD" | "JPY";

export interface Person {
  id: number;
  name: string;
  debts_paid: boolean;
  created_at: string;
}

export interface ExpenseSplit {
  id: number;
  expense_id: number;
  person_id: number;
  amount_owed: number;
  currency: CurrencyCode;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  currency: CurrencyCode;
  exchange_rate_to_usd?: number | null;
  exchange_rate_to_cad?: number | null;
  exchange_rate_to_jpy?: number | null;
  payer_id: number;
  expense_date: string;
  created_at: string;
  splits: ExpenseSplit[];
}

export interface BalanceItem {
  from_person_id: number;
  to_person_id: number;
  from: string;
  to: string;
  amount: number;
  currency: CurrencyCode;
}

export interface CurrencyConversion {
  amount: number;
  from: CurrencyCode;
  to: CurrencyCode;
  converted_amount: number;
}

export interface ExpenseCreatePayload {
  description: string;
  amount: number;
  currency: CurrencyCode;
  payer_id: number;
  expense_date?: string;
  split_type: "equal" | "manual";
  participants?: Array<{ person_id: number }>;
  splits?: Array<{ person_id: number; amount: number }>;
}
