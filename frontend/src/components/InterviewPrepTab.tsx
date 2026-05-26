"use client";

import React, { useState } from "react";
import { Loader2, GraduationCap } from "lucide-react";

interface InterviewPrepTabProps {
  interviewPrep: { questions?: Array<{ question: string; suggested_answer: string }> } | any;
  analyzing: boolean;
  handleTriggerAnalysis: () => Promise<void>;
}

export default function InterviewPrepTab({
  interviewPrep,
  analyzing,
  handleTriggerAnalysis
}: InterviewPrepTabProps) {
  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState<number | null>(null);

  let questionsList = [];
  if (interviewPrep) {
    questionsList = interviewPrep.questions || [];
  }

  return (
    <div className="space-y-4">
      {questionsList.length > 0 ? (
        <div className="space-y-3">
          <div className="px-1 text-zinc-500 text-xs font-semibold mb-2">
            Tailored Prep Questions ({questionsList.length} total)
          </div>
          {questionsList.map((item: any, idx: number) => {
            const isExpanded = expandedQuestionIdx === idx;
            return (
              <div 
                key={idx} 
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden transition-all duration-200"
              >
                {/* Header trigger */}
                <button
                  onClick={() => setExpandedQuestionIdx(isExpanded ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-start justify-between gap-4 hover:bg-zinc-800/25 transition-colors focus:outline-none"
                >
                  <div className="flex space-x-3 items-start">
                    <span className="text-zinc-600 font-bold text-sm leading-tight pt-0.5">{idx + 1}.</span>
                    <span className="text-white font-semibold text-sm leading-tight">{item.question}</span>
                  </div>
                  <span className="text-zinc-500 text-xs font-bold pt-0.5 uppercase tracking-wide">
                    {isExpanded ? "Hide" : "Show"}
                  </span>
                </button>

                {/* Expandable answer */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-zinc-850/50 bg-zinc-950/20">
                    <div className="pl-6 space-y-2">
                      <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Suggested Answer Strategy</p>
                      <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
                        {item.suggested_answer}
                      </p>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      ) : (
        /* Prompt analysis CTA */
        <div className="p-12 text-center bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center">
          <GraduationCap className="w-10 h-10 text-zinc-600 mb-3" />
          <h3 className="text-white font-bold text-base mb-1">No Prep Questions Available</h3>
          <p className="text-zinc-500 text-xs max-w-sm mb-5">
            Analyze this application to generate exactly 8 tailored interview questions and responses based on your resume.
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
