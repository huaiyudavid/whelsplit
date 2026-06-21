import { useEffect, useState } from "react";

import { api } from "../api/client";
import { formatCurrency } from "../api/currency";
import type { BalanceItem, CurrencyCode, Person } from "../types";

interface DashboardPageProps {
  displayCurrency: CurrencyCode;
}

export function DashboardPage({ displayCurrency }: DashboardPageProps) {
  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBalances = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [balancesData, peopleData] = await Promise.all([
          api.getBalances(displayCurrency),
          api.listPeople(),
        ]);
        setBalances(balancesData);
        setPeople(peopleData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load balances");
      } finally {
        setIsLoading(false);
      }
    };

    void loadBalances();
  }, [displayCurrency]);

  const peopleById = new Map(people.map((person) => [person.id, person]));

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold text-brand-900 dark:text-brand-100">Current Balances</h1>
        <p className="text-sm text-brand-700 dark:text-brand-300">Live settlement summary across all expenses.</p>
      </header>

      {isLoading && <p className="rounded-xl bg-white p-4 text-sm text-brand-700 shadow dark:bg-brand-900/70 dark:text-brand-200 dark:shadow-black/20">Loading balances...</p>}
      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 shadow dark:bg-red-950/60 dark:text-red-300 dark:shadow-black/20">{error}</p>}

      {!isLoading && !error && balances.length === 0 && (
        <p className="rounded-xl bg-white p-4 text-sm text-brand-700 shadow dark:bg-brand-900/70 dark:text-brand-200 dark:shadow-black/20">Everything is settled up.</p>
      )}

      <div className="space-y-3">
        {balances.map((item, index) => (
          (() => {
            const debtor = peopleById.get(item.from_person_id);
            const showPaid = debtor?.debts_paid ?? false;

            return (
              <article
                key={`${item.from}-${item.to}-${index}`}
                className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm dark:border-brand-700 dark:bg-brand-900/70 dark:shadow-black/20"
              >
                <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">
                  <span className="text-brand-900 dark:text-brand-100">{item.from}</span>{" "}
                  {showPaid ? "has paid their debts to" : "owes"}{" "}
                  <span className="text-brand-900 dark:text-brand-100">{item.to}</span>
                </p>
                <p className="mt-1 text-xl font-extrabold text-brand-600 dark:text-brand-300">
                  {formatCurrency(item.amount, displayCurrency)}
                </p>
                {showPaid && (
                  <p className="mt-1 text-xs font-semibold text-emerald-700">Marked as paid</p>
                )}
              </article>
            );
          })()
        ))}
      </div>
    </section>
  );
}
