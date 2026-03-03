import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Link from "next/link";

export default async function HomePage() {
  const session = await getSession();
  if (session.userId) {
    redirect("/type");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">
          Mus<span className="text-emerald-400">Mem</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-md mx-auto">
          An adaptive typing trainer that targets your weakest character
          combinations for efficient practice.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-800 px-6 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-700 transition-colors border border-zinc-700"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            Get started
          </Link>
        </div>
        <div className="flex justify-center">
          <Link
            href="/guest"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
          >
            Continue as guest
          </Link>
        </div>
      </div>
    </div>
  );
}
