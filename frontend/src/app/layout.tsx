"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  return (
    <html lang="en">
      <head>
        <title>JobPilot — AI-powered job application helper</title>
        <meta name="description" content="AI scores your fit, writes your cover letter, preps your interview." />
      </head>
      <body className="bg-zinc-950 text-white min-h-screen antialiased">
        <div className="flex min-h-screen">
          {!isAuthPage && <Sidebar />}
          <main className="flex-1 min-h-screen bg-zinc-950">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
