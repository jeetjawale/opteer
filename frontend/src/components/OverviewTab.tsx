"use client";

import React from "react";
import { Loader2, Sparkles, Globe, Building2, Calendar } from "lucide-react";

// Parses the structured company_research text from the DB into an object.
// Expected format produced by the scraper LLM:
//   Overview: ...
//   Website: ...
//   Headquarters: ...
//   Company Size: ...
//   Industry: ...
//   Work Model: ...
function parseCompanyResearch(raw: string | null | undefined) {
  if (!raw) return null;
  const get = (key: string) => {
    const match = raw.match(new RegExp(`${key}:\\s*(.+)`, "i"));
    return match ? match[1].trim() : null;
  };
  const overview     = get("Overview");
  const website      = get("Website");
  const headquarters = get("Headquarters");
  const companySize  = get("Company Size");
  const industry     = get("Industry");
  const workModel    = get("Work Model");
  // Return null if nothing useful was parsed
  if (!overview && !website && !industry && !headquarters && !companySize && !workModel) return null;
  return {
    overview,
    website:      website      === "N/A" ? null : website,
    headquarters: headquarters === "N/A" ? null : headquarters,
    companySize:  companySize  === "N/A" ? null : companySize,
    industry:     industry     === "N/A" ? null : industry,
    workModel:    workModel    === "N/A" ? null : workModel,
  };
}

interface Application {
  id: string;
  status: string;
  applied_at: string | null;
  fit_score: number | null;
  matched_skills: string[] | null;
  missing_skills: string[] | null;
  key_requirements: string[] | null;
  summary: string | null;
  notes: string | null;
  company?: string | null;
  company_research?: string | null;
}

interface OverviewTabProps {
  application: Application;
  updatingStatus: boolean;
  handleStatusChange: (newStatus: string) => Promise<void>;
  notes: string;
  setNotes: (val: string) => void;
  savingNotes: boolean;
  handleSaveNotes: () => Promise<void>;
  analyzing: boolean;
  handleTriggerAnalysis: () => Promise<void>;
}

