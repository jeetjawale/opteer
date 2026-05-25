"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { analyzeApplication } from "@/lib/api";

interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: string;
  applied_at: string | null;
  fit_score: number | null;
  company?: string | null;
  role?: string | null;
  url?: string | null;
  created_at: string;
}

interface ApplicationsTableProps {
  applications: Application[];
  onRefresh: () => void;
}

export default function ApplicationsTable({ applications, onRefresh }: ApplicationsTableProps) {
  const router = useRouter();
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Determinisic avatar background color based on company name
  const getAvatarBg = (companyName: string) => {
    const bgColors = [
      "bg-blue-600",
      "bg-purple-600",
      "bg-indigo-600",
      "bg-pink-600",
      "bg-emerald-600",
      "bg-amber-600",
      "bg-cyan-600",
      "bg-teal-600",
      "bg-violet-600"
    ];
    let hash = 0;
    for (let i = 0; i < companyName.length; i++) {
      hash += companyName.charCodeAt(i);
    }
    return bgColors[hash % bgColors.length];
  };

  // Safe relative date formatter
  const getRelativeDate = (dateStr: string | null, status: string) => {
    if (status === "saved") return "Just saved";
    if (!dateStr) return "—";
    
    try {
      const date = new Date(dateStr);
      const now = new Date();
      // Reset hours to compare calendar days
      date.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      
      const diffWeeks = Math.floor(diffDays / 7);
      if (diffWeeks === 1) return "1 wk ago";
      return `${diffWeeks} wks ago`;
    } catch {
      return "—";
    }
  };

  // Triggers API call for LangGraph analysis
  const handleAnalyze = async (id: string) => {
    setAnalyzingId(id);
    setError(null);
    try {
      await analyzeApplication(id);
      onRefresh();
    } catch (err: any) {
      setError(`Analysis failed: ${err.message || err}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-2xl">
        <ArrowRight className="w-10 h-10 text-zinc-500 mb-4 animate-pulse" />
        <p className="text-zinc-400 font-medium mb-1">No applications yet</p>
        <p className="text-zinc-600 text-xs">Import your first job to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      {error && (
        <div className="p-4 bg-red-950/40 border-b border-red-800/50 text-red-300 text-sm">
          {error}
        </div>
      )}
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-500 text-xs font-semibold uppercase tracking-wider bg-zinc-900/50">
            <th className="px-6 py-4">Company & Role</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Fit Score</th>
            <th className="px-6 py-4">Applied</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {applications.map((app) => {
            const company = app.company || "Unknown Company";
            const role = app.role || "Job Description";
            const initials = company.substring(0, 2).toUpperCase();
            const avatarBg = getAvatarBg(company);
            
            // Progress Bar Color Mapping
            const score = app.fit_score;
            let barColor = "bg-red-500";
            if (score !== null) {
              if (score >= 80) barColor = "bg-green-500";
              else if (score >= 50) barColor = "bg-amber-500";
            }

            return (
              <tr key={app.id} className="hover:bg-zinc-800/20 transition-colors">
                
                {/* Company / Role */}
                <td className="px-6 py-4">
                  <Link href={`/applications/${app.id}`} className="flex items-center space-x-3 group">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm group-hover:opacity-90 transition-opacity ${avatarBg}`}>
                      {initials}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm leading-tight mb-0.5 group-hover:underline">{company}</p>
                      <p className="text-zinc-400 text-xs leading-none">{role}</p>
                    </div>
                  </Link>
                </td>

                {/* Status Badges */}
                <td className="px-6 py-4">
                  {app.status === "saved" && (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/35 uppercase tracking-wider">
                      saved
                    </span>
                  )}
                  {app.status === "applied" && (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-950 text-blue-300 border border-blue-900/40 uppercase tracking-wider">
                      applied
                    </span>
                  )}
                  {app.status === "interview" && (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-950 text-amber-300 border border-amber-900/40 uppercase tracking-wider">
                      interview
                    </span>
                  )}
                  {app.status === "offer" && (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-950 text-green-300 border border-green-900/40 uppercase tracking-wider">
                      offer
                    </span>
                  )}
                  {app.status === "closed" && (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-950 text-red-300 border border-red-900/40 uppercase tracking-wider">
                      closed
                    </span>
                  )}
                </td>

                {/* Fit Score Progress Bar */}
                <td className="px-6 py-4">
                  {score !== null ? (
                    <div className="flex items-center space-x-3">
                      <div className="w-[120px] bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor}`} style={{ width: `${score}%` }}></div>
                      </div>
                      <span className="text-white text-sm font-semibold">{score}%</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <div className="w-[120px] bg-zinc-800 h-2 rounded-full"></div>
                      <span className="text-zinc-600 text-sm font-semibold">—</span>
                    </div>
                  )}
                </td>

                {/* Applied relative date */}
                <td className="px-6 py-4 text-zinc-400 text-sm">
                  {getRelativeDate(app.applied_at, app.status)}
                </td>

                {/* Context-aware Actions */}
                <td className="px-6 py-4 text-right">
                  {analyzingId === app.id ? (
                    <div className="inline-flex items-center text-xs font-medium text-zinc-400 space-x-1.5 pr-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </div>
                  ) : (
                    <div className="inline-flex space-x-2">
                      
                      {app.status === "saved" && (
                        <>
                          {app.fit_score !== null && (
                            <Link
                              href={`/applications/${app.id}`}
                              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors flex items-center"
                            >
                              View
                            </Link>
                          )}
                          <button
                            onClick={() => handleAnalyze(app.id)}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                              app.fit_score !== null
                                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                                : "border border-blue-500/50 hover:bg-blue-900/20 text-blue-400 hover:text-blue-300"
                            }`}
                          >
                            {app.fit_score !== null ? "Re-analyze" : "Analyze now"}
                          </button>
                        </>
                      )}

                      {(app.status === "applied" || app.status === "interview") && (
                        <>
                          <button
                            onClick={() => handleAnalyze(app.id)}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
                          >
                            Analyze
                          </button>
                          <Link
                            href={`/applications/${app.id}?tab=cover-letter`}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors flex items-center"
                          >
                            Letter
                          </Link>
                        </>
                      )}

                      {app.status === "offer" && (
                        <>
                          <Link
                            href={`/applications/${app.id}?tab=interview-prep`}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors flex items-center"
                          >
                            Prep
                          </Link>
                          <Link
                            href={`/applications/${app.id}`}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors flex items-center"
                          >
                            View
                          </Link>
                        </>
                      )}

                      {app.status === "closed" && (
                        <Link
                          href={`/applications/${app.id}`}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors flex items-center"
                        >
                          View
                        </Link>
                      )}

                    </div>
                  )}
                </td>

              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
