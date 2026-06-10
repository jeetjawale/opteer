"use client";

import { Search, Clock } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { format } from "date-fns";

const OPEN_IMPORT_EVENT = "opteer:open-job-import-modal";

export default function TopNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // update every second for live time
    return () => clearInterval(interval);
  }, []);

  const handleAddPosting = () => {
    window.dispatchEvent(new Event(OPEN_IMPORT_EVENT));
  };

  return (
    <header className="bg-surface dark:bg-inverse-surface w-full sticky top-0 z-30 border-b border-outline-variant dark:border-outline shadow-sm flex justify-between items-center px-lg py-md">
      <div className="flex-1 max-w-4xl">
        <div className="relative flex items-center group">
          <Search size={18} className="absolute left-3 text-on-surface-variant group-focus-within:text-primary transition-colors" />
          <input 
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2 pl-10 pr-4 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-on-surface-variant text-on-surface" 
            placeholder="Search jobs, companies..." 
            type="text" 
          />
        </div>
      </div>
      <div className="flex items-center gap-md ml-auto">
        <button
          onClick={handleAddPosting}
          className="bg-primary-container text-on-primary font-body-sm text-body-sm py-xs px-md rounded hover:bg-primary transition-colors shadow-sm flex items-center gap-xs"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Posting
        </button>
        <button
          onClick={() => router.push('/status')}
          className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors flex items-center gap-xs"
        >
          <span className="material-symbols-outlined text-[18px]">dns</span>
          API Status
        </button>
        {currentTime && (
          <div className="hidden sm:flex items-center gap-xs font-mono-data text-body-sm text-on-surface-variant border-l border-outline-variant pl-md ml-xs">
            <Clock size={16} />
            {format(currentTime, "MMM dd, yyyy • HH:mm")}
          </div>
        )}
      </div>
    </header>
  );
}
