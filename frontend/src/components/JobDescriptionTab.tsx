"use client";

import React from "react";
import { FileText } from "lucide-react";

import ReactMarkdown from "react-markdown";

interface JobDescriptionTabProps {
  scrapedJd: string | null;
}

export default function JobDescriptionTab({ scrapedJd }: JobDescriptionTabProps) {
  if (!scrapedJd) {
    return (
      <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center">
        <FileText className="w-8 h-8 text-zinc-600 mb-3" />
        <h3 className="text-white font-bold text-base mb-1">No Job Description Found</h3>
        <p className="text-zinc-500 text-sm max-w-sm">
          We couldn't scrape or find a job description for this application.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6">
      <div className="flex items-center space-x-2 border-b border-zinc-800/40 pb-4">
        <FileText className="w-5 h-5 text-emerald-400" />
        <h2 className="text-white font-bold text-lg">Raw Job Description</h2>
      </div>
      
      <div className="prose prose-invert prose-sm max-w-none text-zinc-300 prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800/60 prose-a:text-emerald-400">
        <ReactMarkdown>{scrapedJd}</ReactMarkdown>
      </div>
    </div>
  );
}
