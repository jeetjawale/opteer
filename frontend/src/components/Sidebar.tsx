"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Sparkles, 
  List, 
  BarChart3, 
  FileText, 
  Cpu, 
  Mail, 
  GraduationCap, 
  Settings,
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isApplicationsActive = pathname.startsWith("/applications");

  return (
    <aside 
      className="w-[200px] bg-surface border-r border-border-default flex flex-col justify-between h-screen sticky top-0 text-secondary select-none"
      style={{ background: "linear-gradient(180deg, rgba(249,115,22,0.04) 0%, var(--bg-surface) 120px)" }}
    >
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="p-5 flex items-center space-x-2.5 border-b border-border-subtle">
          <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
          <span className="text-primary font-bold tracking-tight text-lg">JobPilot</span>
        </div>

        {/* Navigation Section */}
        <nav className="p-4 space-y-6">
          {/* Main Links */}
          <div className="space-y-1">
            <Link 
              href="/applications"
              className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm transition-colors border-l-[2px] ${
                isApplicationsActive 
                  ? "bg-accent-dim text-primary font-medium border-accent" 
                  : "hover:bg-elevated hover:text-primary border-transparent"
              }`}
            >
              <List className="w-4 h-4" />
              <span>Applications</span>
            </Link>

            <Link 
              href="/analytics"
              className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm transition-colors border-l-[2px] ${
                pathname.startsWith("/analytics")
                  ? "bg-accent-dim text-primary font-medium border-accent"
                  : "hover:bg-elevated hover:text-primary border-transparent"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </Link>

            <Link 
              href="/resumes"
              className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm transition-colors border-l-[2px] ${
                pathname.startsWith("/resumes")
                  ? "bg-accent-dim text-primary font-medium border-accent"
                  : "hover:bg-elevated hover:text-primary border-transparent"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>My Resume</span>
            </Link>
          </div>

          {/* AI Tools Section */}
          <div className="space-y-1.5">
            <div className="px-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              AI Tools
            </div>
            
            <Link 
              href="/applications" 
              className="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm hover:bg-elevated hover:text-primary transition-colors border-l-[2px] border-transparent"
            >
              <Cpu className="w-4 h-4" />
              <span>Analyze Fit</span>
            </Link>

            <Link 
              href="/applications" 
              className="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm hover:bg-elevated hover:text-primary transition-colors border-l-[2px] border-transparent"
            >
              <Mail className="w-4 h-4" />
              <span>Cover Letters</span>
            </Link>

            <Link 
              href="/applications" 
              className="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm hover:bg-elevated hover:text-primary transition-colors border-l-[2px] border-transparent"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Interview Prep</span>
            </Link>
          </div>
        </nav>
      </div>

      {/* Settings / Sign Out Pinned to Bottom */}
      <div className="p-4 space-y-1 relative">
        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, var(--border-default), transparent)" }}></div>
        <Link 
          href="/settings"
          className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left border-l-[2px] ${
            pathname === "/settings"
              ? "bg-accent-dim text-primary font-medium border-accent"
              : "hover:bg-elevated hover:text-primary border-transparent"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>
        <button 
          onClick={handleSignOut}
          className="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm hover:bg-red-950/30 hover:text-red-400 transition-colors w-full text-left border-l-[2px] border-transparent"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
