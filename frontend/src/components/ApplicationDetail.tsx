"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { updateApplication } from "@/lib/api";
import { analysisTracker } from "@/lib/analysisTracker";
import OverviewTab from "./OverviewTab";
import CoverLetterTab from "./CoverLetterTab";
import InterviewPrepTab from "./InterviewPrepTab";
import RemindersTab from "./RemindersTab";

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
  
  // Status and Notes update states
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [notes, setNotes] = useState(application.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  
  // Analysis state triggers
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Sync initial state and subscribe to changes
  useEffect(() => {
    setAnalyzing(analysisTracker.isAnalyzing(application.id));

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
  }, [application.id, onRefresh]);

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
    setAnalysisError(null);
    try {
      await analysisTracker.performAnalysis(application.id);
    } catch (err: any) {
      // Error is caught here to prevent uncaught promise rejection errors in console.
      // The user-facing error message will be set and displayed via the subscription listener.
    }
  };

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

      {/* Inline analysis error banner */}
      {analysisError && (
        <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-sm flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{analysisError}</span>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
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
      )}

      {/* TAB 2: COVER LETTER */}
      {activeTab === "cover-letter" && (
        <CoverLetterTab
          coverLetter={application.cover_letter}
          analyzing={analyzing}
          handleTriggerAnalysis={handleTriggerAnalysis}
        />
      )}

      {/* TAB 3: INTERVIEW PREP */}
      {activeTab === "interview-prep" && (
        <InterviewPrepTab
          interviewPrep={application.interview_prep}
          analyzing={analyzing}
          handleTriggerAnalysis={handleTriggerAnalysis}
        />
      )}

      {/* TAB 4: REMINDERS */}
      {activeTab === "reminders" && (
        <RemindersTab applicationId={application.id} />
      )}

    </div>
  );
}
