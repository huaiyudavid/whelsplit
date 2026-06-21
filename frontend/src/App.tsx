import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { BottomNav } from "./components/BottomNav";
import { CurrencySelector } from "./components/CurrencySelector";
import logo from "./assets/logo.png";
import { AddExpensePage } from "./pages/AddExpensePage";
import { DashboardPage } from "./pages/DashboardPage";
import { ExpenseDetailsPage } from "./pages/ExpenseDetailsPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { PeoplePage } from "./pages/PeoplePage";
import type { CurrencyCode } from "./types";

export default function App() {
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>("USD");

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

        <div className="mb-5 rounded-2xl border border-brand-200/70 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-brand-700/70 dark:bg-brand-900/60 dark:shadow-black/20">
          <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} />
        </div>

        <Routes>
          <Route path="/" element={<DashboardPage displayCurrency={displayCurrency} />} />
          <Route path="/expenses" element={<ExpensesPage displayCurrency={displayCurrency} />} />
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
