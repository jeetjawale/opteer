"use client";

import { Brain } from "lucide-react";
import { useDashboardOverview } from "@/features/dashboard/hooks/useDashboard";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/LoadingState";

export default function TopRecommendations() {
  const { data, isLoading } = useDashboardOverview();
  const recommendations = data?.top_recommendations || [];

  if (isLoading) {
    return (
      <Card variant="widget" className="p-0 flex flex-col overflow-hidden">
        <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-bright">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-tertiary">auto_awesome</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Top Recommended Roles</h3>
          </div>
        </div>
        <Skeleton className="h-[200px] w-full rounded-none" />
      </Card>
    );
  }

  return (
    <Card variant="widget" className="p-0 flex flex-col overflow-hidden">
      <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-bright">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-tertiary">auto_awesome</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Top Recommended Roles</h3>
        </div>
        <button className="text-primary hover:text-on-primary-fixed-variant font-label-md text-label-md transition-colors">View All</button>
      </div>
      <div className="flex flex-col">
        {/* Header Row */}
        <div className="grid grid-cols-12 gap-sm px-md py-xs border-b border-outline-variant bg-surface font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
          <div className="col-span-5">Role / Company</div>
          <div className="col-span-3">Location</div>
          <div className="col-span-2 text-center">Fit Score</div>
          <div className="col-span-2 text-right">Action</div>
        </div>
        
        {recommendations.length === 0 ? (
          <div className="p-md text-center text-on-surface-variant font-body-sm">
            No recommendations yet. Complete your profile to get AI-matched roles!
          </div>
        ) : (
          recommendations.map((rec, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-sm px-md py-sm border-b border-outline-variant items-center hover:bg-surface-container-low transition-colors group">
              <div className="col-span-5 flex items-center gap-sm">
                <div className="w-10 h-10 rounded bg-surface-container border border-outline-variant flex items-center justify-center font-headline-sm text-on-surface-variant">
                  {(rec.company || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-body-md text-body-md text-on-surface font-medium group-hover:text-primary transition-colors">{rec.role || rec.title || 'Unknown Role'}</div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">{rec.company || 'Unknown Company'}</div>
                </div>
              </div>
              <div className="col-span-3 font-body-sm text-body-sm text-on-surface-variant">
                {`${rec.location || ''} ${rec.work_model ? `(${rec.work_model})` : ''}`.trim() || 'Remote/Unknown'}
              </div>
              <div className="col-span-2 flex justify-center">
                <div className="inline-flex items-center gap-1.5 bg-tertiary-fixed/30 text-on-tertiary-fixed-variant px-2 py-1 rounded border border-tertiary/20">
                  <span className="font-mono-data font-bold text-sm">{rec.fit_score || 0}%</span>
                  <Brain size={14} className="text-outline-variant" />
                </div>
              </div>
              <div className="col-span-2 text-right">
                <button className="border border-outline-variant text-on-surface font-body-sm text-body-sm px-sm py-xs rounded hover:bg-surface-container transition-colors">Review</button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
