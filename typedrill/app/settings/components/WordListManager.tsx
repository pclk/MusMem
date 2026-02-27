"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface WordListItem {
  id: string;
  name: string;
  wordCount: number;
  createdAt: string;
}

interface WordListManagerProps {
  wordLists: WordListItem[];
}

export default function WordListManager({
  wordLists: initialLists,
}: WordListManagerProps) {
  const router = useRouter();
  const [wordLists, setWordLists] = useState(initialLists);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [wordsText, setWordsText] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setError("");
    setCreating(true);

    const words = wordsText
      .split(/[\n,\s]+/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0);

    if (words.length === 0) {
      setError("Please enter at least one word");
      setCreating(false);
      return;
    }

    try {
      const res = await fetch("/api/wordlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, words }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create word list");
        return;
      }

      const newList = await res.json();
      setWordLists([
        {
          id: newList.id,
          name: newList.name,
          wordCount: newList.words.length,
          createdAt: newList.createdAt,
        },
        ...wordLists,
      ]);
      setName("");
      setWordsText("");
      setShowCreate(false);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/wordlists/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWordLists(wordLists.filter((l) => l.id !== id));
        router.refresh();
      }
    } catch {
      // silently fail
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Word Lists</h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? "Cancel" : "New list"}
        </Button>
      </div>

      {showCreate && (
        <div className="space-y-3 p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
          <Input
            label="List name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Programming Terms"
          />
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Words (one per line, or comma/space separated)
            </label>
            <textarea
              value={wordsText}
              onChange={(e) => setWordsText(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="function&#10;variable&#10;return&#10;const&#10;..."
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? "Creating..." : "Create list"}
          </Button>
        </div>
      )}

      {wordLists.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No custom word lists. Create one to practice domain-specific
          vocabulary.
        </p>
      ) : (
        <div className="space-y-2">
          {wordLists.map((list) => (
            <div
              key={list.id}
              className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/30"
            >
              <div>
                <p className="font-medium text-sm">{list.name}</p>
                <p className="text-xs text-zinc-500">
                  {list.wordCount} words
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(list.id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
