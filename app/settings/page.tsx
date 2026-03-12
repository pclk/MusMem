import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import prisma from "@/lib/db";
import Link from "next/link";
import Card from "@/components/ui/Card";
import SettingsForm from "./components/SettingsForm";
import WordListManager from "./components/WordListManager";
import KeymapListManager from "./components/KeymapListManager";
import { listKeymapLists } from "@/lib/keymap-lists";
import { parseKeymapListEntries } from "@/lib/keymaps/custom-list";
import { vimBasicExercises } from "@/lib/keymaps/vim-basic";
import { listProjectKeymapLists } from "@/lib/keymaps/project-lists";
import { getUserSettings } from "@/lib/user-settings";
import englishWords from "@/lib/words/english-5k.json";
import { listProjectWordLists } from "@/lib/wordlists/project-lists";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }

  const [settings, wordLists, keymapLists, projectWordLists, projectKeymapLists] = await Promise.all([
    getUserSettings(session.userId),
    prisma.wordList.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        words: true,
        createdAt: true,
      },
    }),
    listKeymapLists(session.userId),
    listProjectWordLists(),
    listProjectKeymapLists(),
  ]);

  const wordListsForForm = wordLists.map((l) => ({ id: l.id, name: l.name }));
  const wordListsForManager = wordLists.map((l) => ({
    id: l.id,
    name: l.name,
    words: l.words,
    wordCount: l.words.length,
    createdAt: l.createdAt.toISOString(),
  }));
  const keymapListsForForm = keymapLists.map((l) => ({ id: l.id, name: l.name }));
  const keymapListsForManager = keymapLists.map((list) => {
    const exercises = parseKeymapListEntries(list.entries);
    return {
      id: list.id,
      name: list.name,
      exercises,
      exerciseCount: exercises.length,
      createdAt: list.createdAt.toISOString(),
    };
  });

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold">
          Mus<span className="text-emerald-400">Mem</span>
        </h1>
        <div className="flex gap-4 text-sm text-zinc-400">
          <Link href="/type" className="hover:text-zinc-200 transition-colors">
            Type
          </Link>
          <Link
            href="/stats"
            className="hover:text-zinc-200 transition-colors"
          >
            Stats
          </Link>
          <Link href="/settings" className="text-emerald-400">
            Settings
          </Link>
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-6">
        <h2 className="text-2xl font-bold">Settings</h2>

        <Card>
          <SettingsForm
            initialCharsPerPage={settings?.charsPerPage ?? 200}
            typingListId={settings?.activeListId ?? null}
            keymapListId={settings?.keymapListId ?? null}
            initialTargetedPracticeRatio={settings?.targetedPracticeRatio ?? 60}
            initialBigramWindowSize={settings?.bigramWindowSize ?? 20}
            initialMode={settings?.mode ?? "TEXT"}
            typingWordLists={wordListsForForm}
            keymapLists={keymapListsForForm}
          />
        </Card>

        <Card>
          <WordListManager
            wordLists={wordListsForManager}
            defaultList={{ name: "Default English (5k words)", words: englishWords as string[] }}
            projectWordLists={projectWordLists}
          />
        </Card>

        <Card>
          <KeymapListManager
            keymapLists={keymapListsForManager}
            defaultList={{ name: "Default keymap drills", exercises: vimBasicExercises }}
            projectKeymapLists={projectKeymapLists}
          />
        </Card>

        <Card>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Log out
            </button>
          </form>
        </Card>
      </main>
    </div>
  );
}
