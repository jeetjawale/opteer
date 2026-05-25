"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, Trash2, Loader2 } from "lucide-react";

import { getApplication, deleteApplication } from "@/lib/api";
import ApplicationDetail from "@/components/ApplicationDetail";

function ApplicationDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const tabParam = searchParams.get("tab") || "overview";

  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchApp = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getApplication(id);
      setApplication(data);
    } catch (err: any) {
      setError(err.message || "Failed to load application details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchApp();
    }
  }, [id, fetchApp]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this application?")) {
      return;
    }
    setDeleting(true);
    try {
      await deleteApplication(id);
      router.push("/applications");
      router.refresh();
    } catch (err: any) {
      alert(`Delete failed: ${err.message || err}`);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-zinc-400 space-y-3 p-8">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        <span className="text-sm font-medium">Loading details...</span>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <Link href="/applications" className="text-zinc-500 hover:text-white flex items-center space-x-2 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Applications</span>
        </Link>
        <div className="p-5 rounded-2xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm">
          {error || "Application not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      
      {/* Back Link & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Link href="/applications" className="text-zinc-500 hover:text-white flex items-center space-x-1.5 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            <span>Applications</span>
          </Link>
          <h1 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight">
            {application.role || "Job Opportunity"}
          </h1>
          <p className="text-zinc-400 text-sm font-medium">{application.company}</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchApp}
            className="p-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2.5 rounded-xl border border-red-500/20 hover:bg-red-955/20 text-red-400 hover:text-red-300 font-semibold text-sm transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Detailed Content */}
      <ApplicationDetail 
        application={application} 
        onRefresh={fetchApp} 
        defaultTab={tabParam} 
      />

    </div>
  );
}

export default function ApplicationDetailPage() {
  return (
    <Suspense 
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-zinc-400 space-y-3 p-8">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          <span className="text-sm font-medium">Loading details...</span>
        </div>
      }
    >
      <ApplicationDetailContent />
    </Suspense>
  );
}
