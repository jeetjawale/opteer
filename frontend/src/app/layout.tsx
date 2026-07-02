import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from './providers';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Opteer Dashboard",
  description: "Opteer",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();

  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist:wght@400;600;700;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-on-surface font-body-md antialiased relative min-h-screen">
        <div className="fixed inset-0 mesh-gradient opacity-10 pointer-events-none -z-10"></div>
        <div className="fixed inset-0 grid-overlay opacity-30 pointer-events-none -z-10"></div>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
