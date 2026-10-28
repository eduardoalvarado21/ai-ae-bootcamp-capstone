import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PR Dashboard — Reviewer & Pipeline Fixer",
  description: "Agentic AI capstone: auto-fix PR nits and failing pipelines with Claude.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
