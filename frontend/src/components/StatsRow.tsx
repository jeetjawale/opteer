"use client";

import React from "react";

interface Application {
  id: string;
  status: string;
  fit_score: number | null;
  created_at: string;
}

interface StatsRowProps {
  applications: Application[];
}

export default function StatsRow({ applications }: StatsRowProps) {
  const total = applications.length;

  // 1. Calculate applications added in the last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const addedThisWeek = applications.filter((app) => {
    const createdAt = new Date(app.created_at);
    return createdAt >= sevenDaysAgo;
  }).length;

  // 2. Average Fit Score (for analyzed applications only)
  const scoredApps = applications.filter((app) => app.fit_score !== null && app.fit_score !== undefined);
  const avgFitScore = scoredApps.length > 0 
    ? Math.round(scoredApps.reduce((acc, app) => acc + (app.fit_score || 0), 0) / scoredApps.length)
    : null;

  // 3. Interview Count & Response Rate (interviews / total)
  const interviews = applications.filter((app) => app.status === "interview").length;
  // Let's compute response rate as interview count divided by non-saved applications
  const activeApplications = applications.filter((app) => app.status !== "saved").length;
  const responseRate = activeApplications > 0
    ? Math.round((interviews / activeApplications) * 100)
    : 0;

  // 4. Offers Count
  const offers = applications.filter((app) => app.status === "offer").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      
      {/* Card 1: Total Applied */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Total Applied</p>
        <h3 className="text-white text-3xl font-bold mb-1">{total}</h3>
        <p className="text-green-400 text-xs font-medium">+{addedThisWeek} this week</p>
      </div>

      {/* Card 2: Avg Fit Score */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Avg Fit Score</p>
        <h3 className="text-white text-3xl font-bold mb-1">
          {avgFitScore !== null ? `${avgFitScore}%` : "—"}
        </h3>
        <p className="text-zinc-500 text-xs">across all jobs</p>
      </div>

      {/* Card 3: Interviews */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Interviews</p>
        <h3 className="text-white text-3xl font-bold mb-1">{interviews}</h3>
        <p className="text-green-400 text-xs font-medium">{responseRate}% response rate</p>
      </div>

      {/* Card 4: Offers */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Offers</p>
        <h3 className="text-white text-3xl font-bold mb-1">{offers}</h3>
        <p className="text-zinc-500 text-xs">pending reply</p>
      </div>

    </div>
  );
}
