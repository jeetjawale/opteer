"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getApplications } from "@/lib/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Cell, PieChart, Pie
} from "recharts";
import { BarChart3, TrendingUp, Target, RefreshCw } from "lucide-react";

export default function AnalyticsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Compute Funnel Data
  const funnelData = useMemo(() => {
    const counts = { saved: 0, applied: 0, interview: 0, offer: 0, rejected: 0, closed: 0 };
    applications.forEach(app => {
      if (counts[app.status as keyof typeof counts] !== undefined) {
        counts[app.status as keyof typeof counts]++;
      }
    });

    return [
      { name: "Saved", value: counts.saved, color: "#71717a" }, // zinc-500
      { name: "Applied", value: counts.applied, color: "#3b82f6" }, // blue-500
      { name: "Interview", value: counts.interview, color: "#f59e0b" }, // amber-500
      { name: "Offer", value: counts.offer, color: "#22c55e" } // green-500
    ];
  }, [applications]);

  // Compute Fit Score Distribution
  const fitScoreData = useMemo(() => {
    const buckets = [
      { range: "0-50", count: 0 },
      { range: "51-70", count: 0 },
      { range: "71-85", count: 0 },
      { range: "86-100", count: 0 },
    ];
    
    applications.forEach(app => {
      const score = app.fit_score;
      if (score === null || score === undefined) return;
      
      if (score <= 50) buckets[0].count++;
      else if (score <= 70) buckets[1].count++;
      else if (score <= 85) buckets[2].count++;
      else buckets[3].count++;
    });
    
    return buckets;
  }, [applications]);

  // Compute Timeline Data (Last 14 Days)
  const timelineData = useMemo(() => {
    const days = 14;
    const data: Record<string, number> = {};
    
    // Initialize last 14 days
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split("T")[0];
      data[dateString] = 0;
    }
    
    // Count applications (using created_at or applied_at)
    applications.forEach(app => {
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
  }, [applications]);

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-xl">
          <p className="text-zinc-400 text-xs mb-1">{label}</p>
          <p className="text-white font-bold">{payload[0].value} Applications</p>
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

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen space-y-8">
      {/* Header */}
      <header className="reveal reveal-1">
        <h1 className="text-white text-3xl font-extrabold tracking-tight mb-2">Analytics Dashboard</h1>
        <p className="text-zinc-400">Insights and metrics across all your job applications.</p>
      </header>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 reveal reveal-2">
        
        {/* Timeline Chart */}
        <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm col-span-1 lg:col-span-2">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="text-white font-bold text-lg">Applications Over Time (Last 14 Days)</h2>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
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
        <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-6">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h2 className="text-white font-bold text-lg">Job Funnel</h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
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
                        <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg shadow-xl text-sm">
                          <span className="text-white font-bold">{payload[0].value}</span>
                          <span className="text-zinc-400 ml-1">in {payload[0].payload.name}</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fit Score Distribution */}
        <div className="bg-surface border border-border-subtle rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-6">
            <Target className="w-5 h-5 text-emerald-400" />
            <h2 className="text-white font-bold text-lg">Fit Score Distribution</h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
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
                        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-xl">
                          <p className="text-zinc-400 text-xs mb-1">Score: {label}</p>
                          <p className="text-white font-bold">{payload[0].value} Applications</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={50}>
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

      </div>
    </div>
  );
}
