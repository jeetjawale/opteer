"use client";

import { Send, Users, Brain, BadgeCheck } from "lucide-react";
import { useDashboardOverview } from "@/features/dashboard/hooks/useDashboard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/LoadingState";

export default function StatsRow() {
  const { data, isLoading, isError } = useDashboardOverview();

  const stats = data?.stats || {
    total_applications: 0,
    active_interviews: 0,
    avg_fit_score: 0,
    offers_received: 0,
  };

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <div className="grid grid-cols-4 gap-md">
      <Card variant="widget" className="flex flex-col justify-between hover:shadow-sm transition-shadow">
        <div className="flex justify-between items-start mb-md">
          <span className="font-body-sm text-body-sm text-on-surface-variant">Total Applications</span>
          <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center">
            <Send size={18} className="text-primary" />
          </div>
        </div>
        <div className="flex items-baseline gap-xs">
          <span className="font-headline-lg text-headline-lg text-on-surface">{stats.total_applications}</span>
        </div>
      </Card>
      
      <Card variant="widget" className="flex flex-col justify-between hover:shadow-sm transition-shadow">
        <div className="flex justify-between items-start mb-md">
          <span className="font-body-sm text-body-sm text-on-surface-variant">Active Interviews</span>
          <div className="w-8 h-8 rounded bg-secondary-container flex items-center justify-center">
            <Users size={18} className="text-on-secondary-container" />
          </div>
        </div>
        <div className="flex items-baseline gap-xs">
          <span className="font-headline-lg text-headline-lg text-on-surface">{stats.active_interviews}</span>
        </div>
      </Card>
      
      <Card variant="widget" className="flex flex-col justify-between hover:shadow-sm transition-shadow">
        <div className="flex justify-between items-start mb-md">
          <span className="font-body-sm text-body-sm text-on-surface-variant">Avg. Fit Score</span>
          <div className="w-8 h-8 rounded bg-tertiary-container flex items-center justify-center">
            <Brain size={18} className="text-tertiary" />
          </div>
        </div>
        <div className="flex items-baseline gap-xs">
          <span className="font-headline-lg text-headline-lg text-on-surface">{stats.avg_fit_score}<span className="text-headline-sm text-outline ml-0.5">%</span></span>
        </div>
      </Card>
      
      <Card variant="widget" className="flex flex-col justify-between hover:shadow-sm transition-shadow">
        <div className="flex justify-between items-start mb-md">
          <span className="font-body-sm text-body-sm text-on-surface-variant">Offers Received</span>
          <div className="w-8 h-8 rounded bg-error-container flex items-center justify-center">
            <BadgeCheck size={18} className="text-error" />
          </div>
        </div>
        <div className="flex items-baseline gap-xs">
          <span className="font-headline-lg text-headline-lg text-on-surface">{stats.offers_received}</span>
          {stats.offers_received > 0 && (
            <Badge variant="warning">Action Required</Badge>
          )}
        </div>
      </Card>
    </div>
  );
}
