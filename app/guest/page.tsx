import Link from "next/link";
import TypingEngine from "@/app/type/components/TypingEngine";

export default function GuestPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold">
          Mus<span className="text-emerald-400">Mem</span>
        </h1>
        <div className="flex gap-4 text-sm text-zinc-400">
          <span className="text-emerald-400">Guest mode</span>
          <Link href="/" className="hover:text-zinc-200 transition-colors">
            Home
          </Link>
          <Link href="/login" className="hover:text-zinc-200 transition-colors">
            Log in
          </Link>
        </div>
      </nav>
      <main className="flex-1 flex items-center justify-center p-6">
        <TypingEngine
          initialCharsPerPage={200}
          initialTargetedPracticeRatio={60}
          initialMode="TEXT"
          activeListId={null}
          wordLists={[]}
          isGuest
        />
      </main>
    </div>
  );
}
