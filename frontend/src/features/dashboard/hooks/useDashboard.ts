import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';

interface DashboardStats {
  total_applications: number;
  active_interviews: number;
  avg_fit_score: number;
  offers_received: number;
}

interface RecentActivityItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  timestamp: string;
  metadata?: any;
}

interface DashboardOverviewResponse {
  stats: DashboardStats;
  recent_activity: RecentActivityItem[];
  top_recommendations: Record<string, any>[];
  upcoming_events: Record<string, any>[];
}

export function useDashboardOverview() {
  const api = useApiClient();
  
  return useQuery<DashboardOverviewResponse>({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => api.get('/dashboard/overview'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
