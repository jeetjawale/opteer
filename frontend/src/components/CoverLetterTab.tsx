"use client";

import React, { useState } from "react";
import { Clipboard, Check, Loader2, Mail, MessageSquareQuote } from "lucide-react";

interface CoverLetterTabProps {
  coverLetter: string | null;
  analyzing: boolean;
  handleTriggerAnalysis: () => Promise<void>;
}

export default function CoverLetterTab({
  coverLetter,
  analyzing,
  handleTriggerAnalysis
}: CoverLetterTabProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyToClipboard = () => {
    if (!coverLetter) return;
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {coverLetter ? (
        <div>
          {/* Toolbar */}
          <div className="p-4 border-b border-zinc-850 flex justify-between items-center bg-zinc-900/60">
            <div className="flex items-center space-x-2 text-zinc-400 text-xs">
              <MessageSquareQuote className="w-4 h-4" />
              <span>3-Paragraph Personalized Cover Letter</span>
            </div>
            <button
              onClick={handleCopyToClipboard}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-850 text-zinc-300 hover:text-white font-semibold text-xs transition-all flex items-center space-x-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Copy to Clipboard</span>
                </>
              )}
            </button>
          </div>
          
          {/* Content Body */}
          <div className="p-8 text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap max-w-3xl mx-auto font-sans">
            {coverLetter.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')}
          </div>
        </div>
      ) : (
        /* Prompt analysis CTA */
        <div className="p-12 text-center flex flex-col items-center">
          <Mail className="w-10 h-10 text-zinc-600 mb-3" />
          <h3 className="text-white font-bold text-base mb-1">No Cover Letter Generated</h3>
          <p className="text-zinc-500 text-xs max-w-sm mb-5">
            Analyze this application to generate a customized cover letter mapped to the job description and research.
          </p>
          <button
            onClick={handleTriggerAnalysis}
            disabled={analyzing}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm transition-colors flex items-center space-x-2 disabled:bg-zinc-800 disabled:text-zinc-600"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <span>Run Analysis Now</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
