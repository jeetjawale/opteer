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
    <aside className="w-[200px] bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between h-screen sticky top-0 text-zinc-400 select-none">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="p-5 flex items-center space-x-2 border-b border-zinc-800/50">
          <Sparkles className="w-5 h-5 text-white" />
          <span className="text-white font-bold tracking-tight text-lg">JobPilot</span>
        </div>

        {/* Navigation Section */}
        <nav className="p-4 space-y-6">
          {/* Main Links */}
          <div className="space-y-1">
            <Link 
              href="/applications"
              className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isApplicationsActive 
                  ? "bg-zinc-800 text-white font-medium" 
                  : "hover:bg-zinc-800/40 hover:text-zinc-200"
              }`}
            >
              <List className="w-4 h-4" />
              <span>Applications</span>
            </Link>

            <Link 
              href="#"
              className="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm hover:bg-zinc-800/40 hover:text-zinc-200 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </Link>

            <Link 
              href="#"
              className="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm hover:bg-zinc-800/40 hover:text-zinc-200 transition-colors"
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
              className="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm hover:bg-zinc-800/40 hover:text-zinc-200 transition-colors"
            >
              <Cpu className="w-4 h-4" />
              <span>Analyze Fit</span>
            </Link>

            <Link 
              href="/applications" 
              className="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm hover:bg-zinc-800/40 hover:text-zinc-200 transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Cover Letters</span>
            </Link>

            <Link 
              href="/applications" 
              className="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm hover:bg-zinc-800/40 hover:text-zinc-200 transition-colors"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Interview Prep</span>
            </Link>
          </div>
        </nav>
      </div>

      {/* Settings / Sign Out Pinned to Bottom */}
      <div className="p-4 border-t border-zinc-800/50 space-y-1">
        <Link 
          href="/settings"
          className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left ${
            pathname === "/settings"
              ? "bg-zinc-800 text-white font-medium"
              : "hover:bg-zinc-800/40 hover:text-zinc-200"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>
        <button 
          onClick={handleSignOut}
          className="flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm hover:bg-red-950/30 hover:text-red-400 transition-colors w-full text-left"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
