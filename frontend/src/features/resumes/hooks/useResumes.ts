import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/lib/api-client';

export interface Resume {
  id: string;
  name: string;
  preview: string;
  file_url?: string | null;
  file_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResumePaginatedResponse {
  items: Resume[];
  total: number;
  page: number;
  per_page: number;
}

export function useResumes(page: number = 1, perPage: number = 50) {

  
  return useQuery<ResumePaginatedResponse>({
    queryKey: ['resumes', page, perPage],
    queryFn: () => api.get(`/resumes?page=${page}&per_page=${perPage}`),
  });
}

export function useResumeText(resumeId: string | null, enabled = false) {


  return useQuery<{
    id: string;
    name: string;
    content: string;
    file_name?: string | null;
    updated_at: string;
  } | null>({
    queryKey: ['resumes', 'text', resumeId],
    enabled: enabled && !!resumeId,
    queryFn: async () => {
      if (!resumeId) return null;
      
      const fullResume = await api.get(`/resumes/${resumeId}`);

      if (!fullResume?.content) {
        return null;
      }

      return {
        id: fullResume.id,
        name: fullResume.name,
        content: fullResume.content,
        file_name: fullResume.file_name,
        updated_at: fullResume.updated_at,
      };
    },
  });
}

export function useUploadResume() {

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.postFormData('/resumes/upload', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
  });
}

export function useDeleteResume() {

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resumeId: string) => api.delete(`/resumes/${resumeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
  });
}

export function useUpdateResume() {

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ resumeId, name }: { resumeId: string; name: string }) => 
      api.patch(`/resumes/${resumeId}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
  });
}
