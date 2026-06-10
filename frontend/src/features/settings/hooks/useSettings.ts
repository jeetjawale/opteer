import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';

interface UserSettings {
  id: string;
  user_id: string;
  notification_preferences?: any;
  created_at: string;
  updated_at: string;
  daily_analysis_credits?: number;
  max_daily_credits?: number;
  last_credit_reset?: string;
  active_llm_provider?: string;
  llm_providers_configured?: Record<string, boolean>;
  active_models?: Record<string, string>;
  base_urls?: Record<string, string>;
  task_models?: Record<string, string>;
  integration_providers_configured?: Record<string, boolean>;
  integration_keys?: Record<string, string>;
  auto_analyze_on_import?: boolean;
  generate_interview_prep?: boolean;
  auto_draft_cover_letters?: boolean;
}

export function useSettings() {
  const api = useApiClient();
  
  return useQuery<UserSettings>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
  });
}

export function useUpdateSettings() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (newSettings: Partial<UserSettings>) => 
      api.put('/settings', newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useValidateApiKey() {
  const api = useApiClient();
  
  return useMutation({
    mutationFn: ({ provider, api_key, base_url }: { provider: string; api_key: string; base_url?: string }) => 
      api.post(`/settings/llm/validate`, { provider, api_key, base_url }),
  });
}

export function useValidateIntegrationKey() {
  const api = useApiClient();
  
  return useMutation({
    mutationFn: ({ provider, api_key }: { provider: string; api_key: string }) => 
      api.post(`/settings/integrations/validate`, { provider, api_key }),
  });
}

export function useLlmModels(provider: string) {
  const api = useApiClient();
  
  return useQuery<{ models: any[] }>({
    queryKey: ['settings', 'llm', 'models', provider],
    queryFn: () => api.get(`/settings/llm/models?provider=${provider}`),
    enabled: !!provider,
  });
}