export default function OverviewTab({
  application,
  updatingStatus,
  handleStatusChange,
  notes,
  setNotes,
  savingNotes,
  handleSaveNotes,
  analyzing,
  handleTriggerAnalysis
}: OverviewTabProps) {
  // SVG DONUT FIT SCORE CALCULATIONS
  const radius = 80;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const score = application.fit_score !== null ? application.fit_score : 0;
  const targetOffset = circumference - (score / 100) * circumference;
  const [dashOffset, setDashOffset] = React.useState(circumference);
  const [displayScore, setDisplayScore] = React.useState(0);

  React.useEffect(() => {
    const t = setTimeout(() => setDashOffset(targetOffset), 100);
    return () => clearTimeout(t);
  }, [targetOffset]);

  React.useEffect(() => {
    if (score === 0) {
      setDisplayScore(0);
      return;
    }
    
    const duration = 1500;
    const startTime = performance.now();
    const easeOutQuart = (x: number): number => 1 - Math.pow(1 - x, 4);
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayScore(Math.floor(easeOutQuart(progress) * score));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayScore(score);
      }
    };
    
    requestAnimationFrame(animate);
  }, [score]);

  let textColor = "text-score-low";
  let labelText = "Low Fit";
  if (application.fit_score !== null) {
    if (score >= 80) {
      textColor = "text-score-high";
      labelText = "Excellent Fit";
    } else if (score >= 50) {
      textColor = "text-score-mid";
      labelText = "Good Fit";
    }
  }

  return (
    <div className="space-y-6">
      {application.fit_score !== null ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column: Donut Circle fit score */}
          <div className="bg-surface border border-border-default rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <p className="text-secondary text-xs font-semibold uppercase tracking-wider mb-4">Fit Score</p>
            
            <div className="relative flex items-center justify-center">
              <svg width="180" height="180" viewBox="0 0 180 180" className="absolute -rotate-90">
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  className="text-border-subtle"
                />
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  className={score >= 80 ? 'text-score-high' : score >= 50 ? 'text-score-mid' : 'text-score-low'}
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }}
                />
              </svg>
              <div 
                className={`flex items-baseline justify-center w-[140px] h-[140px] rounded-full text-6xl font-black tabular-nums score-reveal ${textColor} ${score >= 80 ? 'shadow-[0_0_0_1px_rgba(34,197,94,0.2),0_0_32px_rgba(34,197,94,0.08)]' : ''}`}
                style={{ paddingTop: '42px' }}
              >
                <span className="font-mono">{displayScore}</span>
                <span className="text-xl text-muted font-normal ml-1">/100</span>
              </div>
            </div>

            <h4 className={`text-base font-bold mt-4 ${textColor}`}>{labelText}</h4>
          </div>

          {/* Middle Column: Skills analysis */}
          <div className="bg-surface border border-border-default rounded-2xl p-6 md:col-span-2 space-y-4">
            <p className="text-secondary text-xs font-semibold uppercase tracking-wider">Skill Matching Analysis</p>
            
            {/* Matched Skills */}
            <div>
              <p className="text-muted text-xs font-semibold mb-2">Matched Skills</p>
              <div className="flex flex-wrap gap-2">
                {application.matched_skills && application.matched_skills.length > 0 ? (
                  application.matched_skills.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full text-xs font-medium bg-green-950/40 text-green-400 border border-green-900/40">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-secondary text-xs italic">No matching skills detected.</span>
                )}
              </div>
            </div>

            {/* Missing Skills */}
            <div>
              <p className="text-muted text-xs font-semibold mb-2">Missing Skills</p>
              <div className="flex flex-wrap gap-2">
                {application.missing_skills && application.missing_skills.length > 0 ? (
                  application.missing_skills.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full text-xs font-medium bg-red-950/40 text-red-400 border border-red-900/40">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-emerald-500 text-xs font-medium">None! Perfect skill alignment.</span>
                )}
              </div>
            </div>
          </div>

          {/* Assessment Summary row */}
          <div className="bg-surface border border-border-default rounded-2xl p-6 md:col-span-3">
            <p className="text-secondary text-xs font-semibold uppercase tracking-wider mb-3">AI Assessment Summary</p>
            <p className="text-primary text-sm leading-relaxed whitespace-pre-line">
              {application.summary || (
                application.fit_score !== undefined && application.fit_score !== null
                  ? (application.fit_score >= 80 
                      ? "Strong fit based on the provided skills and experience." 
                      : application.fit_score >= 50 
                        ? "Moderate fit. Some key skills align, but there are areas missing." 
                        : "Low fit. Significant gaps between the resume and the job requirements.")
                  : "Analysis complete, but no summary was generated."
              )}
            </p>
          </div>

        </div>
      ) : (
        /* Analysis CTA Banner */
        <div className="p-8 text-center bg-surface border border-border-default rounded-2xl flex flex-col items-center">
          <Sparkles className="w-8 h-8 text-blue-400 mb-3 animate-pulse" />
          <h3 className="text-primary font-bold text-base mb-1">AI Analysis not run yet</h3>
          <p className="text-muted text-xs max-w-sm mb-5">
            Evaluate your resume against the job description to calculate your fit score and generate your prep material.
          </p>
          <button
            onClick={handleTriggerAnalysis}
            disabled={analyzing}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-white text-base font-bold text-sm transition-colors flex items-center space-x-2 disabled:bg-elevated disabled:text-muted"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <span className="text-zinc-900">Run Analysis Now</span>
            )}
          </button>
        </div>
      )}

      {/* About Company */}
      {(() => {
        const rawText = application.company_research;
        if (!rawText) return null;
        
        const co = parseCompanyResearch(rawText);
        
        return (
          <div className="bg-surface border border-border-default rounded-2xl p-6 mb-6 ring-1 ring-white/5">
            <p className="text-secondary text-xs font-bold uppercase tracking-wider mb-4">
              About {application.company || "Company"}
            </p>

            {/* If it parsed successfully, show structured metadata */}
            {co ? (
              <>
                {co.overview && (
                  <p className="text-primary text-sm leading-relaxed mb-5">{co.overview}</p>
                )}

                {(co.website || co.headquarters || co.companySize || co.industry || co.workModel) && (
                  <div className="flex flex-wrap gap-3">
                    {co.website && (
                      <a
                        href={co.website.startsWith("http") ? co.website : `https://${co.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-elevated border border-border-default text-primary text-xs font-medium hover:bg-border-default hover:text-white transition-all group"
                      >
                        <Globe className="w-3.5 h-3.5 text-muted group-hover:text-emerald-400 transition-colors" />
                        {co.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                      </a>
                    )}
                    {co.headquarters && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-elevated border border-border-default text-primary text-xs font-medium">
                        🌍 {co.headquarters}
                      </span>
                    )}
                    {co.companySize && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-elevated border border-border-default text-primary text-xs font-medium">
                        👥 {co.companySize}
                      </span>
                    )}
                    {co.industry && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-elevated border border-border-default text-primary text-xs font-medium">
                        💼 {co.industry}
                      </span>
                    )}
                    {co.workModel && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-elevated border border-border-default text-primary text-xs font-medium">
                        🏢 {co.workModel}
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* If parsing failed (e.g. rate limit error message or unformatted text), just show raw text */
              <p className="text-primary text-sm leading-relaxed whitespace-pre-wrap text-rose-300/80">
                {rawText}
              </p>
            )}
          </div>
        );
      })()}

      {/* Status & Notes configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Status Dropdown Card */}
        <div className="bg-surface border border-border-default rounded-2xl p-6">
          <label className="block text-secondary text-xs font-semibold uppercase tracking-wider mb-3" htmlFor="app-status">
            Pipeline Status
          </label>
          <div className="relative">
            <select
              id="app-status"
              value={application.status}
              disabled={updatingStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-elevated border border-border-default text-primary focus:outline-none focus:border-border-strong transition-colors text-sm appearance-none cursor-pointer disabled:opacity-50"
            >
              <option value="saved">Saved</option>
              <option value="applied">Applied</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="closed">Closed</option>
              <option value="rejected">Rejected</option>
            </select>
            {updatingStatus && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 text-secondary animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Notes Card */}
        <div className="bg-surface border border-border-default rounded-2xl p-6 md:col-span-2 space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-secondary text-xs font-semibold uppercase tracking-wider" htmlFor="app-notes">
              My Application Notes
            </label>
            {notes !== (application.notes || "") && (
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="text-xs font-bold text-accent hover:text-accent-dim disabled:text-muted transition-colors flex items-center space-x-1"
              >
                {savingNotes && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Save Notes</span>
              </button>
            )}
          </div>
          <textarea
            id="app-notes"
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-elevated border border-border-default text-primary placeholder-muted focus:outline-none focus:border-border-strong transition-colors text-sm resize-none"
            placeholder="Add interviews schedules, follow-up dates, or recruiter contacts..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if (notes !== (application.notes || "")) {
                handleSaveNotes();
              }
            }}
          />
        </div>

      </div>
    </div>
  );
}
