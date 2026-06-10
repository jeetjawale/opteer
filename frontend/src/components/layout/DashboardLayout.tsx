"use client";

import { useState } from "react";
import SideNavBar from "./SideNavBar";
import TopNavBar from "./TopNavBar";
import ImportJobModal from "@/features/applications/components/ImportJobModal";

export default function DashboardLayout({
  children,
  defaultCollapsed = false,
}: {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const handleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    document.cookie = `sidebarCollapsed=${collapsed}; path=/; max-age=31536000`;
  };

  return (
    <div className="flex overflow-hidden min-h-screen w-full">
      <SideNavBar isCollapsed={isCollapsed} setIsCollapsed={handleCollapse} />
      <div 
        className={`flex-1 flex flex-col transition-all duration-300 min-h-screen overflow-y-auto ${
          isCollapsed ? "ml-[72px]" : "ml-56"
        }`}
      >
        <TopNavBar />
        {children}
        <ImportJobModal />
      </div>
    </div>
  );
}
