"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("🚨 [Route Error Boundary Caught Error]:", error);
    if (error.digest) {
      console.error("Digest:", error.digest);
    }
  }, [error]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-20 h-20 bg-red-950/30 border border-red-900/50 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
        <AlertTriangle className="w-10 h-10 text-red-500" />
      </div>
      <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">Something went wrong!</h2>
      <p className="text-zinc-400 max-w-md mb-8">
        We encountered an unexpected error while trying to load this section.
      </p>
      
      <button
        onClick={() => reset()}
        className="flex items-center space-x-2 bg-zinc-100 hover:bg-white text-zinc-900 px-6 py-3 rounded-lg font-bold transition-colors shadow-lg"
      >
        <RefreshCcw className="w-4 h-4" />
        <span>Try Again</span>
      </button>

      {process.env.NODE_ENV === "development" && (
        <div className="mt-12 text-left bg-zinc-950 border border-red-900/30 p-4 rounded-xl max-w-2xl w-full overflow-auto">
          <p className="text-red-400 font-mono text-sm mb-2 font-bold">Development Details:</p>
          <pre className="text-zinc-500 text-xs whitespace-pre-wrap">{error.message}</pre>
          <pre className="text-zinc-600 text-xs mt-2 whitespace-pre-wrap">{error.stack}</pre>
        </div>
      )}
    </div>
  );
}
