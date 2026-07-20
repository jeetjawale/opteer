import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, User, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeleteApplication } from "@/features/applications/hooks/useApplications";
import { Card } from "@/components/ui/Card";
import { CompanyLogo } from "@/components/ui/CompanyLogo";

interface ApplicationCardProps {
  company: string;
  role: string;
  location: string;
  logoInitial: string;
  jobUrl?: string;
  fitScore: number;
  tags: string[];
  timeAgoText: string;
  isActive?: boolean;
  schedule?: string;
  id: string;
  isQualityGated?: boolean;
  qualityGateReason?: string | null;
  onDragStart?: (event: any) => void;
}

export default function ApplicationCard({
  company,
  role,
  location,
  logoInitial,
  jobUrl,
  fitScore,
  tags,
  timeAgoText,
  isActive = false,
  schedule,
  id,
  isQualityGated = false,
  qualityGateReason,
}: ApplicationCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const router = useRouter();
  const { mutate: deleteApp, isPending: isDeleting } = useDeleteApplication();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card 
      variant="interactive"
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => router.push(`/jobs/${id}`)}
      className={`flex flex-col touch-none cursor-grab active:cursor-grabbing duration-200 hover:border-primary/50 group ${isActive ? 'border-primary ring-1 ring-primary/20 shadow-sm shadow-primary/5 bg-primary/5' : ''} ${isDragging ? 'opacity-40 border-primary ring-2 ring-primary/20 shadow-xl z-50' : ''}`}
    >
      <div className="flex flex-col gap-3 flex-1">
        {/* Header */}
      <div className="flex justify-between items-start">
        <div className="w-11 h-11 rounded-lg border border-outline-variant flex items-center justify-center bg-surface-container-low text-on-surface font-headline-sm font-bold shadow-sm group-hover:border-primary/30 transition-colors overflow-hidden">
          <CompanyLogo company={company} jobUrl={jobUrl} fallback={logoInitial} />
        </div>
        <div className="flex items-center gap-2">
          {isQualityGated ? (
            <div className="flex items-center gap-1 border border-error/30 bg-error/10 text-error px-2 py-0.5 rounded-md font-label-sm text-[11px] font-semibold" title={qualityGateReason || "Failed Quality Gate"}>
              <span className="material-symbols-outlined text-[13px]">block</span>
              Rejected
            </div>
          ) : (
            <div className="flex items-center gap-1 border border-primary/20 bg-primary/10 text-primary px-2 py-0.5 rounded-md font-label-sm text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[13px]">analytics</span>
              {fitScore}% Fit
            </div>
          )}
        </div>
      </div>
      
      {/* Body */}
      <div>
        <h4 className="font-body-lg text-body-lg font-semibold text-on-surface leading-tight group-hover:text-primary transition-colors line-clamp-1">{role}</h4>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-1">
          {company}
        </p>
      </div>
      
      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <span key={i} className="bg-primary/10 text-primary font-label-sm text-[11px] px-1.5 py-0.5 rounded-sm font-medium border border-primary/20">
              {tag}
            </span>
          ))}
        </div>
      )}
      
      {/* Optional Schedule */}
      {schedule && (
        <div className="flex items-center gap-2 text-primary font-label-md text-label-md mt-xs bg-primary/10 px-3 py-2 rounded-lg border border-primary/20 font-medium">
          <Calendar size={15} />
          {schedule}
        </div>
      )}
      
      </div>
      
      <div className="w-full h-px bg-outline-variant mt-4" />
      
      {/* Footer */}
      <div className="flex justify-between items-center text-outline font-label-md text-label-md mt-3">
        <span>{timeAgoText}</span>
        <div className="flex items-center gap-2">
          {isActive && (
             <button 
               aria-label="Prepare for interview"
               className="text-primary hover:text-on-primary hover:bg-primary transition-colors font-label-lg font-semibold border border-primary-container bg-primary-container/20 px-4 py-1.5 rounded-lg shadow-sm"
             >
               Prep
             </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this job?')) {
                deleteApp(id);
              }
            }}
            disabled={isDeleting}
            className="text-on-surface-variant hover:text-error hover:bg-error/10 p-1.5 rounded-md transition-colors z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Delete Job"
            aria-label="Delete job application"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </Card>
  );
}
