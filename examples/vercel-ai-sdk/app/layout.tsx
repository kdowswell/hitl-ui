import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "hitl-ui · live agent demo",
  description:
    "A real LLM agent (Vercel AI SDK v6) calls the assess and decide tools; hitl-ui components render the user's response.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
