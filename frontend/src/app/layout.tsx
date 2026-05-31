"use client";

import { usePathname } from "next/navigation";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Sidebar from "@/components/Sidebar";
import CommandPalette from "@/components/CommandPalette";
import { Toaster } from "sonner";
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
      <body className={`${GeistSans.className} ${GeistSans.variable} ${GeistMono.variable} bg-base text-primary min-h-screen antialiased`}>
        <div className="flex min-h-screen">
          {!isAuthPage && <Sidebar />}
          <main className="flex-1 min-h-screen bg-transparent">
            {children}
          </main>
        </div>
        <CommandPalette />
        <Toaster theme="dark" richColors />
      </body>
    </html>
  );
}
