"use client";

import { useDashboardOverview } from "@/features/dashboard/hooks/useDashboard";
import { format } from "date-fns";
import { Card } from "@/components/ui/Card";

export default function UpcomingEvents() {
  const { data, isLoading } = useDashboardOverview();
  const events = data?.upcoming_events || [];

  if (isLoading) {
    return (
      <Card variant="widget" className="flex flex-col h-[280px] p-0 animate-pulse">
        <div className="p-md border-b border-outline-variant flex items-center gap-sm bg-surface-bright">
          <span className="material-symbols-outlined text-primary">calendar_month</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Upcoming Events</h3>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="widget" className="flex flex-col p-0">
      <div className="p-md border-b border-outline-variant flex items-center gap-sm bg-surface-bright">
        <span className="material-symbols-outlined text-primary">calendar_month</span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface">Upcoming Events</h3>
      </div>
      <div className="p-md flex flex-col gap-md">
        {events.length === 0 ? (
          <p className="text-on-surface-variant font-body-sm text-center py-sm">No upcoming events.</p>
        ) : (
          events.map((event: any, idx: number) => {
            const date = new Date(event.due_at || event.timestamp);
            return (
              <div key={idx} className="flex gap-md border border-outline-variant rounded p-sm bg-surface-container-low/50 relative overflow-hidden">
                <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 bg-surface rounded border border-outline-variant">
                  <span className="font-label-md text-label-md text-error uppercase">{format(date, 'MMM')}</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface leading-none">{format(date, 'dd')}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-body-md text-body-md text-on-surface font-medium capitalize">{event.type || event.title || 'Event'}</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{event.note || event.subtitle || 'No details'} • {format(date, 'h:mm a')}</p>
                  <div className="mt-sm flex gap-xs">
                    {event.is_completed || event.prep_complete ? (
                      <span className="bg-secondary-container/20 text-on-secondary-container font-mono-data text-[11px] px-2 py-0.5 rounded border border-secondary-container flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">check_circle</span> Prep Complete
                      </span>
                    ) : (
                      <span className="bg-surface-container text-on-surface-variant font-mono-data text-[11px] px-2 py-0.5 rounded border border-outline-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">library_books</span> Prep Notes Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
