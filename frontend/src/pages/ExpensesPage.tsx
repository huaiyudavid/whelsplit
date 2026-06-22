import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import { convertWithExpenseSnapshot, formatCurrency } from "../api/currency";
import type { CurrencyCode, Expense, Person } from "../types";
import { formatExpenseDate, formatExpenseDateTime } from "../utils/dates";

interface ExpensesPageProps {
  displayCurrency: CurrencyCode;
  descriptionFilter: string;
  payerFilter: number | null;
}

export function ExpensesPage({ displayCurrency, descriptionFilter, payerFilter }: ExpensesPageProps) {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [convertedAmounts, setConvertedAmounts] = useState<Record<number, number>>({});
  const [isConverting, setIsConverting] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const [expenseData, peopleData] = await Promise.all([api.listExpenses(), api.listPeople()]);
        setExpenses(expenseData);
        setPeople(peopleData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load expenses");
      }
    };

    void load();
  }, []);

  useEffect(() => {
    const convertExpenses = () => {
      if (expenses.length === 0) {
        setConvertedAmounts({});
        return;
      }

      try {
        setIsConverting(true);
        const convertedEntries = expenses.map((expense) => [
          expense.id,
          convertWithExpenseSnapshot(expense.amount, expense, displayCurrency),
        ] as const);
        setConvertedAmounts(Object.fromEntries(convertedEntries));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to convert currency");
      } finally {
        setIsConverting(false);
      }
    };

    void convertExpenses();
  }, [displayCurrency, expenses]);

  const removeExpense = async (expense: Expense) => {
    const isConfirmed = window.confirm(`Delete expense "${expense.description}"?`);
    if (!isConfirmed) {
      return;
    }

    try {
      setError(null);
      setDeletingExpenseId(expense.id);
      await api.deleteExpense(expense.id);
      setExpenses((currentExpenses) => currentExpenses.filter((item) => item.id !== expense.id));
      setConvertedAmounts((currentAmounts) => {
        const { [expense.id]: _removedAmount, ...rest } = currentAmounts;
        return rest;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete expense");
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const peopleMap = useMemo(() => new Map(people.map((person) => [person.id, person.name])), [people]);
  const normalizedDescriptionFilter = descriptionFilter.trim().toLowerCase();

  const filteredExpenses = useMemo(
    () => expenses.filter((expense) => {
      const matchesDescription =
        normalizedDescriptionFilter.length === 0 || expense.description.toLowerCase().includes(normalizedDescriptionFilter);
      const matchesPayer = payerFilter === null || expense.payer_id === payerFilter;
      return matchesDescription && matchesPayer;
    }),
    [expenses, normalizedDescriptionFilter, payerFilter],
  );

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold text-brand-900 dark:text-brand-100">Expenses</h1>
        <p className="text-sm text-brand-700 dark:text-brand-300">Amounts are preserved in original currency and displayed converted.</p>
      </header>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-300">{error}</p>}
      {isConverting && <p className="rounded-xl bg-white p-4 text-sm text-brand-700 dark:bg-brand-900/70 dark:text-brand-200">Converting amounts...</p>}

      <div className="space-y-3">
        {filteredExpenses.map((expense) => {
          const converted = convertedAmounts[expense.id] ?? expense.amount;
          const isDeleting = deletingExpenseId === expense.id;
          return (
            <article
              key={expense.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/expenses/${expense.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(`/expenses/${expense.id}`);
                }
              }}
              className="cursor-pointer rounded-2xl border border-brand-100 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow dark:border-brand-700 dark:bg-brand-900/70 dark:shadow-black/20 dark:hover:border-brand-500"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-brand-900 dark:text-brand-100">{expense.description}</h2>
                  <p title={formatExpenseDateTime(expense.expense_date)} className="text-xs text-brand-600 dark:text-brand-300">{formatExpenseDate(expense.expense_date)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800 dark:bg-brand-700/70 dark:text-brand-100">Paid by {peopleMap.get(expense.payer_id) || `#${expense.payer_id}`}</p>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void removeExpense(expense);
                    }}
                    disabled={isDeleting}
                    className="h-9 rounded-lg bg-red-50 px-3 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-950/60 dark:text-red-300"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <p className="text-sm text-brand-700 dark:text-brand-300">
                  Original: <span className="font-bold text-brand-900 dark:text-brand-100">{formatCurrency(expense.amount, expense.currency)}</span>
                </p>
                <p className="text-sm text-brand-700 dark:text-brand-300">
                  In {displayCurrency}: <span className="font-bold text-brand-900 dark:text-brand-100">{formatCurrency(converted, displayCurrency)}</span>
                </p>
              </div>
            </article>
          );
        })}

        {filteredExpenses.length === 0 && (
          <p className="rounded-xl bg-white p-4 text-sm text-brand-700 dark:bg-brand-900/70 dark:text-brand-200">
            {expenses.length === 0 ? "No expenses yet." : "No expenses match the current filters."}
          </p>
        )}
      </div>
    </section>
  );
}
