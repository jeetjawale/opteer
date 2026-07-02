"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SideNavBarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function SideNavBar({ isCollapsed, setIsCollapsed }: SideNavBarProps) {
  const pathname = usePathname();

  return (
    <nav 
      className={`bg-surface/80 backdrop-blur-md dark:bg-inverse-surface/80 h-screen fixed left-0 top-0 border-r border-outline-variant dark:border-outline flex flex-col pt-lg pb-0 z-40 transition-all duration-300 ${
        isCollapsed ? 'w-[72px] px-sm items-center' : 'w-56 px-md'
      }`}
    >
      <div className={`flex items-center gap-sm mb-xl ${isCollapsed ? 'justify-center w-full px-0' : 'px-sm'}`}>
        <span className="material-symbols-outlined text-primary text-[32px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>api</span>
        {!isCollapsed && (
          <div className="whitespace-nowrap overflow-hidden transition-all duration-300">
            <h1 className="font-headline-md text-headline-md font-bold text-primary dark:text-inverse-primary leading-none">Opteer</h1>

          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col gap-sm w-full">
        <Link href="/dashboard" title="Dashboard" className={`flex items-center gap-md py-sm rounded font-body-sm text-body-sm transition-colors duration-150 transform active:scale-[0.98] ${
          pathname === '/dashboard' || pathname === '/' 
            ? 'bg-primary-container/10 text-primary dark:text-inverse-primary' 
            : 'text-on-surface-variant dark:text-outline-variant hover:bg-surface-container dark:hover:bg-surface-variant'
        } ${isCollapsed ? 'justify-center px-0' : 'px-md'}`}>
          <span className="material-symbols-outlined text-[20px] shrink-0">dashboard</span>
          {!isCollapsed && <span className="whitespace-nowrap">Dashboard</span>}
        </Link>
        
        <Link href="/discover" title="Search Jobs" className={`flex items-center gap-md py-sm rounded font-body-sm text-body-sm transition-colors duration-150 transform active:scale-[0.98] ${
          pathname.startsWith('/discover')
            ? 'bg-primary-container/10 text-primary dark:text-inverse-primary'
            : 'text-on-surface-variant dark:text-outline-variant hover:bg-surface-container dark:hover:bg-surface-variant'
        } ${isCollapsed ? 'justify-center px-0' : 'px-md'}`}>
          <span className="material-symbols-outlined text-[20px] shrink-0">search</span>
          {!isCollapsed && <span className="whitespace-nowrap">Search Jobs</span>}
        </Link>
        
        <Link href="/jobs" title="Saved Jobs" className={`flex items-center gap-md py-sm rounded font-body-sm text-body-sm transition-colors duration-150 transform active:scale-[0.98] ${
          pathname.startsWith('/jobs')
            ? 'bg-primary-container/10 text-primary dark:text-inverse-primary'
            : 'text-on-surface-variant dark:text-outline-variant hover:bg-surface-container dark:hover:bg-surface-variant'
        } ${isCollapsed ? 'justify-center px-0' : 'px-md'}`}>
          <span className="material-symbols-outlined text-[20px] shrink-0">work</span>
          {!isCollapsed && <span className="whitespace-nowrap">Saved Jobs</span>}
        </Link>
        
        <Link href="/applications" title="Applications" className={`flex items-center gap-md py-sm rounded font-body-sm text-body-sm transition-colors duration-150 transform active:scale-[0.98] ${
          pathname === '/applications'
            ? 'bg-primary-container/10 text-primary dark:text-inverse-primary'
            : 'text-on-surface-variant dark:text-outline-variant hover:bg-surface-container dark:hover:bg-surface-variant'
        } ${isCollapsed ? 'justify-center px-0' : 'px-md'}`}>
          <span className="material-symbols-outlined text-[20px] shrink-0">fact_check</span>
          {!isCollapsed && <span className="whitespace-nowrap">Applications</span>}
        </Link>
        
        <Link href="/resumes" title="Resumes" className={`flex items-center gap-md py-sm rounded font-body-sm text-body-sm transition-colors duration-150 transform active:scale-[0.98] ${
          pathname === '/resumes'
            ? 'bg-primary-container/10 text-primary dark:text-inverse-primary'
            : 'text-on-surface-variant dark:text-outline-variant hover:bg-surface-container dark:hover:bg-surface-variant'
        } ${isCollapsed ? 'justify-center px-0' : 'px-md'}`}>
          <span className="material-symbols-outlined text-[20px] shrink-0">article</span>
          {!isCollapsed && <span className="whitespace-nowrap">Resumes</span>}
        </Link>
        
        <Link href="/settings" title="Settings" className={`flex items-center gap-md py-sm rounded font-body-sm text-body-sm transition-colors duration-150 transform active:scale-[0.98] ${
          pathname === '/settings'
            ? 'bg-primary-container/10 text-primary dark:text-inverse-primary'
            : 'text-on-surface-variant dark:text-outline-variant hover:bg-surface-container dark:hover:bg-surface-variant'
        } ${isCollapsed ? 'justify-center px-0' : 'px-md'}`}>
          <span className="material-symbols-outlined text-[20px] shrink-0">settings</span>
          {!isCollapsed && <span className="whitespace-nowrap">Settings</span>}
        </Link>

      </div>

      <div className={`mt-auto border-t border-outline-variant h-20 w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors flex items-center justify-center focus:outline-none"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <span className="material-symbols-outlined">
            {isCollapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
          </span>
        </button>
      </div>
    </nav>
  );
}
