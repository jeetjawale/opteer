"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Clock3, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { updateApplication } from "@/lib/api";
import { analysisTracker } from "@/lib/analysisTracker";
import OverviewTab from "./OverviewTab";
import CoverLetterTab from "./CoverLetterTab";
import InterviewPrepTab from "./InterviewPrepTab";
import RemindersTab from "./RemindersTab";
import JobDescriptionTab from "./JobDescriptionTab";

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
  analysis_status?: "idle" | "queued" | "processing" | "completed" | "failed";
  analysis_started_at?: string | null;
  analyzed_at?: string | null;
  analysis_error?: string | null;
  company?: string | null;
  role?: string | null;
  url?: string | null;
  company_research?: string | null;
  scraped_jd?: string | null;
}

interface ApplicationDetailProps {
  application: Application;
  onRefresh: () => void;
  defaultTab?: string;
}

type AnalysisStatus = NonNullable<Application["analysis_status"]>;

const isAnalysisActive = (status?: AnalysisStatus) => status === "queued" || status === "processing";

export default function ApplicationDetail({ application, onRefresh, defaultTab = "overview" }: ApplicationDetailProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Status and Notes update states
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [notes, setNotes] = useState(application.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  
  // Analysis state triggers
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Sync initial state and subscribe to changes
  useEffect(() => {
    setAnalyzing(isAnalysisActive(application.analysis_status) || analysisTracker.isAnalyzing(application.id));
    setAnalysisError(application.analysis_status === "failed" ? (application.analysis_error || "Analysis failed.") : null);

    const unsubscribe = analysisTracker.subscribe((update) => {
      if (update.id === application.id) {
        if (update.status === "analyzing") {
          setAnalyzing(true);
          setAnalysisError(null);
        } else if (update.status === "completed") {
          setAnalyzing(false);
          setAnalysisError(null);
          onRefresh();
        } else if (update.status === "failed") {
          setAnalyzing(false);
          setAnalysisError(update.error || "Analysis failed.");
        }
      }
    });

    return unsubscribe;
  }, [application.id, application.analysis_status, application.analysis_error, onRefresh]);

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

  // Triggers AI Analysis inline if not yet run
  const handleTriggerAnalysis = async () => {
    if (isAnalysisActive(application.analysis_status) || analysisTracker.isAnalyzing(application.id)) {
      return;
    }

    setAnalysisError(null);
    try {
      await analysisTracker.performAnalysis(application.id);
    } catch (err: any) {
      // Error is caught here to prevent uncaught promise rejection errors in console.
      // The user-facing error message will be set and displayed via the subscription listener.
    }
  };

  const analysisStatus: AnalysisStatus = analyzing ? "processing" : (application.analysis_status || "idle");
  const activeAnalysis = isAnalysisActive(analysisStatus);
  const statusStyles = analysisStatus === "failed"
    ? "border-red-800/50 bg-red-950/30 text-red-300"
    : activeAnalysis
      ? "border-blue-800/50 bg-blue-950/25 text-blue-300"
      : analysisStatus === "completed" || application.fit_score !== null
        ? "border-emerald-800/45 bg-emerald-950/25 text-emerald-300"
        : "border-zinc-800 bg-zinc-900/60 text-zinc-300";
  const StatusIcon = analysisStatus === "failed"
    ? AlertCircle
    : activeAnalysis
      ? Loader2
      : analysisStatus === "completed" || application.fit_score !== null
        ? CheckCircle2
        : Clock3;
  const statusLabel = analysisStatus === "failed"
    ? "Analysis failed"
    : analysisStatus === "queued"
      ? "Analysis queued"
      : analysisStatus === "processing"
        ? "Analysis processing"
        : analysisStatus === "completed" || application.fit_score !== null
          ? "Analysis completed"
          : "Analyze later";
  const actionLabel = analysisStatus === "failed"
    ? "Retry analysis"
    : application.fit_score !== null
      ? "Re-run analysis"
      : "Analyze now";
  const showPanelAction = !activeAnalysis && activeTab !== "overview";

  return (
    <div className="space-y-6">
      
      {/* Dynamic Tab Switcher */}
      <div className="flex border-b border-zinc-800 reveal reveal-2">
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
          onClick={() => setActiveTab("job-description")}
          className={`px-5 py-3 font-semibold text-sm transition-all -mb-px border-b-2 ${
            activeTab === "job-description"
              ? "text-white border-white"
              : "text-zinc-500 border-transparent hover:text-zinc-300"
          }`}
        >
          Job Description
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
        <button
          onClick={() => setActiveTab("reminders")}
          className={`px-5 py-3 font-semibold text-sm transition-all -mb-px border-b-2 ${
            activeTab === "reminders"
              ? "text-white border-white"
              : "text-zinc-500 border-transparent hover:text-zinc-300"
          }`}
        >
          Reminders
        </button>
      </div>

      {/* Durable analysis state */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${statusStyles}`}>
        <div className="flex items-start gap-3 min-w-0">
          <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${activeAnalysis ? "animate-spin" : ""}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{statusLabel}</p>
            {analysisError ? (
              <p className="text-xs mt-1 text-red-200/80 truncate">{analysisError}</p>
            ) : (
              <p className="text-xs mt-1 text-zinc-400">
                {activeAnalysis
                  ? (application.analysis_started_at ? `Started ${new Date(application.analysis_started_at).toLocaleString()}` : "Analysis is in progress.")
                  : application.fit_score !== null
                    ? (application.analyzed_at ? `Completed ${new Date(application.analyzed_at).toLocaleString()}` : "Analysis results are available.")
                    : "No analysis results yet."}
              </p>
            )}
          </div>
        </div>
        {showPanelAction && (
          <button
            onClick={handleTriggerAnalysis}
            className="px-3 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-colors inline-flex items-center justify-center gap-1.5"
          >
            {analysisStatus === "failed" ? (
              <RotateCcw className="w-3.5 h-3.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{actionLabel}</span>
          </button>
        )}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="reveal reveal-3">
          <OverviewTab
            application={application}
            updatingStatus={updatingStatus}
            handleStatusChange={handleStatusChange}
            notes={notes}
            setNotes={setNotes}
            savingNotes={savingNotes}
            handleSaveNotes={handleSaveNotes}
            analyzing={analyzing}
            handleTriggerAnalysis={handleTriggerAnalysis}
          />
        </div>
      )}

      {/* TAB 2: JOB DESCRIPTION */}
      {activeTab === "job-description" && (
        <div className="reveal reveal-3">
          <JobDescriptionTab scrapedJd={application.scraped_jd || null} />
        </div>
      )}

      {/* TAB 3: COVER LETTER */}
      {activeTab === "cover-letter" && (
        <div className="reveal reveal-3">
          <CoverLetterTab
            coverLetter={application.cover_letter}
            analyzing={analyzing}
            handleTriggerAnalysis={handleTriggerAnalysis}
          />
        </div>
      )}

      {/* TAB 3: INTERVIEW PREP */}
      {activeTab === "interview-prep" && (
        <div className="reveal reveal-3">
          <InterviewPrepTab
            interviewPrep={application.interview_prep}
            analyzing={analyzing}
            handleTriggerAnalysis={handleTriggerAnalysis}
          />
        </div>
      )}

      {/* TAB 4: REMINDERS */}
      {activeTab === "reminders" && (
        <div className="reveal reveal-3">
          <RemindersTab applicationId={application.id} />
        </div>
      )}

    </div>
  );
}
