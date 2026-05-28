import { supabase } from "./supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8085";

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
  notes?: string;
}

export async function getApplications(status?: string) {
  const url = status 
    ? `${API_BASE_URL}/applications?status=${encodeURIComponent(status)}` 
    : `${API_BASE_URL}/applications`;
    
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
  userApiKey?: string,
  signal?: AbortSignal
) {
  // Fallback to localStorage saved key if not provided dynamically
  const savedKey = typeof window !== "undefined" ? window.localStorage.getItem("jobpilot_api_key") : null;
  const activeKey = userApiKey !== undefined ? userApiKey : (savedKey || undefined);

  const headers: Record<string, string> = {};
  if (activeKey) {
    headers["X-User-Api-Key"] = activeKey;
  }

  const response = await fetchWithAuth(`${API_BASE_URL}/jobs/import`, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({ 
      url, 
      resume_text: resumeText, 
      scraped_jd: scrapedJd
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


export async function analyzeApplication(id: string, userApiKey?: string, signal?: AbortSignal) {
  // Fallback to localStorage saved key if not provided dynamically
  const savedKey = typeof window !== "undefined" ? window.localStorage.getItem("jobpilot_api_key") : null;
  const activeKey = userApiKey !== undefined ? userApiKey : (savedKey || undefined);

  const headers: Record<string, string> = {};
  if (activeKey) {
    headers["X-User-Api-Key"] = activeKey;
  }

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
}

export async function getUserSettings(): Promise<UserSettingsResponse> {
  const response = await fetchWithAuth(`${API_BASE_URL}/settings`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch settings: ${response.statusText}`);
  }
  return response.json();
}

export async function updateUserSettings(data: any) {
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
