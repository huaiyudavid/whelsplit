import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api/client";
import { convertWithExpenseSnapshot, formatCurrency } from "../api/currency";
import type { CurrencyCode, Expense, Person } from "../types";
import { formatExpenseDate, formatExpenseDateTime } from "../utils/dates";

interface ExpenseDetailsPageProps {
  displayCurrency: CurrencyCode;
}

export function ExpenseDetailsPage({ displayCurrency }: ExpenseDetailsPageProps) {
  const { expenseId } = useParams<{ expenseId: string }>();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [convertedSplits, setConvertedSplits] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const id = Number(expenseId);
      if (!id || Number.isNaN(id)) {
        setError("Invalid expense id");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const [expenseData, peopleData] = await Promise.all([api.getExpense(id), api.listPeople()]);
        setExpense(expenseData);
        setPeople(peopleData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load expense");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [expenseId]);

  useEffect(() => {
    const convert = () => {
      if (!expense) {
        setConvertedAmount(null);
        setConvertedSplits({});
        return;
      }

      try {
        setIsConverting(true);
        const expenseConvertedAmount = convertWithExpenseSnapshot(expense.amount, expense, displayCurrency);
        setConvertedAmount(expenseConvertedAmount);
        setConvertedSplits(
          Object.fromEntries(
            expense.splits.map((split) => [split.id, convertWithExpenseSnapshot(split.amount_owed, expense, displayCurrency)]),
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to convert currency");
      } finally {
        setIsConverting(false);
      }
    };

    void convert();
  }, [displayCurrency, expense]);

  const peopleMap = useMemo(() => new Map(people.map((person) => [person.id, person.name])), [people]);

  if (isLoading) {
    return (
      <section className="space-y-4">
        <p className="rounded-xl bg-white p-4 text-sm text-brand-700 dark:bg-brand-900/70 dark:text-brand-200">Loading expense details...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-4">
        <Link to="/expenses" className="text-sm font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-200">
          Back to expenses
        </Link>
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-300">{error}</p>
      </section>
    );
  }

  if (!expense) {
    return (
      <section className="space-y-4">
        <Link to="/expenses" className="text-sm font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-200">
          Back to expenses
        </Link>
        <p className="rounded-xl bg-white p-4 text-sm text-brand-700 dark:bg-brand-900/70 dark:text-brand-200">Expense not found.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <Link to="/expenses" className="text-sm font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-200">
        Back to expenses
      </Link>

      <article className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm dark:border-brand-700 dark:bg-brand-900/70 dark:shadow-black/20">
        <header className="space-y-1">
          <h1 className="text-2xl font-extrabold text-brand-900 dark:text-brand-100">{expense.description}</h1>
          <p title={formatExpenseDateTime(expense.expense_date)} className="text-xs text-brand-600 dark:text-brand-300">{formatExpenseDate(expense.expense_date)}</p>
          <p className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800 inline-block dark:bg-brand-700/70 dark:text-brand-100">
            Paid by {peopleMap.get(expense.payer_id) || `#${expense.payer_id}`}
          </p>
        </header>

        <div className="mt-4 space-y-1">
          <p className="text-sm text-brand-700 dark:text-brand-300">
            Original total: <span className="font-bold text-brand-900 dark:text-brand-100">{formatCurrency(expense.amount, expense.currency)}</span>
          </p>
          <p className="text-sm text-brand-700 dark:text-brand-300">
            In {displayCurrency}:{" "}
            <span className="font-bold text-brand-900 dark:text-brand-100">
              {formatCurrency(convertedAmount ?? expense.amount, displayCurrency)}
            </span>
          </p>
          {isConverting && <p className="text-xs text-brand-600 dark:text-brand-300">Converting values...</p>}
        </div>
      </article>

      <article className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm dark:border-brand-700 dark:bg-brand-900/70 dark:shadow-black/20">
        <h2 className="text-lg font-bold text-brand-900 dark:text-brand-100">Split Details</h2>

        <div className="mt-3 space-y-3">
          {expense.splits.map((split) => {
            const personName = peopleMap.get(split.person_id) || `#${split.person_id}`;
            const convertedSplit = convertedSplits[split.id] ?? split.amount_owed;

            return (
              <div key={split.id} className="rounded-xl border border-brand-100 p-3 dark:border-brand-700">
                <p className="text-sm font-semibold text-brand-900 dark:text-brand-100">{personName}</p>
                <p className="text-sm text-brand-700 dark:text-brand-300">
                  Original: <span className="font-bold text-brand-900 dark:text-brand-100">{formatCurrency(split.amount_owed, split.currency)}</span>
                </p>
                <p className="text-sm text-brand-700 dark:text-brand-300">
                  In {displayCurrency}:{" "}
                  <span className="font-bold text-brand-900 dark:text-brand-100">{formatCurrency(convertedSplit, displayCurrency)}</span>
                </p>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}
