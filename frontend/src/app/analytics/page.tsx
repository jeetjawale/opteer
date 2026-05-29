"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getApplications } from "@/lib/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Cell, PieChart, Pie
} from "recharts";
import { BarChart3, TrendingUp, Target, RefreshCw, Briefcase, ChevronDown, CheckCircle2, Inbox } from "lucide-react";
import Link from "next/link";

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

export default function AnalyticsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<number | "all">(30);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getApplications();
        setApplications(data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filter applications by Time Window
  const filteredApps = useMemo(() => {
    if (timeWindow === "all") return applications;
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timeWindow);
    
    return applications.filter(app => {
      const date = new Date(app.created_at);
      return date >= cutoff;
    });
  }, [applications, timeWindow]);

  // Funnel Data (Strict definitions)
  const funnelData = useMemo(() => {
    const counts = { saved: 0, applied: 0, interview: 0, offer: 0, rejected: 0 };
    filteredApps.forEach(app => {
      if (counts[app.status as keyof typeof counts] !== undefined) {
        counts[app.status as keyof typeof counts]++;
      }
    });

    return [
      { name: "Saved", value: counts.saved, color: "#71717a" },
      { name: "Applied", value: counts.applied, color: "#3b82f6" },
      { name: "Interviewing", value: counts.interview, color: "#f59e0b" },
      { name: "Offer", value: counts.offer, color: "#22c55e" },
      { name: "Rejected", value: counts.rejected, color: "#ef4444" }
    ];
  }, [filteredApps]);

  // Compute KPIs
  const { responseRate, interviewConversion, totalActive } = useMemo(() => {
    const counts = { saved: 0, applied: 0, interview: 0, offer: 0, rejected: 0 };
    filteredApps.forEach(app => {
      if (counts[app.status as keyof typeof counts] !== undefined) {
        counts[app.status as keyof typeof counts]++;
      }
    });

    // Active applications (exclude saved/not applied yet)
    const active = counts.applied + counts.interview + counts.offer + counts.rejected;
    
    // Response Rate: Interviews + Offers + Rejections / Total Active
    // (Essentially: what % of submitted apps got some sort of non-ghost response? But typically Response = Interviews / Active)
    const responses = counts.interview + counts.offer;
    const respRate = active > 0 ? Math.round((responses / active) * 100) : 0;

    // Interview Conversion: Offers / Interviews
    const totalInterviews = counts.interview + counts.offer; // assuming offers came from interviews
    const convRate = totalInterviews > 0 ? Math.round((counts.offer / totalInterviews) * 100) : 0;

    return { responseRate: respRate, interviewConversion: convRate, totalActive: active };
  }, [filteredApps]);

  // Compute Fit Score Distribution
  const fitScoreData = useMemo(() => {
    const buckets = [
      { range: "0-50", count: 0 },
      { range: "51-70", count: 0 },
      { range: "71-85", count: 0 },
      { range: "86-100", count: 0 },
    ];
    
    filteredApps.forEach(app => {
      const score = app.fit_score;
      if (score === null || score === undefined) return;
      
      if (score <= 50) buckets[0].count++;
      else if (score <= 70) buckets[1].count++;
      else if (score <= 85) buckets[2].count++;
      else buckets[3].count++;
    });
    
    return buckets;
  }, [filteredApps]);

  // Compute Timeline Data
  const timelineData = useMemo(() => {
    const days = timeWindow === "all" ? 90 : timeWindow; // cap at 90 for 'all' to prevent chart crowding
    const data: Record<string, number> = {};
    
    // Initialize days
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split("T")[0];
      data[dateString] = 0;
    }
    
    filteredApps.forEach(app => {
      if (!app.created_at) return;
      const dateString = new Date(app.created_at).toISOString().split("T")[0];
      if (data[dateString] !== undefined) {
        data[dateString]++;
      }
    });
    
    return Object.keys(data).map(date => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: data[date]
    }));
  }, [filteredApps, timeWindow]);

  // Top Companies
  const topCompaniesData = useMemo(() => {
    const companies: Record<string, number> = {};
    filteredApps.forEach(app => {
      if (app.company) {
        companies[app.company] = (companies[app.company] || 0) + 1;
      }
    });

    return Object.entries(companies)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // top 5
  }, [filteredApps]);

  // Custom Tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-xl z-50">
          <p className="text-zinc-400 text-xs mb-1">{label}</p>
          <p className="text-white font-bold">{payload[0].value} Applications</p>
        </div>
      );
    }
    return null;
  };

  const TopCompaniesTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-xl z-50">
          <p className="text-white font-bold">{payload[0].payload.name}</p>
          <p className="text-zinc-400 text-sm">{payload[0].value} Applications</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-zinc-400 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-accent" />
        <p className="font-medium">Crunching your data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto min-h-screen">
        <div className="p-5 rounded-2xl bg-red-950/40 border border-red-800/50 text-red-300">
          Error: {error}
        </div>
      </div>
    );
  }

  // --- EMPTY STATES ---
  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <div className="w-24 h-24 bg-surface border border-border-subtle rounded-3xl flex items-center justify-center shadow-2xl shadow-black/50 mb-6">
          <BarChart3 className="w-10 h-10 text-accent/50" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">No Analytics Yet</h2>
        <p className="text-zinc-400 max-w-md mb-8">
          Your dashboard will come alive once you start adding jobs. Import jobs to track your funnel, response rates, and application velocity.
        </p>
        <Link 
          href="/applications"
          className="bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-accent/20"
        >
          Import your first job
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen space-y-8 pb-20">
      
      {/* Header & Controls */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 reveal reveal-1">
        <div>
          <h1 className="text-white text-3xl font-extrabold tracking-tight mb-2">Analytics Dashboard</h1>
          <p className="text-zinc-400">Insights and metrics across your job search pipeline.</p>
        </div>

        {/* Time Window Selector */}
        <div className="relative group self-start md:self-auto">
          <select 
            className="appearance-none bg-surface border border-border-default hover:border-border-subtle text-white text-sm font-medium py-2 pl-4 pr-10 rounded-xl outline-none focus:ring-2 focus:ring-accent/50 transition-all cursor-pointer shadow-sm"
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value === "all" ? "all" : parseInt(e.target.value))}
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </header>

      {filteredApps.length === 0 ? (
        <div className="bg-surface border border-border-subtle rounded-3xl p-12 text-center flex flex-col items-center">
          <Inbox className="w-12 h-12 text-zinc-600 mb-4" />
          <p className="text-zinc-400 font-medium">No applications found in this timeframe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 reveal reveal-2">
          
          {/* KPIs */}
          <div data-testid="analytics-card" className="bg-surface border border-border-subtle rounded-3xl p-6 shadow-sm flex flex-col justify-center">
            <p className="text-sm font-medium text-zinc-400 mb-1">Total Active Applications</p>
            <p className="text-4xl font-extrabold text-white mb-2">{totalActive}</p>
            <p className="text-xs text-zinc-500">Excluding unapplied/saved jobs</p>
          </div>
          
          <div data-testid="analytics-card" className="bg-surface border border-border-subtle rounded-3xl p-6 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
            <p className="text-sm font-medium text-blue-400 mb-1">Response Rate</p>
            <p className="text-4xl font-extrabold text-white mb-2">{responseRate}%</p>
            <p className="text-xs text-zinc-500">Apps leading to interviews</p>
          </div>

          <div data-testid="analytics-card" className="bg-surface border border-border-subtle rounded-3xl p-6 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
            <p className="text-sm font-medium text-emerald-400 mb-1">Interview Conversion</p>
            <p className="text-4xl font-extrabold text-white mb-2">{interviewConversion}%</p>
            <p className="text-xs text-zinc-500">Interviews resulting in offers</p>
          </div>

          {/* Timeline Chart */}
          <div data-testid="analytics-card" className="bg-surface border border-border-subtle rounded-3xl p-6 shadow-sm col-span-1 md:col-span-3">
            <div className="flex items-center space-x-2 mb-6">
              <TrendingUp className="w-5 h-5 text-accent" />
              <h2 className="text-white font-bold text-lg">Application Velocity</h2>
            </div>
            <div className="h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-muted)" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="var(--accent)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorCount)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Funnel Chart */}
          <div data-testid="analytics-card" className="bg-surface border border-border-subtle rounded-3xl p-6 shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-2 mb-6">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-bold text-lg">Pipeline Funnel</h2>
            </div>
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    stroke="var(--text-muted)"
                    fontSize={12}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg shadow-xl text-sm z-50">
                            <span className="text-white font-bold">{payload[0].value}</span>
                            <span className="text-zinc-400 ml-1">in {payload[0].payload.name}</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Fit Score Distribution */}
          <div data-testid="analytics-card" className="bg-surface border border-border-subtle rounded-3xl p-6 shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-2 mb-6">
              <Target className="w-5 h-5 text-emerald-400" />
              <h2 className="text-white font-bold text-lg">AI Fit Scores</h2>
            </div>
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={fitScoreData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis 
                    dataKey="range" 
                    stroke="var(--text-muted)" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-xl z-50">
                            <p className="text-zinc-400 text-xs mb-1">Score: {label}</p>
                            <p className="text-white font-bold">{payload[0].value} Applications</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {fitScoreData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        index === 0 ? "#ef4444" : // Red for low
                        index === 1 ? "#f59e0b" : // Amber
                        index === 2 ? "#3b82f6" : // Blue
                        "#10b981" // Emerald for high
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Companies */}
          <div data-testid="analytics-card" className="bg-surface border border-border-subtle rounded-3xl p-6 shadow-sm col-span-1 md:col-span-3 lg:col-span-1">
            <div className="flex items-center space-x-2 mb-6">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              <h2 className="text-white font-bold text-lg">Top Companies</h2>
            </div>
            {topCompaniesData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
                No company data available.
              </div>
            ) : (
              <div className="w-full flex flex-col min-w-0">
                <div className="h-64 w-full min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={topCompaniesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {topCompaniesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${220 + (index * 40)}, 70%, 60%)`} />
                      ))}
                    </Pie>
                    <Tooltip content={<TopCompaniesTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div className="mt-4 flex flex-col space-y-2">
                  {topCompaniesData.map((entry, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `hsl(${220 + (index * 40)}, 70%, 60%)` }} />
                        <span className="text-zinc-300 truncate max-w-[120px]" title={entry.name}>{entry.name}</span>
                      </div>
                      <span className="text-zinc-500 font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
