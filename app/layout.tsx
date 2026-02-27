import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MusMem — Adaptive Typing Trainer",
  description: "Track your typing weaknesses and practice adaptively",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
