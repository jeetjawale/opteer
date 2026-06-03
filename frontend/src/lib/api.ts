import { supabase } from "./supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  // Set Content-Type only if request has a body and is not a FormData upload
  if (init?.body && !(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  
  const mergedInit: RequestInit = {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers || {})
    }
  };
  
  const response = await fetch(url, mergedInit);
  
  // Handle expired/invalid sessions by redirecting to login page
  if (response.status === 401) {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
  
  return response;
}

export interface ApplicationUpdatePayload {
  status?: string;
  applied_at?: string;
  resume_text?: string;
  resume_file_url?: string;
  resume_file_name?: string;
  fit_score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  key_requirements?: string[];
  summary?: string;
  cover_letter?: string;
  interview_prep?: any;
  resume_edits?: any;
  notes?: string;
}

export async function getApplications(status?: string, page: number = 1, perPage: number = 50) {
  let url = `${API_BASE_URL}/applications?page=${page}&per_page=${perPage}`;
  if (status && status !== "all") {
    url += `&status=${encodeURIComponent(status)}`;
  }
    
  const response = await fetchWithAuth(url, { cache: "no-store" });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function getApplicationStats(timeWindow: string) {
  const url = `${API_BASE_URL}/applications/stats?time_window=${encodeURIComponent(timeWindow)}`;
  const response = await fetchWithAuth(url, { cache: "no-store" });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function getApplication(id: string) {
  const response = await fetchWithAuth(`${API_BASE_URL}/applications/${id}`, { cache: "no-store" });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function importJob(
  url: string,
  resumeText: string,
  scrapedJd?: string,
  autoAnalyze: boolean = false,
  signal?: AbortSignal
) {
  const headers: Record<string, string> = {};

  const response = await fetchWithAuth(`${API_BASE_URL}/jobs/import`, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({ 
      url, 
      resume_text: resumeText, 
      scraped_jd: scrapedJd,
      auto_analyze: autoAnalyze
    })
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function testLlmConnection(key: string) {
  const response = await fetchWithAuth(`${API_BASE_URL}/health/llm`, {
    method: "POST",
    headers: {
      "X-User-Api-Key": key
    }
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Connection test failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}


export async function analyzeApplication(id: string, signal?: AbortSignal) {
  const headers: Record<string, string> = {};

  const response = await fetchWithAuth(`${API_BASE_URL}/applications/${id}/analyze`, {
    method: "POST",
    headers,
    signal
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function updateApplication(id: string, data: ApplicationUpdatePayload) {
  const response = await fetchWithAuth(`${API_BASE_URL}/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function deleteApplication(id: string) {
  const response = await fetchWithAuth(`${API_BASE_URL}/applications/${id}`, {
    method: "DELETE"
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

export async function parseResume(formData: FormData) {
  const response = await fetchWithAuth(`${API_BASE_URL}/jobs/parse-resume`, {
    method: "POST",
    body: formData
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function getReminders(applicationId?: string) {
  const url = applicationId
    ? `${API_BASE_URL}/reminders?application_id=${encodeURIComponent(applicationId)}`
    : `${API_BASE_URL}/reminders`;
    
  const response = await fetchWithAuth(url, { cache: "no-store" });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function createReminder(data: { application_id: string; type: string; due_at: string; note?: string }) {
  const response = await fetchWithAuth(`${API_BASE_URL}/reminders`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function updateReminder(id: string, data: { type?: string; due_at?: string; note?: string; is_completed?: boolean }) {
  const response = await fetchWithAuth(`${API_BASE_URL}/reminders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function deleteReminder(id: string) {
  const response = await fetchWithAuth(`${API_BASE_URL}/reminders/${id}`, {
    method: "DELETE"
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

// ============================================
// RESUME CRUD API WRAPPERS
// ============================================

export async function getResumes() {
  const response = await fetchWithAuth(`${API_BASE_URL}/resumes?_t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function createResume(data: { name: string; content: string; file_url?: string; file_name?: string }) {
  const response = await fetchWithAuth(`${API_BASE_URL}/resumes`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function getResume(id: string) {
  const response = await fetchWithAuth(`${API_BASE_URL}/resumes/${id}`, { cache: "no-store" });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function updateResume(id: string, data: { name?: string; content?: string; file_url?: string; file_name?: string }) {
  const response = await fetchWithAuth(`${API_BASE_URL}/resumes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function deleteResume(id: string) {
  const response = await fetchWithAuth(`${API_BASE_URL}/resumes/${id}`, {
    method: "DELETE"
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

export async function deleteResumeFile(id: string) {
  const response = await fetchWithAuth(`${API_BASE_URL}/resumes/${id}/file`, {
    method: "DELETE"
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export interface UserSettingsResponse {
  id: string;
  user_id: string;
  updated_at: string;
  model_default?: string;
  model_fit?: string;
  model_letter?: string;
  model_prep?: string;
  model_tailor?: string;
  onboarding_completed?: boolean;
  onboarding_step?: string;
  has_saved_key: boolean;
  daily_analysis_credits?: number;
  max_daily_credits?: number;
  last_credit_reset?: string;
}

export async function getUserSettings(): Promise<UserSettingsResponse> {
  const response = await fetchWithAuth(`${API_BASE_URL}/settings`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch settings: ${response.statusText}`);
  }
  return response.json();
}

export async function updateUserSettings(data: Partial<Omit<UserSettingsResponse, 'id' | 'user_id' | 'updated_at'>>) {
  const response = await fetchWithAuth(`${API_BASE_URL}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to update settings: ${response.statusText}`);
  }
  return response.json();
}

export async function getApiKeyStatus() {
  const response = await fetchWithAuth(`${API_BASE_URL}/settings/api-key`, { cache: "no-store" });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function updateApiKey(apiKey: string, provider?: string) {
  const response = await fetchWithAuth(`${API_BASE_URL}/settings/api-key`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, provider }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}
