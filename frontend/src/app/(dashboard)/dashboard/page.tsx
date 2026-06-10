import StatsRow from "@/features/dashboard/components/StatsRow";
import TopRecommendations from "@/features/dashboard/components/TopRecommendations";
import UpcomingEvents from "@/features/dashboard/components/UpcomingEvents";
import RecentActivity from "@/features/dashboard/components/RecentActivity";
import { PageHeader } from "@/components/ui/PageHeader";

export default function Home() {
  return (
    <main className="flex-1 p-lg w-full">
      {/* Dashboard Header */}
      <PageHeader 
        title="Dashboard" 
        subtitle="Here's a snapshot of your current pipeline."
        action={
          <div className="font-mono-data text-mono-data text-outline">
            Last updated: Just now
          </div>
        }
      />
      
      {/* Grid Layout */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* Main Content Column (Spans 9) */}
        <div className="col-span-9 flex flex-col gap-lg">
          <StatsRow />
          <TopRecommendations />
        </div>
        
        {/* Sidebar Content Column (Spans 3) */}
        <div className="col-span-3 flex flex-col gap-lg">
          <UpcomingEvents />
          <RecentActivity />
        </div>
      </div>
    </main>
  );
}
