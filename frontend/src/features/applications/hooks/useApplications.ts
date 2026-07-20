import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/lib/api-client';
import { Application, ImportJobRequest, ImportJobResponse } from '../types';

export function useApplications() {
  return useQuery<Application[]>({
    queryKey: ['applications'],
    queryFn: () => api.get<Application[]>('/applications'),
  });
}

export function useApplicationAnalysis(id: string) {
  return useQuery<Application>({
    queryKey: ['applications', id],
    queryFn: () => api.get<Application>(`/applications/${id}`),
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
  
  return useMutation<Application, Error, { id: string; status: string }, { previousApps: Application[] | undefined }>({
    mutationFn: ({ id, status }) => 
      api.patch<Application, { status: string }>(`/applications/${id}`, { status }),
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
  
  return useMutation<Application, Error, { id: string; payload: Partial<Application> }>({
    mutationFn: ({ id, payload }) => 
      api.patch<Application, Partial<Application>>(`/applications/${id}`, payload),
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
    mutationFn: (payload) => api.post<ImportJobResponse, ImportJobRequest>('/jobs/import', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRerunAnalysis() {
  const queryClient = useQueryClient();

  return useMutation<Application, Error, string>({
    mutationFn: (id: string) => api.post<Application, Record<string, never>>(`/applications/${id}/analyze`, {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['applications', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => api.delete<void>(`/applications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRewriteCoverLetter() {
  return useMutation<{ rewritten_text: string }, Error, { id: string; payload: { selected_text: string; full_context: string; instruction: string } }>({
    mutationFn: ({ id, payload }) => 
      api.post<{ rewritten_text: string }, { selected_text: string; full_context: string; instruction: string }>(`/applications/${id}/rewrite-cover-letter`, payload),
  });
}


