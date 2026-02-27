"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

interface SettingsFormProps {
  initialCharsPerPage: number;
  initialTargetedPracticeRatio: number;
  initialMode: "TEXT" | "KEYMAP";
  activeListId: string | null;
  wordLists: { id: string; name: string }[];
}

export default function SettingsForm({
  initialCharsPerPage,
  initialTargetedPracticeRatio,
  initialMode,
  activeListId,
  wordLists,
}: SettingsFormProps) {
  const [charsPerPage, setCharsPerPage] = useState(initialCharsPerPage);
  const [targetedPracticeRatio, setTargetedPracticeRatio] = useState(
    initialTargetedPracticeRatio
  );
  const [mode, setMode] = useState<"TEXT" | "KEYMAP">(initialMode);
  const [selectedList, setSelectedList] = useState<string>(
    activeListId ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          charsPerPage,
          targetedPracticeRatio,
          mode,
          activeListId: selectedList || null,
        }),
      });

      if (res.ok) {
        setMessage("Settings saved");
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to save");
      }
    } catch {
      setMessage("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Characters per page: {charsPerPage}
        </label>
        <input
          type="range"
          min={50}
          max={500}
          step={10}
          value={charsPerPage}
          onChange={(e) => setCharsPerPage(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
        <div className="flex justify-between text-xs text-zinc-500 mt-1">
          <span>50</span>
          <span>500</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Targeted practice intensity: {targetedPracticeRatio}%
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={targetedPracticeRatio}
          onChange={(e) => setTargetedPracticeRatio(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
        <div className="flex justify-between text-xs text-zinc-500 mt-1">
          <span>0% (all variety)</span>
          <span>100% (all targeted)</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Practice mode
        </label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "TEXT" | "KEYMAP")}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="TEXT">Text typing</option>
          <option value="KEYMAP">Keymap drills</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Active word list
        </label>
        <select
          value={selectedList}
          onChange={(e) => setSelectedList(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Default English (5k words)</option>
          {wordLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </Button>
        {message && (
          <span className="text-sm text-zinc-400">{message}</span>
        )}
      </div>
    </div>
  );
}
