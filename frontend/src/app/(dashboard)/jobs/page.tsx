"use client";

import { useRouter } from "next/navigation";
import { Building2, Trash2, ExternalLink } from "lucide-react";
import { useApplications, useDeleteApplication } from "@/features/applications/hooks/useApplications";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CompanyLogo } from "@/components/ui/CompanyLogo";

export default function JobBoardPage() {
  const router = useRouter();
  const { data: applications = [], isLoading } = useApplications();
  const { mutate: deleteApp, isPending: isDeleting } = useDeleteApplication();  return (
    <main className="flex-1 p-lg w-full">
      {/* PageHeader */}
      <PageHeader 
        title="Saved Jobs" 
        subtitle="Manage and track your high-value target roles."
        action={
          <Button onClick={() => window.dispatchEvent(new Event("opteer:open-job-import-modal"))}>
            Add Posting
          </Button>
        }
      />

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-on-surface-variant">Loading jobs...</div>
        ) : applications.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant">
            No saved jobs yet. Import a job to get started.
          </div>
        ) : (
          applications.map((app) => (
            <Card 
              variant="interactive" 
              key={app.id} 
              className="h-full flex flex-col relative group cursor-pointer hover:border-primary/50"
              onClick={() => router.push(`/jobs/${app.id}`)}
            >
                
                <div className="flex justify-between items-start mb-md">
                  <div className="flex items-center gap-3 pr-2">
                    <div className="w-10 h-10 rounded-md bg-surface-container-high flex items-center justify-center text-lg font-bold text-on-surface-variant border border-outline-variant overflow-hidden">
                      <CompanyLogo 
                        company={app.company || ''} 
                        jobUrl={app.url}
                        logoUrl={app.company_logo}
                        fallback={(app.company || 'U')[0].toUpperCase()} 
                      />
                    </div>
                    <div>
                      <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                        {app.role || "Unknown Role"}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 line-clamp-1">
                        <Building2 size={14} className="shrink-0" />
                        {app.company || "Unknown Company"}
                      </p>
                    </div>
                  </div>
                  {/* Fit Score at Top Right */}
                  <div className="flex items-center gap-1 border border-primary/20 bg-primary/10 text-primary px-2 py-0.5 rounded-md font-label-sm text-[11px] font-semibold shrink-0">
                    <span className="material-symbols-outlined text-[13px]">analytics</span>
                    {app.fit_score !== undefined && app.fit_score !== null ? `${app.fit_score}% Fit` : "--"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-md mt-auto">
                  <span className="px-2 py-0.5 bg-surface-container-low rounded text-[11px] font-mono-data text-on-surface-variant border border-outline-variant/50">
                    Status: {app.status}
                  </span>
                  {app.analysis_status && app.analysis_status !== "idle" && (
                    <span className="px-2 py-0.5 bg-surface-container-low rounded text-[11px] font-mono-data text-on-surface-variant border border-outline-variant/50">
                      Analysis: {app.analysis_status}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-outline-variant pt-md mt-auto">
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                    Added recently
                  </span>
                  <div className="flex items-center gap-2">
                    {app.url && (
                      <a 
                        href={app.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-on-surface-variant hover:text-primary hover:bg-primary/10 p-1.5 rounded-md transition-colors z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="View Source Job Posting"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this job?')) {
                          deleteApp(app.id);
                        }
                      }}
                      disabled={isDeleting}
                      className="text-on-surface-variant hover:text-error hover:bg-error/10 p-1.5 rounded-md transition-colors z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete Job"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
          ))
        )}
      </div>

    </main>
  );
}
