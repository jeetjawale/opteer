import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface PipelineColumnProps {
  title: string;
  count: number;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  statusId: string;
  items: string[];
}

export default function PipelineColumn({ title, count, icon, children, statusId, items }: PipelineColumnProps) {
  const { setNodeRef } = useDroppable({
    id: statusId,
  });

  return (
    <div 
      ref={setNodeRef}
      className="flex flex-col w-[360px] min-w-[360px] flex-shrink-0 flex-1 bg-surface-container-low/50 rounded-xl border border-outline-variant/60 shadow-sm"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-outline-variant/50">
        <div className="flex items-center gap-2">
          {icon && <div className="flex items-center justify-center text-on-surface-variant opacity-80">{icon}</div>}
          <h3 className="font-label-md text-label-md font-semibold text-on-surface">{title}</h3>
        </div>
        <span className="font-mono-data text-mono-data text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full text-xs font-medium">{count}</span>
      </div>
      
      {/* Cards Container */}
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3 overflow-y-auto px-3 py-3 min-h-[100px] flex-1">
          {children}
        </div>
      </SortableContext>
    </div>
  );
}
