"use client";

import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center mb-8 shadow-2xl">
        <FileQuestion className="w-12 h-12 text-zinc-500" />
      </div>
      <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight">404 - Not Found</h1>
      <p className="text-zinc-400 max-w-md mb-10 text-lg">
        The page you are looking for doesn't exist or has been moved.
      </p>
      
      <Link
        href="/applications"
        className="flex items-center space-x-2 bg-accent hover:bg-accent-hover text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-accent/20 hover:shadow-accent/40 transform hover:-translate-y-1"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
