"use client";

import { useState } from "react";
import { Filter, ArrowUpDown, Bookmark, Send, Users, BadgeCheck, Archive, Ban } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import PipelineColumn from "@/features/applications/components/PipelineColumn";
import ApplicationCard from "@/features/applications/components/ApplicationCard";
import { useApplications, useUpdateApplicationStatus } from "@/features/applications/hooks/useApplications";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ApplicationsPage() {
  const { data: applications = [], isLoading } = useApplications();
  const { mutate: updateStatus } = useUpdateApplicationStatus();

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    let targetStatus = "";
    if (["saved", "applied", "interview", "offer", "closed", "rejected"].includes(overIdStr)) {
      targetStatus = overIdStr;
    } else {
      const overApp = applications.find(a => a.id === overIdStr);
      if (overApp && overApp.status) {
        targetStatus = overApp.status.toLowerCase();
        if (targetStatus === "pending") targetStatus = "applied";
        if (targetStatus === "interviewing") targetStatus = "interview";
        if (targetStatus === "imported") targetStatus = "saved";
      }
    }

    if (targetStatus) {
      updateStatus({ id: activeIdStr, status: targetStatus });
    }
  };

  const activeApp = activeId ? applications.find(a => a.id === activeId) : null;

  const [filterText, setFilterText] = useState("");
  const [sortBy, setSortBy] = useState<"updated_desc" | "updated_asc" | "fit_desc" | "fit_asc">("updated_desc");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // 1. Filter
  let processedApps = applications;
  if (filterText) {
    const lowerFilter = filterText.toLowerCase();
    processedApps = processedApps.filter(app => 
      (app.company || '').toLowerCase().includes(lowerFilter) ||
      (app.role || '').toLowerCase().includes(lowerFilter)
    );
  }

  // 2. Sort
  processedApps = [...processedApps].sort((a, b) => {
    if (sortBy === 'updated_desc') {
      return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
    }
    if (sortBy === 'updated_asc') {
      return new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime();
    }
    if (sortBy === 'fit_desc') {
      return (b.fit_score || 0) - (a.fit_score || 0);
    }
    if (sortBy === 'fit_asc') {
      return (a.fit_score || 0) - (b.fit_score || 0);
    }
    return 0;
  });

  const groupedApps = {
    saved: processedApps.filter(a => a.status?.toLowerCase() === 'saved' || a.status?.toLowerCase() === 'imported'),
    applied: processedApps.filter(a => a.status?.toLowerCase() === 'applied' || a.status?.toLowerCase() === 'pending'),
    interview: processedApps.filter(a => a.status?.toLowerCase() === 'interview' || a.status?.toLowerCase() === 'interviewing'),
    offer: processedApps.filter(a => a.status?.toLowerCase() === 'offer'),
    closed: processedApps.filter(a => a.status?.toLowerCase() === 'closed'),
    rejected: processedApps.filter(a => a.status?.toLowerCase() === 'rejected'),
  };

  return (
    <main className="flex-1 p-lg w-full flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <PageHeader
        title="Application Pipeline"
        subtitle="Tracking active job opportunities and interview stages."
        className="flex-shrink-0"
        action={
          <div className="flex gap-2">
            {/* Filter Dropdown */}
            <div className="relative">
              <Button 
                variant={filterText ? "primary" : "outline"}
                size="sm"
                onClick={() => { setIsFilterOpen(!isFilterOpen); setIsSortOpen(false); }}
                className="gap-1.5"
              >
                <Filter size={14} /> Filter {filterText && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
              </Button>
              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-outline-variant rounded-lg shadow-lg p-3 z-50">
                  <h3 className="text-xs font-semibold text-on-surface mb-2 uppercase tracking-wide">Filter by Keyword</h3>
                  <input 
                    type="text" 
                  placeholder="Search company or role..." 
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded-md text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
                {filterText && (
                  <button 
                    onClick={() => setFilterText("")}
                    className="mt-2 text-[11px] font-medium text-primary hover:text-primary/80 uppercase tracking-wide"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <Button 
              variant={sortBy !== 'updated_desc' ? "primary" : "outline"}
              size="sm"
              onClick={() => { setIsSortOpen(!isSortOpen); setIsFilterOpen(false); }}
              className="gap-1.5"
            >
              <ArrowUpDown size={14} /> Sort
            </Button>
            {isSortOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-outline-variant rounded-lg shadow-lg p-1.5 z-50 flex flex-col gap-0.5">
                <button 
                  onClick={() => setSortBy('updated_desc')} 
                  className={`text-left px-2.5 py-1.5 rounded-md text-sm transition-colors ${sortBy === 'updated_desc' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-surface-container text-on-surface-variant'}`}
                >
                  Last Updated (Newest)
                </button>
                <button 
                  onClick={() => setSortBy('updated_asc')} 
                  className={`text-left px-2.5 py-1.5 rounded-md text-sm transition-colors ${sortBy === 'updated_asc' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-surface-container text-on-surface-variant'}`}
                >
                  Last Updated (Oldest)
                </button>
                <button 
                  onClick={() => setSortBy('fit_desc')} 
                  className={`text-left px-2.5 py-1.5 rounded-md text-sm transition-colors ${sortBy === 'fit_desc' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-surface-container text-on-surface-variant'}`}
                >
                  AI Fit Score (High to Low)
                </button>
                <button 
                  onClick={() => setSortBy('fit_asc')} 
                  className={`text-left px-2.5 py-1.5 rounded-md text-sm transition-colors ${sortBy === 'fit_asc' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-surface-container text-on-surface-variant'}`}
                >
                  AI Fit Score (Low to High)
                </button>
              </div>
            )}
          </div>
        {/* Global Overlay for closing dropdowns */}
        {(isFilterOpen || isSortOpen) && (
          <div className="fixed inset-0 z-40" onClick={() => { setIsFilterOpen(false); setIsSortOpen(false); }} />
        )}
      </div>
      }
    />

    {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {isLoading ? (
          <div className="flex gap-lg h-full pb-4 items-start">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-[340px] min-w-[340px] h-[400px] bg-surface-container-low rounded-2xl animate-pulse border border-outline-variant" />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-lg h-full pb-4 items-start min-w-full w-max">
              
              <PipelineColumn title="Saved" count={groupedApps.saved.length} icon={<Bookmark size={16} />} statusId="saved" items={groupedApps.saved.map(a => a.id)}>
              {groupedApps.saved.map(app => (
                <ApplicationCard 
                  key={app.id}
                  id={app.id}
                  onDragStart={handleDragStart}
                  company={app.company || 'Unknown Company'}
                  role={app.role || 'Unknown Role'}
                  location={app.location || 'Remote'}
                  jobUrl={app.url} logoInitial={(app.company || 'U')[0].toUpperCase()}
                  fitScore={app.fit_score || 0}
                  tags={[app.work_model, app.location].filter(Boolean) as string[]}
                  timeAgoText={app.updated_at ? `Added ${formatDistanceToNow(new Date(app.updated_at))} ago` : 'Recently updated'}
                />
              ))}
              </PipelineColumn>

              <PipelineColumn title="Applied" count={groupedApps.applied.length} icon={<Send size={16} />} statusId="applied" items={groupedApps.applied.map(a => a.id)}>
              {groupedApps.applied.map(app => (
                <ApplicationCard 
                  key={app.id}
                  id={app.id}
                  onDragStart={handleDragStart}
                  company={app.company || 'Unknown Company'}
                  role={app.role || 'Unknown Role'}
                  location={app.location || 'Remote'}
                  jobUrl={app.url} logoInitial={(app.company || 'U')[0].toUpperCase()}
                  fitScore={app.fit_score || 0}
                  isQualityGated={app.is_quality_gated}
                  qualityGateReason={app.quality_gate_reason}
                  tags={[app.work_model, app.location].filter(Boolean) as string[]}
                  timeAgoText={app.updated_at ? `Added ${formatDistanceToNow(new Date(app.updated_at))} ago` : 'Recently updated'}
                />
              ))}
              </PipelineColumn>
              
              <PipelineColumn title="Interview" count={groupedApps.interview.length} icon={<Users size={16} />} statusId="interview" items={groupedApps.interview.map(a => a.id)}>
              {groupedApps.interview.map(app => (
                <ApplicationCard 
                  key={app.id}
                  id={app.id}
                  onDragStart={handleDragStart}
                  company={app.company || 'Unknown Company'}
                  role={app.role || 'Unknown Role'}
                  location={app.location || 'Remote'}
                  jobUrl={app.url} logoInitial={(app.company || 'U')[0].toUpperCase()}
                  fitScore={app.fit_score || 0}
                  isQualityGated={app.is_quality_gated}
                  qualityGateReason={app.quality_gate_reason}
                  tags={[app.work_model, app.location].filter(Boolean) as string[]}
                  timeAgoText={app.updated_at ? `Added ${formatDistanceToNow(new Date(app.updated_at))} ago` : 'Recently updated'}
                  isActive={true}
                />
              ))}
              </PipelineColumn>
              
              <PipelineColumn title="Offer" count={groupedApps.offer.length} icon={<BadgeCheck size={16} />} statusId="offer" items={groupedApps.offer.map(a => a.id)}>
              {groupedApps.offer.map(app => (
                <ApplicationCard 
                  key={app.id}
                  id={app.id}
                  onDragStart={handleDragStart}
                  company={app.company || 'Unknown Company'}
                  role={app.role || 'Unknown Role'}
                  location={app.location || 'Remote'}
                  jobUrl={app.url} logoInitial={(app.company || 'U')[0].toUpperCase()}
                  fitScore={app.fit_score || 0}
                  isQualityGated={app.is_quality_gated}
                  qualityGateReason={app.quality_gate_reason}
                  tags={[app.work_model, app.location].filter(Boolean) as string[]}
                  timeAgoText={app.updated_at ? `Added ${formatDistanceToNow(new Date(app.updated_at))} ago` : 'Recently updated'}
                />
              ))}
              </PipelineColumn>
              
              <PipelineColumn title="Closed" count={groupedApps.closed.length} icon={<Archive size={16} />} statusId="closed" items={groupedApps.closed.map(a => a.id)}>
              {groupedApps.closed.map(app => (
                <ApplicationCard 
                  key={app.id}
                  id={app.id}
                  onDragStart={handleDragStart}
                  company={app.company || 'Unknown Company'}
                  role={app.role || 'Unknown Role'}
                  location={app.location || 'Remote'}
                  jobUrl={app.url} logoInitial={(app.company || 'U')[0].toUpperCase()}
                  fitScore={app.fit_score || 0}
                  isQualityGated={app.is_quality_gated}
                  qualityGateReason={app.quality_gate_reason}
                  tags={[app.work_model, app.location].filter(Boolean) as string[]}
                  timeAgoText={app.updated_at ? `Added ${formatDistanceToNow(new Date(app.updated_at))} ago` : 'Recently updated'}
                />
              ))}
              </PipelineColumn>
              
              <PipelineColumn title="Rejected" count={groupedApps.rejected.length} icon={<Ban size={16} />} statusId="rejected" items={groupedApps.rejected.map(a => a.id)}>
              {groupedApps.rejected.map(app => (
                <ApplicationCard 
                  key={app.id}
                  id={app.id}
                  onDragStart={handleDragStart}
                  company={app.company || 'Unknown Company'}
                  role={app.role || 'Unknown Role'}
                  location={app.location || 'Remote'}
                  jobUrl={app.url} logoInitial={(app.company || 'U')[0].toUpperCase()}
                  fitScore={app.fit_score || 0}
                  isQualityGated={app.is_quality_gated}
                  qualityGateReason={app.quality_gate_reason}
                  tags={[app.work_model, app.location].filter(Boolean) as string[]}
                  timeAgoText={app.updated_at ? `Added ${formatDistanceToNow(new Date(app.updated_at))} ago` : 'Recently updated'}
                />
              ))}
              </PipelineColumn>

              {/* Spacer block to allow scrolling completely past the last column */}
              <div className="w-8 shrink-0 h-full" />
              
            </div>
            
            <DragOverlay>
              {activeApp ? (
                <ApplicationCard 
                  id={activeApp.id}
                  company={activeApp.company || 'Unknown Company'}
                  role={activeApp.role || 'Unknown Role'}
                  location={activeApp.location || 'Remote'}
                  jobUrl={activeApp.url} logoInitial={(activeApp.company || 'U')[0].toUpperCase()}
                  fitScore={activeApp.fit_score || 0}
                  isQualityGated={activeApp.is_quality_gated}
                  qualityGateReason={activeApp.quality_gate_reason}
                  tags={[activeApp.work_model, activeApp.location].filter(Boolean) as string[]}
                  timeAgoText={activeApp.updated_at ? `Added ${formatDistanceToNow(new Date(activeApp.updated_at))} ago` : 'Recently updated'}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </main>
  );
}
