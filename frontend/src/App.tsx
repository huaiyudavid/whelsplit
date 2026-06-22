import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { api } from "./api/client";
import { BottomNav } from "./components/BottomNav";
import { CurrencySelector } from "./components/CurrencySelector";
import logo from "./assets/logo.png";
import { AddExpensePage } from "./pages/AddExpensePage";
import { DashboardPage } from "./pages/DashboardPage";
import { ExpenseDetailsPage } from "./pages/ExpenseDetailsPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { PeoplePage } from "./pages/PeoplePage";
import type { CurrencyCode, Person } from "./types";

export default function App() {
  const location = useLocation();
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>("USD");
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const [payerFilter, setPayerFilter] = useState<string>("all");
  const [people, setPeople] = useState<Person[]>([]);

  const isExpensesRoute = location.pathname === "/expenses";
  const parsedPayerFilter = useMemo(() => {
    if (payerFilter === "all") {
      return null;
    }

    const parsed = Number(payerFilter);
    return Number.isNaN(parsed) ? null : parsed;
  }, [payerFilter]);

  useEffect(() => {
    if (!isExpensesRoute) {
      return;
    }

    const loadPeople = async () => {
      try {
        const peopleData = await api.listPeople();
        setPeople(peopleData);
      } catch {
        setPeople([]);
      }
    };

    void loadPeople();
  }, [isExpensesRoute]);

  return (
    <div className="min-h-screen bg-app-gradient pb-20">
      <main className="mx-auto w-full max-w-md px-4 pb-8 pt-6">
        <header className="mb-5 flex items-center justify-end gap-3 px-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-700 dark:text-brand-200">
            Whelsplit
          </h1>

          <img
            src={logo}
            alt="Whelsplit logo"
            className="h-12 w-12 rounded-xl object-cover shadow-sm ring-1 ring-brand-200/60 dark:ring-brand-700/60"
          />
        </header>

        <div className="mb-5 space-y-2 rounded-2xl border border-brand-200/70 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-brand-700/70 dark:bg-brand-900/60 dark:shadow-black/20">
          <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} />

          {isExpensesRoute && (
            <>
              <label className="block text-sm font-semibold text-brand-800 dark:text-brand-100">
                <input
                  type="text"
                  value={descriptionFilter}
                  onChange={(event) => setDescriptionFilter(event.target.value)}
                  placeholder="Search by description"
                  className="mt-1 w-full rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900 placeholder:text-brand-500 dark:border-brand-600 dark:bg-brand-800 dark:text-brand-100 dark:placeholder:text-brand-300"
                />
              </label>

              <label className="block text-sm font-semibold text-brand-800 dark:text-brand-100">
                <select
                  value={payerFilter}
                  onChange={(event) => setPayerFilter(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900 dark:border-brand-600 dark:bg-brand-800 dark:text-brand-100"
                >
                  <option value="all">All payers</option>
                  {people.map((person) => (
                    <option key={person.id} value={String(person.id)}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => {
                  setDescriptionFilter("");
                  setPayerFilter("all");
                }}
                className="w-full rounded-lg border border-brand-300 bg-white px-3 py-2 text-sm font-semibold text-brand-800 transition hover:border-brand-400 hover:bg-brand-50 dark:border-brand-600 dark:bg-brand-800 dark:text-brand-100 dark:hover:border-brand-500"
              >
                Clear filters
              </button>
            </>
          )}
        </div>

        <Routes>
          <Route path="/" element={<DashboardPage displayCurrency={displayCurrency} />} />
          <Route
            path="/expenses"
            element={<ExpensesPage displayCurrency={displayCurrency} descriptionFilter={descriptionFilter} payerFilter={parsedPayerFilter} />}
          />
          <Route path="/expenses/:expenseId" element={<ExpenseDetailsPage displayCurrency={displayCurrency} />} />
          <Route path="/expenses/new" element={<AddExpensePage />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
