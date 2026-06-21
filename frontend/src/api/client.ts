import type { BalanceItem, CurrencyCode, CurrencyConversion, Expense, ExpenseCreatePayload, Person } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getErrorMessage(errorData: unknown): string {
  if (typeof errorData === "string") {
    return errorData;
  }

  if (errorData && typeof errorData === "object") {
    const detail = (errorData as { detail?: unknown }).detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      const messages = detail
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }

          const message = (entry as { msg?: unknown }).msg;
          return typeof message === "string" ? message : null;
        })
        .filter((message): message is string => Boolean(message));

      if (messages.length > 0) {
        return messages.join("; ");
      }
    }
  }

  return "Request failed";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (init?.body !== undefined) {
    console.log("API request body:", init.body);
  }

  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = getErrorMessage(errorData);
    console.error("API request failed:", message);
    console.error("API request failed details:", {
      path,
      status: response.status,
      errorData,
    });
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  listPeople: () => request<Person[]>("/people"),
  createPerson: (name: string, debts_paid = false) =>
    request<Person>("/people", {
      method: "POST",
      body: JSON.stringify({ name, debts_paid }),
    }),
  updatePerson: (id: number, payload: { name?: string; debts_paid?: boolean }) =>
    request<Person>(`/people/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deletePerson: (id: number) =>
    request<void>(`/people/${id}`, {
      method: "DELETE",
    }),

  listExpenses: () => request<Expense[]>("/expenses"),
  getExpense: (id: number) => request<Expense>(`/expenses/${id}`),
  createExpense: (payload: ExpenseCreatePayload) =>
    request<Expense>("/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateExpense: (id: number, payload: ExpenseCreatePayload) =>
    request<Expense>(`/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteExpense: (id: number) =>
    request<void>(`/expenses/${id}`, {
      method: "DELETE",
    }),

  getBalances: (currency: CurrencyCode) =>
    request<BalanceItem[]>(`/balances?currency=${currency}`),
  convertCurrency: (amount: number, from: CurrencyCode, to: CurrencyCode) =>
    request<CurrencyConversion>(
      `/currency/convert?amount=${encodeURIComponent(String(amount))}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ),
};
