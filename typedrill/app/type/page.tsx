import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import TypingEngine from "./components/TypingEngine";
import Link from "next/link";

export default async function TypePage() {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold">
          Type<span className="text-emerald-400">Drill</span>
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
        <TypingEngine />
      </main>
    </div>
  );
}
