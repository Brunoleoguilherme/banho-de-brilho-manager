"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Plus } from "lucide-react";
import {
  toggleChecklistItemAction,
  addChecklistItemAction,
} from "@/lib/actions/operations";

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export function ChecklistCard({
  osId,
  items,
}: {
  osId: string;
  items: ChecklistItem[];
}) {
  const router = useRouter();
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const doneCount = items.filter((i) => i.done).length;

  async function handleToggle(item: ChecklistItem) {
    await toggleChecklistItemAction(item.id, osId, !item.done);
    router.refresh();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setBusy(true);
    await addChecklistItemAction(osId, newLabel);
    setNewLabel("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-brand-teal" />
          <h2 className="text-base font-semibold text-ink">
            Checklist operacional
          </h2>
        </div>
        <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink-muted">
          {doneCount}/{items.length}
        </span>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => handleToggle(item)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
              />
              <span
                className={
                  item.done
                    ? "text-sm text-ink-muted line-through"
                    : "text-sm text-ink"
                }
              >
                {item.label}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="mt-4 flex gap-2">
        <input
          className="input-base"
          placeholder="Adicionar item ao checklist..."
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy || !newLabel.trim()}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-petrol px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Incluir
        </button>
      </form>
    </div>
  );
}
