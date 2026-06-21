import { FormEvent, useEffect, useState } from "react";

import { api } from "../api/client";
import type { Person } from "../types";

export function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadPeople = async () => {
    try {
      const data = await api.listPeople();
      setPeople(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load people");
    }
  };

  useEffect(() => {
    void loadPeople();
  }, []);

  const createPerson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newName.trim()) {
      return;
    }

    try {
      setError(null);
      await api.createPerson(newName.trim());
      setNewName("");
      await loadPeople();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add person");
    }
  };

  const saveRename = async (id: number) => {
    if (!editingName.trim()) {
      return;
    }

    try {
      setError(null);
      await api.updatePerson(id, { name: editingName.trim() });
      setEditingId(null);
      setEditingName("");
      await loadPeople();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename person");
    }
  };

  const toggleDebtsPaid = async (id: number, currentValue: boolean) => {
    try {
      setError(null);
      await api.updatePerson(id, { debts_paid: !currentValue });
      await loadPeople();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update debt status");
    }
  };

  const removePerson = async (id: number) => {
    const person = people.find((entry) => entry.id === id);
    const label = person?.name || `#${id}`;
    const isConfirmed = window.confirm(`Delete person "${label}"?`);
    if (!isConfirmed) {
      return;
    }

    try {
      setError(null);
      await api.deletePerson(id);
      await loadPeople();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete person");
    }
  };

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold text-brand-900 dark:text-brand-100">People</h1>
      </header>

      <form onSubmit={createPerson} className="flex gap-2 rounded-2xl border border-brand-100 bg-white p-3 shadow-sm dark:border-brand-700 dark:bg-brand-900/70 dark:shadow-black/20">
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Add new person"
          className="h-11 flex-1 rounded-xl border border-brand-200 bg-white px-3 text-brand-900 placeholder-brand-500 dark:border-brand-600 dark:bg-brand-800 dark:text-brand-100 dark:placeholder-brand-300"
        />
        <button type="submit" className="h-11 rounded-xl bg-brand-600 px-4 font-bold text-white">
          Add
        </button>
      </form>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-300">{error}</p>}

      <div className="space-y-2">
        {people.map((person) => (
          <article key={person.id} className="rounded-2xl border border-brand-100 bg-white p-3 shadow-sm dark:border-brand-700 dark:bg-brand-900/70 dark:shadow-black/20">
            {editingId === person.id ? (
              <div className="flex gap-2">
                <input
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  className="h-11 flex-1 rounded-xl border border-brand-200 bg-white px-3 text-brand-900 dark:border-brand-600 dark:bg-brand-800 dark:text-brand-100"
                />
                <button onClick={() => void saveRename(person.id)} className="h-11 rounded-xl bg-brand-600 px-3 font-semibold text-white">
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-900 dark:text-brand-100">{person.name}</p>
                  <p className="text-xs text-brand-600 dark:text-brand-300">
                    Debt status: {person.debts_paid ? "Paid" : "Unpaid"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void toggleDebtsPaid(person.id, person.debts_paid)}
                    className="h-10 rounded-lg bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                  >
                    {person.debts_paid ? "Mark Unpaid" : "Mark Paid"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(person.id);
                      setEditingName(person.name);
                    }}
                    className="h-10 rounded-lg bg-brand-50 px-3 text-sm font-semibold text-brand-800 dark:bg-brand-800 dark:text-brand-100"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => void removePerson(person.id)}
                    className="h-10 rounded-lg bg-red-50 px-3 text-sm font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
