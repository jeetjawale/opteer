import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/lib/api-client';

interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  location?: string;
  work_model?: string;
  
  // AI Analysis Fields
  fit_score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  key_requirements?: string[];
  summary?: string;
  cover_letter?: string;
  interview_prep?: any;
  resume_edits?: any;
  
  // Flat-mapped Job Fields
  company?: string;
  company_logo?: string;
  role?: string;
  url?: string;
  company_research?: string;
  scraped_jd?: string;
  
  // Analysis Metadata
  analyzed_at?: string;
  analysis_status?: string;
  analysis_error?: string;
  
  // Quality Gate
  is_quality_gated?: boolean;
  quality_gate_reason?: string | null;
  
  // Job Input
  resume_text?: string;
  resume_file_name?: string;
  resume_file_url?: string;
}

interface ImportJobRequest {
  url: string;
  resume_text: string;
  resume_file_name?: string;
  scraped_jd?: string;
  logo_url?: string;
  auto_analyze?: boolean;
}

interface ImportJobResponse {
  application_id: string;
  job_id: string;
  company?: string | null;
  status: string;
  analysis_status: string;
  analysis_error?: string | null;
  auto_analyze: boolean;
}

export function useApplications() {

  
  return useQuery<Application[]>({
    queryKey: ['applications'],
    queryFn: () => api.get('/applications'),
  });
}

export function useApplicationAnalysis(id: string) {

  
  return useQuery<Application>({
    queryKey: ['applications', id],
    queryFn: () => api.get(`/applications/${id}`),
    enabled: !!id,
    refetchInterval: (query) => {
      const app = query.state.data;
      if (app && (app.analysis_status === 'queued' || app.analysis_status === 'processing')) {
        return 3000; // poll every 3 seconds while analyzing
      }
      return false; // don't poll otherwise
    },
  });
}

export function useUpdateApplicationStatus() {

  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      api.patch(`/applications/${id}`, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['applications'] });
      const previousApps = queryClient.getQueryData<Application[]>(['applications']);

      if (previousApps) {
        queryClient.setQueryData<Application[]>(['applications'], old => 
          old ? old.map(app => app.id === id ? { ...app, status, updated_at: new Date().toISOString() } : app) : []
        );
      }

      return { previousApps };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousApps) {
        queryClient.setQueryData(['applications'], context.previousApps);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateApplication() {

  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => 
      api.patch(`/applications/${id}`, payload),
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['applications', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useImportJob() {

  const queryClient = useQueryClient();

  return useMutation<ImportJobResponse, Error, ImportJobRequest>({
    mutationFn: (payload) => api.post('/jobs/import', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRerunAnalysis() {

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post(`/applications/${id}/analyze`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['applications', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteApplication() {

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/applications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRewriteCoverLetter() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { selected_text: string; full_context: string; instruction: string } }) => 
      api.post(`/applications/${id}/rewrite-cover-letter`, payload),
  });
}

