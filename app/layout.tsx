import type { Metadata } from "next";
import "./globals.css";
import { isSessionSecretFromEnvExample } from "@/lib/session";

export const metadata: Metadata = {
  title: "MusMem — Adaptive Typing Trainer",
  description: "Track your typing weaknesses and practice adaptively",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usingEnvExampleSecret = isSessionSecretFromEnvExample();

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {usingEnvExampleSecret ? (
          <div className="w-full bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-sm text-amber-200">
            Warning: SESSION_SECRET is missing in environment and was loaded from .env.example.
          </div>
        ) : null}
        {children}
      </body>
    </html>
  );
}
