"use client";

import { useEffect } from "react";
import { ServerCrash, RefreshCcw } from "lucide-react";
import "./globals.css"; // Ensure Tailwind loads

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the catastrophic error
    console.error("🔥 [Global Error Boundary Caught Fatal Error]:", error);
    if (error.digest) {
      console.error("Digest:", error.digest);
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-black text-white font-sans antialiased min-h-screen">
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
          <div className="w-24 h-24 bg-red-950/50 border border-red-900 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-red-900/20">
            <ServerCrash className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Critical Application Error</h1>
          <p className="text-zinc-400 max-w-lg mb-10 text-lg">
            JobPilot encountered a fatal error and could not render this page. Our team has been notified.
          </p>
          
          <button
            onClick={() => reset()}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-red-900/50 hover:shadow-red-500/50 transform hover:-translate-y-1"
          >
            <RefreshCcw className="w-5 h-5" />
            <span>Attempt Recovery</span>
          </button>
        </div>
      </body>
    </html>
  );
}
