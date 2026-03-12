"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { parseKeymapExercisesText, serializeKeymapExercises } from "@/lib/keymaps/text";

interface KeymapExerciseItem {
  prompt: string;
  acceptedInputs: string[];
}

interface KeymapListItem {
  id: string;
  name: string;
  exercises: KeymapExerciseItem[];
  exerciseCount: number;
  createdAt: string;
}

interface KeymapListManagerProps {
  keymapLists: KeymapListItem[];
  defaultList: {
    name: string;
    exercises: KeymapExerciseItem[];
  };
  projectKeymapLists: {
    id: string;
    name: string;
    exercises: KeymapExerciseItem[];
    sourceFile: string;
  }[];
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

export default function KeymapListManager({
  keymapLists: initialLists,
  defaultList,
  projectKeymapLists,
}: KeymapListManagerProps) {
  const router = useRouter();
  const [keymapLists, setKeymapLists] = useState(initialLists);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [exercisesText, setExercisesText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setExercisesText("");
    setError("");
    setIsFormVisible(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setExercisesText("");
    setError("");
    setIsFormVisible(true);
  };

  const openEdit = (list: KeymapListItem) => {
    setEditingId(list.id);
    setName(list.name);
    setExercisesText(serializeKeymapExercises(list.exercises));
    setError("");
    setIsFormVisible(true);
  };

  const openFromProjectList = (list: {
    name: string;
    exercises: KeymapExerciseItem[];
  }) => {
    setEditingId(null);
    setName(list.name);
    setExercisesText(serializeKeymapExercises(list.exercises));
    setError("");
    setIsFormVisible(true);
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);

    let exercises: KeymapExerciseItem[];
    try {
      exercises = parseKeymapExercisesText(exercisesText);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Invalid keymap exercise format");
      setSaving(false);
      return;
    }

    const endpoint = editingId ? `/api/keymap-lists/${editingId}` : "/api/keymap-lists";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, exercises }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to save keymap list" }));
        setError(data.error || "Failed to save keymap list");
        return;
      }

      const savedList = await res.json();
      const normalized = {
        id: savedList.id,
        name: savedList.name,
        exercises: savedList.entries,
        exerciseCount: savedList.entries.length,
        createdAt: savedList.createdAt,
      };

      setKeymapLists((current) => {
        if (!editingId) {
          return [normalized, ...current];
        }
        return current.map((list) => (list.id === editingId ? normalized : list));
      });

      resetForm();
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/keymap-lists/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeymapLists((current) => current.filter((list) => list.id !== id));
        if (editingId === id) {
          resetForm();
        }
        router.refresh();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Keymap Lists</h3>
          <p className="text-sm text-zinc-500">Manage custom keymap drills with prompts and accepted commands.</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => (isFormVisible ? resetForm() : openCreate())}
        >
          {isFormVisible ? "Cancel" : "New list"}
        </Button>
      </div>

      <details className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{defaultList.name}</p>
            <p className="text-xs text-zinc-500">
              Built-in list · {defaultList.exercises.length}{" "}
              {pluralize(defaultList.exercises.length, "exercise", "exercises")} · read-only
            </p>
          </div>
          <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">View drills</span>
        </summary>
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <textarea
            readOnly
            value={serializeKeymapExercises(defaultList.exercises)}
            rows={8}
            spellCheck={false}
            aria-label={`${defaultList.name} exercises`}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-300 focus:outline-none"
          />
        </div>
      </details>

      {projectKeymapLists.length > 0 && (
        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/20 p-3">
          <div>
            <p className="text-sm font-medium text-zinc-100">Project .txt keymap lists</p>
            <p className="text-xs text-zinc-500">
              Drop <code>prompt =&gt; command1, command2</code> files into <code>keymap-lists/</code>, then load them into the editor and save as custom lists.
            </p>
          </div>
          {projectKeymapLists.map((list) => (
            <div
              key={list.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
            >
              <div>
                <p className="text-sm font-medium">{list.name}</p>
                <p className="text-xs text-zinc-500">
                  {list.exercises.length} {pluralize(list.exercises.length, "exercise", "exercises")} · {list.sourceFile}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => openFromProjectList(list)}>
                Load into editor
              </Button>
            </div>
          ))}
        </div>
      )}

      {isFormVisible && (
        <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <Input
            label="List name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Vim Motions"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Exercises (one per line: `prompt {"=>"} command1, command2`)
            </label>
            <textarea
              value={exercisesText}
              onChange={(e) => setExercisesText(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder={"change inside word => ciw\nopen command palette => Ctrl+Shift+p\nsplit editor => Super+Alt+d"}
            />
            <p className="mt-2 text-xs text-zinc-500">
              Modifiers supported: `Ctrl`, `Alt`, `Shift`, `Super`. Examples: `Ctrl+k`, `Alt+Shift+p`, `Super+Enter`.
            </p>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? "Saving..." : editingId ? "Update list" : "Create list"}
            </Button>
            {editingId && (
              <span className="text-sm text-zinc-500">Editing existing list</span>
            )}
          </div>
        </div>
      )}

      {keymapLists.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No custom keymap lists yet. Create one to drill your own prompt and command sets.
        </p>
      ) : (
        <div className="space-y-2">
          {keymapLists.map((list) => (
            <div
              key={list.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-3"
            >
              <div>
                <p className="text-sm font-medium">{list.name}</p>
                <p className="text-xs text-zinc-500">{list.exerciseCount} exercises</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEdit(list)}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(list.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
