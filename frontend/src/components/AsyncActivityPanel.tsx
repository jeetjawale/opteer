"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Database, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { analysisTracker } from "@/lib/analysisTracker";
import { importTracker } from "@/lib/importTracker";

interface AsyncActivityPanelProps {
  applications: any[];
}

export default function AsyncActivityPanel({ applications }: AsyncActivityPanelProps) {
  const [scrapingCount, setScrapingCount] = useState(0);
  const [localAnalyzingIds, setLocalAnalyzingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Sync local analyzing state to handle real-time transitions before the next poll
    const unsubAnalysis = analysisTracker.subscribe((update) => {
      setLocalAnalyzingIds((prev) => {
        const next = new Set(prev);
        if (update.status === "analyzing") {
          next.add(update.id);
        } else {
          next.delete(update.id);
        }
        return next;
      });
    });

    const unsubImport = importTracker.subscribe((count) => {
      setScrapingCount(count);
    });

    setScrapingCount(importTracker.getCount());

    return () => {
      unsubAnalysis();
      unsubImport();
    };
  }, []);

  // Derive all other states from the existing applications array
  // queued: in DB as queued, but not currently processing locally
  const queuedCount = applications.filter((app) => 
    app.analysis_status === "queued" && !localAnalyzingIds.has(app.id) && !analysisTracker.isAnalyzing(app.id)
  ).length;

  // analyzing: processing in DB or currently analyzing locally
  const analyzingCount = applications.filter((app) => 
    app.analysis_status === "processing" || localAnalyzingIds.has(app.id) || analysisTracker.isAnalyzing(app.id)
  ).length;

  // completed: finished analysis
  const completedCount = applications.filter((app) => 
    app.analysis_status === "completed" || (app.fit_score !== null && app.analysis_status !== "processing" && app.analysis_status !== "queued")
  ).length;

  // failed: analysis failed
  const failedCount = applications.filter((app) => 
    app.analysis_status === "failed"
  ).length;

  const activeTasks = [];

  if (scrapingCount > 0) {
    activeTasks.push({
      id: 'scraping',
      text: `Scraping ${scrapingCount} job${scrapingCount > 1 ? 's' : ''}...`,
      header: 'IMPORTING'
    });
  }
  
  if (analyzingCount > 0) {
    activeTasks.push({
      id: 'analyzing',
      text: `Analyzing ${analyzingCount} application${analyzingCount > 1 ? 's' : ''}...`,
      header: 'AI ANALYSIS'
    });
  } else if (queuedCount > 0) {
    activeTasks.push({
      id: 'queued',
      text: `Queued ${queuedCount} application${queuedCount > 1 ? 's' : ''}...`,
      header: 'AI ANALYSIS'
    });
  }

  if (activeTasks.length === 0) {
    return null;
  }

  const headerText = activeTasks.length > 1 ? "BACKGROUND TASKS" : activeTasks[0].header;

  return (
    <div className="fixed bottom-6 right-6 z-[85] pointer-events-none">
      <div className="bg-surface border border-border-default shadow-xl rounded-xl p-4 w-72 flex flex-col gap-3 pointer-events-auto">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-white uppercase tracking-wider">{headerText}</span>
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        </div>
        <div className="flex flex-col gap-2 text-sm text-zinc-400">
          {activeTasks.map(task => (
            <div key={task.id} className="flex items-center gap-2">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-accent shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-primary truncate">{task.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
