"use client";

import { History, Briefcase, Send, Eye, MessageSquare, BadgeCheck, XCircle, Bookmark } from "lucide-react";
import { useDashboardOverview } from "@/features/dashboard/hooks/useDashboard";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/Card";

export default function RecentActivity() {
  const { data, isLoading } = useDashboardOverview();
  const activities = data?.recent_activity || [];

  if (isLoading) {
    return (
      <Card variant="widget" className="flex flex-col flex-1 p-0">
        <div className="p-md border-b border-outline-variant flex items-center gap-sm bg-surface-bright">
          <span className="material-symbols-outlined text-primary">history</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Recent Activity</h3>
        </div>
        <div className="p-md relative animate-pulse">
          <div className="h-10 bg-surface-container rounded mb-4"></div>
          <div className="h-10 bg-surface-container rounded mb-4"></div>
          <div className="h-10 bg-surface-container rounded"></div>
        </div>
      </Card>
    );
  }

  const getIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('sent') || t.includes('applied')) return <Send size={16} />;
    if (t.includes('interview')) return <MessageSquare size={16} />;
    if (t.includes('offer')) return <BadgeCheck size={16} />;
    if (t.includes('rejected')) return <XCircle size={16} />;
    if (t.includes('viewed')) return <Eye size={16} />;
    if (t.includes('saved')) return <Bookmark size={16} />;
    return <Briefcase size={16} />;
  };

  const getIconBg = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('sent') || t.includes('applied')) return 'bg-primary-container text-primary';
    if (t.includes('interview')) return 'bg-secondary-container text-on-secondary-container';
    if (t.includes('offer')) return 'bg-success-container text-success';
    if (t.includes('rejected')) return 'bg-error-container text-error';
    if (t.includes('viewed')) return 'bg-tertiary-container text-tertiary';
    return 'bg-surface-container-high text-on-surface';
  };

  return (
    <Card variant="widget" className="flex flex-col flex-1 p-0">
      <div className="p-md border-b border-outline-variant flex items-center gap-sm bg-surface-bright">
        <span className="material-symbols-outlined text-primary">history</span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface">Recent Activity</h3>
      </div>
      <div className="p-md flex flex-col gap-md">
        {activities.length === 0 ? (
          <p className="text-on-surface-variant font-body-sm text-center py-sm">No recent activity.</p>
        ) : (
          activities.map((act) => (
            <div key={act.id} className="flex gap-md border border-outline-variant rounded p-sm bg-surface-container-low/50 relative overflow-hidden">
              <div className={`flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded border border-outline-variant ${getIconBg(act.title)}`}>
                {getIcon(act.title)}
              </div>
              <div className="flex-1">
                <h4 className="font-body-md text-body-md text-on-surface font-medium">{act.title}</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{act.subtitle}</p>
                <div className="mt-sm flex gap-xs">
                  <span className="font-mono-data text-mono-data text-outline mt-xs">
                    {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
