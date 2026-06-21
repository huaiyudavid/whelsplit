import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { CurrencyCode, ExpenseCreatePayload, Person } from "../types";

const roundCurrencyAmount = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function AddExpensePage() {
  const navigate = useNavigate();

  const [people, setPeople] = useState<Person[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [payerId, setPayerId] = useState<number | "">("");
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [splitType, setSplitType] = useState<"equal" | "manual">("equal");
  const [manualSplits, setManualSplits] = useState<Record<number, string>>({});
  const [manualTaxRate, setManualTaxRate] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadPeople = async () => {
      try {
        const data = await api.listPeople();
        setPeople(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load people");
      }
    };

    void loadPeople();
  }, []);

  const participantOptions = useMemo(() => {
    return people.filter((person) => person.id !== payerId);
  }, [people, payerId]);

  const parsedManualTaxRate = splitType === "manual" ? Number(manualTaxRate || 0) : 0;
  const manualTaxMultiplier = 1 + parsedManualTaxRate / 100;

  const toggleParticipant = (personId: number) => {
    setSelectedParticipants((current) =>
      current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId],
    );
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!description.trim() || !parsedAmount || parsedAmount <= 0 || payerId === "") {
      setError("Please complete description, amount, and paid by fields.");
      return;
    }

    if (selectedParticipants.length === 0) {
      setError("Select at least one participant.");
      return;
    }

    const payload: ExpenseCreatePayload = {
      description: description.trim(),
      amount: parsedAmount,
      currency,
      payer_id: Number(payerId),
      split_type: splitType,
    };

    if (splitType === "equal") {
      payload.participants = selectedParticipants.map((person_id) => ({ person_id }));
    } else {
      if (!Number.isFinite(parsedManualTaxRate) || parsedManualTaxRate < 0) {
        setError("Tax rate must be 0 or greater.");
        return;
      }

      const rawSplits = selectedParticipants.map((person_id) => ({
        person_id,
        amount: Number(manualSplits[person_id] || 0),
      }));

      if (rawSplits.some((split) => !Number.isFinite(split.amount) || split.amount <= 0)) {
        setError("Enter an amount owed greater than 0 for each selected participant.");
        return;
      }

      const manualSplitTotal = rawSplits.reduce((total, split) => total + split.amount, 0);
      if (manualSplitTotal > parsedAmount) {
        setError("Manual splits cannot exceed the expense amount before tax.");
        return;
      }

      payload.splits = rawSplits.map((split) => ({
        person_id: split.person_id,
        amount: roundCurrencyAmount(split.amount * manualTaxMultiplier),
      }));
    }

    try {
      setSubmitting(true);
      await api.createExpense(payload);
      navigate("/expenses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold text-brand-900 dark:text-brand-100">Add Expense</h1>
      </header>

      <form onSubmit={submitForm} className="space-y-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm dark:border-brand-700 dark:bg-brand-900/70 dark:shadow-black/20">
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-brand-800 dark:text-brand-200">Description</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="h-12 w-full rounded-xl border border-brand-200 bg-white px-3 text-brand-900 placeholder-brand-500 dark:border-brand-600 dark:bg-brand-800 dark:text-brand-100 dark:placeholder-brand-300"
            placeholder="Dinner"
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-brand-800 dark:text-brand-200">Amount</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-12 w-full rounded-xl border border-brand-200 bg-white px-3 text-brand-900 dark:border-brand-600 dark:bg-brand-800 dark:text-brand-100"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-semibold text-brand-800 dark:text-brand-200">Currency</span>
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
              className="h-12 w-full rounded-xl border border-brand-200 bg-white px-3 text-brand-900 dark:border-brand-600 dark:bg-brand-800 dark:text-brand-100"
            >
              <option value="USD">USD</option>
              <option value="CAD">CAD</option>
              <option value="JPY">JPY</option>
            </select>
          </label>
        </div>

        {splitType === "manual" && (
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-brand-800 dark:text-brand-200">Tax rate (%)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={manualTaxRate}
              onChange={(event) => setManualTaxRate(event.target.value)}
              className="h-12 w-full rounded-xl border border-brand-200 bg-white px-3 text-brand-900 dark:border-brand-600 dark:bg-brand-800 dark:text-brand-100"
              placeholder="0"
            />
            <p className="text-xs text-brand-600 dark:text-brand-300">Tax is applied to each person&apos;s split only. The total expense amount is assumed to already include tax.</p>
          </label>
        )}

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-brand-800 dark:text-brand-200">Paid by</span>
          <select
            value={payerId}
            onChange={(event) => setPayerId(Number(event.target.value))}
            className="h-12 w-full rounded-xl border border-brand-200 bg-white px-3 text-brand-900 dark:border-brand-600 dark:bg-brand-800 dark:text-brand-100"
            required
          >
            <option value="">Select payer</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-brand-800 dark:text-brand-200">Split mode</legend>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSplitType("equal")}
              className={`h-12 rounded-xl font-semibold ${splitType === "equal" ? "bg-brand-500 text-white dark:bg-brand-600" : "bg-brand-50 text-brand-800 dark:bg-brand-800 dark:text-brand-100"}`}
            >
              Equal split
            </button>
            <button
              type="button"
              onClick={() => setSplitType("manual")}
              className={`h-12 rounded-xl font-semibold ${splitType === "manual" ? "bg-brand-500 text-white dark:bg-brand-600" : "bg-brand-50 text-brand-800 dark:bg-brand-800 dark:text-brand-100"}`}
            >
              Manual split
            </button>
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-brand-800 dark:text-brand-200">Participants</legend>
          <div className="space-y-2">
            {participantOptions.map((person) => {
              const checked = selectedParticipants.includes(person.id);
              return (
                <div key={person.id} className="rounded-xl border border-brand-100 p-3 dark:border-brand-700">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleParticipant(person.id)}
                      className="h-5 w-5"
                    />
                    <span className="font-semibold text-brand-900 dark:text-brand-100">{person.name}</span>
                  </label>
                  {splitType === "manual" && checked && (
                    <div className="mt-2 space-y-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={manualSplits[person.id] || ""}
                        onChange={(event) =>
                          setManualSplits((current) => ({
                            ...current,
                            [person.id]: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-lg border border-brand-200 bg-white px-3 text-brand-900 dark:border-brand-600 dark:bg-brand-800 dark:text-brand-100"
                        placeholder="Amount owed before tax"
                      />
                      {manualSplits[person.id] && Number(manualSplits[person.id]) > 0 && Number.isFinite(parsedManualTaxRate) && (
                        <p className="text-xs text-brand-600 dark:text-brand-300">
                          With tax: {roundCurrencyAmount(Number(manualSplits[person.id]) * manualTaxMultiplier).toFixed(2)} {currency}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="h-12 w-full rounded-xl bg-brand-600 text-base font-bold text-white disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save Expense"}
        </button>
      </form>
    </section>
  );
}
