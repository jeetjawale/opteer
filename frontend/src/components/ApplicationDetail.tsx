"use client";

import React, { useState } from "react";
import { Clipboard, Check, Loader2, Sparkles, AlertCircle, MessageSquareQuote, Mail, GraduationCap } from "lucide-react";
import { updateApplication, analyzeApplication } from "@/lib/api";

interface Application {
  id: string;
  status: string;
  applied_at: string | null;
  fit_score: number | null;
  matched_skills: string[] | null;
  missing_skills: string[] | null;
  key_requirements: string[] | null;
  summary: string | null;
  cover_letter: string | null;
  interview_prep: { questions: Array<{ question: string; suggested_answer: string }> } | any;
  notes: string | null;
  company?: string | null;
  role?: string | null;
  url?: string | null;
}

interface ApplicationDetailProps {
  application: Application;
  onRefresh: () => void;
  defaultTab?: string;
}

export default function ApplicationDetail({ application, onRefresh, defaultTab = "overview" }: ApplicationDetailProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [copied, setCopied] = useState(false);
  
  // Status and Notes update states
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [notes, setNotes] = useState(application.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  
  // Accordion active index for Interview Prep
  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState<number | null>(null);

  // Analysis state triggers
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Status Change Handler
  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await updateApplication(application.id, { status: newStatus });
      onRefresh();
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Notes Save Handler
  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateApplication(application.id, { notes });
      onRefresh();
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setSavingNotes(false);
    }
  };

  // Clipboard Copier for Cover Letter
  const handleCopyToClipboard = () => {
    if (!application.cover_letter) return;
    navigator.clipboard.writeText(application.cover_letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Triggers AI Analysis inline if not yet run
  const handleTriggerAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      await analyzeApplication(application.id);
      onRefresh();
    } catch (err: any) {
      setAnalysisError(err.message || "AI Analysis execution failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  // ----------------------------------------------------
  // SVG DONUT FIT SCORE CALCULATIONS
  // ----------------------------------------------------
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

  // Parse Interview Prep questions safely
  let questionsList = [];
  if (application.interview_prep) {
    const rawPrep = application.interview_prep;
    questionsList = rawPrep.questions || [];
  }

  return (
    <div className="space-y-6">
      
      {/* Dynamic Tab Switcher */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-3 font-semibold text-sm transition-all -mb-px border-b-2 ${
            activeTab === "overview"
              ? "text-white border-white"
              : "text-zinc-500 border-transparent hover:text-zinc-300"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("cover-letter")}
          className={`px-5 py-3 font-semibold text-sm transition-all -mb-px border-b-2 ${
            activeTab === "cover-letter"
              ? "text-white border-white"
              : "text-zinc-500 border-transparent hover:text-zinc-300"
          }`}
        >
          Cover Letter
        </button>
        <button
          onClick={() => setActiveTab("interview-prep")}
          className={`px-5 py-3 font-semibold text-sm transition-all -mb-px border-b-2 ${
            activeTab === "interview-prep"
              ? "text-white border-white"
              : "text-zinc-500 border-transparent hover:text-zinc-300"
          }`}
        >
          Interview Prep
        </button>
      </div>

      {/* Inline analysis error banner */}
      {analysisError && (
        <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-sm flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{analysisError}</span>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 1: OVERVIEW
          ---------------------------------------------------- */}
      {activeTab === "overview" && (
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
      )}

      {/* ----------------------------------------------------
          TAB 2: COVER LETTER
          ---------------------------------------------------- */}
      {activeTab === "cover-letter" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {application.cover_letter ? (
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
                {application.cover_letter}
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
      )}

      {/* ----------------------------------------------------
          TAB 3: INTERVIEW PREP
          ---------------------------------------------------- */}
      {activeTab === "interview-prep" && (
        <div className="space-y-4">
          {questionsList.length > 0 ? (
            <div className="space-y-3">
              <div className="px-1 text-zinc-500 text-xs font-semibold mb-2">
                Tailored Prep Questions (8 total)
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
      )}

    </div>
  );
}
