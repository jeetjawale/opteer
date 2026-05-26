"use client";

import React from "react";
import { Loader2, Sparkles } from "lucide-react";

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
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const score = application.fit_score !== null ? application.fit_score : 0;
  const dashOffset = circumference - (score / 100) * circumference;

  let scoreColor = "stroke-red-500";
  let textColor = "text-red-500";
  let labelText = "Low Fit";
  if (application.fit_score !== null) {
    if (score >= 80) {
      scoreColor = "stroke-green-500";
      textColor = "text-green-500";
      labelText = "Excellent Fit";
    } else if (score >= 50) {
      scoreColor = "stroke-amber-500";
      textColor = "text-amber-500";
      labelText = "Good Fit";
    }
  }

  return (
    <div className="space-y-6">
      {application.fit_score !== null ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column: Donut Circle fit score */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4">Fit Score</p>
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                {/* Background Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className="stroke-zinc-800"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                {/* Score Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className={`${scoreColor} transition-all duration-500`}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-white font-extrabold text-3xl">{application.fit_score}%</span>
              </div>
            </div>
            <h4 className={`text-base font-bold mt-4 ${textColor}`}>{labelText}</h4>
          </div>

          {/* Middle Column: Skills analysis */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:col-span-2 space-y-4">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Skill Matching Analysis</p>
            
            {/* Matched Skills */}
            <div>
              <p className="text-zinc-500 text-xs font-semibold mb-2">Matched Skills</p>
              <div className="flex flex-wrap gap-2">
                {application.matched_skills && application.matched_skills.length > 0 ? (
                  application.matched_skills.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full text-xs font-medium bg-green-950 text-green-300 border border-green-800/40">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-zinc-600 text-xs italic">No matching skills detected.</span>
                )}
              </div>
            </div>

            {/* Missing Skills */}
            <div>
              <p className="text-zinc-500 text-xs font-semibold mb-2">Missing Skills</p>
              <div className="flex flex-wrap gap-2">
                {application.missing_skills && application.missing_skills.length > 0 ? (
                  application.missing_skills.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full text-xs font-medium bg-red-950 text-red-300 border border-red-800/40">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-green-500 text-xs font-medium">None! Perfect skill alignment.</span>
                )}
              </div>
            </div>
          </div>

          {/* Assessment Summary row */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:col-span-3">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">AI Assessment Summary</p>
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
              {application.summary}
            </p>
          </div>

        </div>
      ) : (
        /* Analysis CTA Banner */
        <div className="p-8 text-center bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center">
          <Sparkles className="w-8 h-8 text-blue-400 mb-3 animate-pulse" />
          <h3 className="text-white font-bold text-base mb-1">AI Analysis not run yet</h3>
          <p className="text-zinc-500 text-xs max-w-sm mb-5">
            Evaluate your resume against the job description to calculate your fit score and generate your prep material.
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

      {/* Status & Notes configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Status Dropdown Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3" htmlFor="app-status">
            Pipeline Status
          </label>
          <div className="relative">
            <select
              id="app-status"
              value={application.status}
              disabled={updatingStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-zinc-700 transition-colors text-sm appearance-none cursor-pointer disabled:opacity-50"
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
                <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Notes Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:col-span-2 space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider" htmlFor="app-notes">
              My Application Notes
            </label>
            {notes !== (application.notes || "") && (
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 disabled:text-zinc-600 transition-colors flex items-center space-x-1"
              >
                {savingNotes && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Save Notes</span>
              </button>
            )}
          </div>
          <textarea
            id="app-notes"
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition-colors text-sm resize-none"
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
