import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import TypingEngine from "./components/TypingEngine";
import Link from "next/link";
import prisma from "@/lib/db";
import { listKeymapLists } from "@/lib/keymap-lists";
import { listProjectKeymapLists } from "@/lib/keymaps/project-lists";
import { getUserSettings } from "@/lib/user-settings";
import { listProjectWordLists } from "@/lib/wordlists/project-lists";

export default async function TypePage() {
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
      },
    }),
    listKeymapLists(session.userId),
    listProjectWordLists(),
    listProjectKeymapLists(),
  ]);

  const availableWordLists = [
    ...projectWordLists.map((list) => ({ id: list.id, name: `${list.name} (.txt)` })),
    ...wordLists,
  ];
  const availableKeymapLists = [
    ...projectKeymapLists.map((list) => ({ id: list.id, name: `${list.name} (.txt)` })),
    ...keymapLists.map((list) => ({ id: list.id, name: list.name })),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold">
          Mus<span className="text-emerald-400">Mem</span>
        </h1>
        <div className="flex gap-4 text-sm text-zinc-400">
          <Link href="/type" className="text-emerald-400">
            Type
          </Link>
          <Link href="/stats" className="hover:text-zinc-200 transition-colors">
            Stats
          </Link>
          <Link href="/settings" className="hover:text-zinc-200 transition-colors">
            Settings
          </Link>
        </div>
      </nav>
      <main className="flex-1 flex items-center justify-center p-6">
        <TypingEngine
          initialCharsPerPage={settings?.charsPerPage ?? 200}
          initialTargetedPracticeRatio={settings?.targetedPracticeRatio ?? 60}
          initialBigramWindowSize={settings?.bigramWindowSize ?? 20}
          initialMode={settings?.mode ?? "TEXT"}
          activeListId={settings?.activeListId ?? null}
          keymapListId={settings?.keymapListId ?? null}
          wordLists={availableWordLists}
          keymapLists={availableKeymapLists}
        />
      </main>
    </div>
  );
}
