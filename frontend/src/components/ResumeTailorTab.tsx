import React from "react";
import { Loader2, Sparkles, PlusCircle, MinusCircle, Edit3 } from "lucide-react";

interface ResumeEdit {
  section: string;
  suggestion: string;
  reasoning: string;
  type: "add" | "remove" | "modify";
}

interface ResumeTailorTabProps {
  resumeEdits?: { edits: ResumeEdit[] } | null;
  analyzing: boolean;
  handleTriggerAnalysis: () => void;
}

export default function ResumeTailorTab({ resumeEdits, analyzing, handleTriggerAnalysis }: ResumeTailorTabProps) {
  if (analyzing) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-400 space-y-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        <p className="text-sm font-medium">AI is analyzing your resume to suggest tailored edits...</p>
      </div>
    );
  }

  if (!resumeEdits || !resumeEdits.edits || resumeEdits.edits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-400 space-y-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
        <Sparkles className="w-8 h-8 text-zinc-600" />
        <p className="text-sm font-medium text-center max-w-md">
          Tailor your resume specifically for this role. Get highly targeted suggestions on what to add, remove, or modify to maximize your fit score.
        </p>
        <button
          onClick={handleTriggerAnalysis}
          className="px-4 py-2 mt-2 rounded-xl bg-white text-zinc-950 font-semibold text-sm hover:bg-zinc-200 transition-colors inline-flex items-center space-x-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate Resume Edits</span>
        </button>
      </div>
    );
  }

  const { edits } = resumeEdits;

  // Group edits by section
  const editsBySection = edits.reduce((acc, edit) => {
    if (!acc[edit.section]) {
      acc[edit.section] = [];
    }
    acc[edit.section].push(edit);
    return acc;
  }, {} as Record<string, ResumeEdit[]>);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "add": return <PlusCircle className="w-5 h-5 text-emerald-400 mt-0.5" />;
      case "remove": return <MinusCircle className="w-5 h-5 text-red-400 mt-0.5" />;
      case "modify": return <Edit3 className="w-5 h-5 text-amber-400 mt-0.5" />;
      default: return <Sparkles className="w-5 h-5 text-blue-400 mt-0.5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "add": return "border-emerald-500/20 bg-emerald-500/5";
      case "remove": return "border-red-500/20 bg-red-500/5";
      case "modify": return "border-amber-500/20 bg-amber-500/5";
      default: return "border-blue-500/20 bg-blue-500/5";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2.5 rounded-xl bg-brand/10 border border-brand/20">
          <Sparkles className="w-5 h-5 text-brand-light" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">AI Resume Tailoring</h3>
          <p className="text-sm text-zinc-400">Actionable edits to pass ATS and impress recruiters</p>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(editsBySection).map(([section, sectionEdits], index) => (
          <div key={index} className="space-y-4">
            <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider pl-1">{section}</h4>
            <div className="grid gap-4">
              {sectionEdits.map((edit, idx) => (
                <div 
                  key={idx} 
                  className={`p-5 rounded-2xl border ${getTypeColor(edit.type)} flex items-start space-x-4`}
                >
                  <div className="flex-shrink-0">
                    {getTypeIcon(edit.type)}
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <p className="text-zinc-200 font-medium text-sm">
                      {edit.suggestion}
                    </p>
                    <p className="text-zinc-500 text-xs leading-relaxed">
                      {edit.reasoning}
                    </p>
                  </div>
                  <div className="hidden sm:block flex-shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-900/50 px-2 py-1 rounded-md border border-zinc-800">
                      {edit.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
