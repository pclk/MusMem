import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import prisma from "@/lib/db";
import Link from "next/link";
import Card from "@/components/ui/Card";
import SettingsForm from "./components/SettingsForm";
import WordListManager from "./components/WordListManager";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }

  const [settings, wordLists] = await Promise.all([
    prisma.userSettings.findUnique({
      where: { userId: session.userId },
      include: { activeList: { select: { id: true, name: true } } },
    }),
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
  ]);

  const wordListsForForm = wordLists.map((l) => ({ id: l.id, name: l.name }));
  const wordListsForManager = wordLists.map((l) => ({
    id: l.id,
    name: l.name,
    wordCount: l.words.length,
    createdAt: l.createdAt.toISOString(),
  }));

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
            activeListId={settings?.activeListId ?? null}
            initialTargetedPracticeRatio={settings?.targetedPracticeRatio ?? 60}
            initialMode={settings?.mode ?? "TEXT"}
            wordLists={wordListsForForm}
          />
        </Card>

        <Card>
          <WordListManager wordLists={wordListsForManager} />
        </Card>

        <Card>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
              onClick={async (e) => {
                e.preventDefault();
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/";
              }}
            >
              Log out
            </button>
          </form>
        </Card>
      </main>
    </div>
  );
}
