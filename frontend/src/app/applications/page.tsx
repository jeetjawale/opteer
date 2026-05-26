"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Download, MoreHorizontal, Search, RefreshCw, Sparkles } from "lucide-react";

import { getApplications } from "@/lib/api";
import StatsRow from "@/components/StatsRow";
import ApplicationsTable from "@/components/ApplicationsTable";
import ImportModal from "@/components/ImportModal";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering and Searching states
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // UI controls
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(0); // minutes ago

  const fetchApps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getApplications();
      setApplications(data || []);
      setLastUpdated(0);
    } catch (err: any) {
      setError(err.message || "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch applications on mount
  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  // Increment last updated minutes timer and auto-refresh every 5 minutes
  useEffect(() => {
    const minuteTimer = setInterval(() => {
      setLastUpdated((prev) => prev + 1);
    }, 60000); // update every minute

    const refreshTimer = setInterval(() => {
      fetchApps();
    }, 300000); // auto-refresh every 5 minutes

    return () => {
      clearInterval(minuteTimer);
      clearInterval(refreshTimer);
    };
  }, [fetchApps]);

  // Export applications as CSV
  const handleExport = () => {
    if (applications.length === 0) return;
    
    const headers = ["Company", "Role", "URL", "Status", "Fit Score", "Matched Skills", "Missing Skills", "Summary"];
    
    const rows = applications.map((app: any) => [
      app.company || "",
      app.role || "",
      app.url || "",
      app.status || "",
      app.fit_score ?? "",
      (app.matched_skills || []).join("; "),
      (app.missing_skills || []).join("; "),
      (app.summary || "").replace(/"/g, '""').replace(/\n/g, ' ')
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `jobpilot_applications_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter application items dynamically in memory for fast UI search
  const filteredApplications = applications.filter((app: any) => {
    // 1. Status Filter
    if (selectedStatus !== "all" && app.status !== selectedStatus) {
      return false;
    }
    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const companyMatch = (app.company || "").toLowerCase().includes(query);
      const roleMatch = (app.role || "").toLowerCase().includes(query);
      return companyMatch || roleMatch;
    }
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      
      {/* Top Header Bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-white text-3xl font-extrabold tracking-tight mb-1">Applications</h1>
          <p className="text-zinc-500 text-xs">
            {applications.length} total · {lastUpdated === 0 ? "just updated" : `updated ${lastUpdated} min ago`}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={fetchApps} 
            className="p-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
            title="Refresh database"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          
          <button 
            onClick={handleExport}
            className="px-4 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white font-semibold text-sm transition-colors flex items-center space-x-2"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>

          <button 
            onClick={() => setIsImportOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Import Job</span>
          </button>

          <button className="p-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Render KPI Stats */}
      <StatsRow applications={applications} />

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-6">
        
        {/* Status Pills */}
        <div className="flex flex-wrap gap-2">
          
          {/* Pill: All */}
          <button
            onClick={() => setSelectedStatus("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border uppercase tracking-wider ${
              selectedStatus === "all"
                ? "bg-zinc-800 text-white border-zinc-700"
                : "border-zinc-800/80 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>All</span>
          </button>

          {/* Pill: Saved */}
          <button
            onClick={() => setSelectedStatus("saved")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border uppercase tracking-wider ${
              selectedStatus === "saved"
                ? "bg-zinc-800 text-white border-zinc-700"
                : "border-zinc-800/80 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-zinc-500"></span>
            <span>Saved</span>
          </button>

          {/* Pill: Applied */}
          <button
            onClick={() => setSelectedStatus("applied")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border uppercase tracking-wider ${
              selectedStatus === "applied"
                ? "bg-zinc-800 text-white border-zinc-700"
                : "border-zinc-800/80 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Applied</span>
          </button>

          {/* Pill: Interview */}
          <button
            onClick={() => setSelectedStatus("interview")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border uppercase tracking-wider ${
              selectedStatus === "interview"
                ? "bg-zinc-800 text-white border-zinc-700"
                : "border-zinc-800/80 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Interview</span>
          </button>

          {/* Pill: Offer */}
          <button
            onClick={() => setSelectedStatus("offer")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border uppercase tracking-wider ${
              selectedStatus === "offer"
                ? "bg-zinc-800 text-white border-zinc-700"
                : "border-zinc-800/80 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span>Offer</span>
          </button>

          {/* Pill: Closed */}
          <button
            onClick={() => setSelectedStatus("closed")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border uppercase tracking-wider ${
              selectedStatus === "closed"
                ? "bg-zinc-800 text-white border-zinc-700"
                : "border-zinc-800/80 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
            <span>Closed</span>
          </button>

          {/* Pill: Rejected */}
          <button
            onClick={() => setSelectedStatus("rejected")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border uppercase tracking-wider ${
              selectedStatus === "rejected"
                ? "bg-zinc-800 text-white border-zinc-700"
                : "border-zinc-800/80 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>Rejected</span>
          </button>

        </div>

        {/* Live Search Input */}
        <div className="relative flex-1 md:max-w-xs">
          <Search className="w-4 h-4 text-zinc-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors text-sm"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

      </div>

      {/* Main CRM Table list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" />
          <span className="text-sm font-medium">Loading applications...</span>
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm">
          {error}
        </div>
      ) : (
        <ApplicationsTable 
          applications={filteredApplications} 
          onRefresh={fetchApps} 
        />
      )}

      {/* Import Overlay Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onRefresh={fetchApps}
      />

    </div>
  );
}
