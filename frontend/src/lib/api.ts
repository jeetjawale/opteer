import { supabase } from "./supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8085";

async function getHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}

export interface ApplicationUpdatePayload {
  status?: string;
  notes?: string;
}

export async function getApplications(status?: string) {
  const headers = await getHeaders();
  const url = status 
    ? `${API_BASE_URL}/applications?status=${encodeURIComponent(status)}` 
    : `${API_BASE_URL}/applications`;
    
  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function getApplication(id: string) {
  const headers = await getHeaders();
  const response = await fetch(`${API_BASE_URL}/applications/${id}`, { headers, cache: "no-store" });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function importJob(url: string, resumeText: string) {
  const headers = await getHeaders();
  const response = await fetch(`${API_BASE_URL}/jobs/import`, {
    method: "POST",
    headers,
    body: JSON.stringify({ url, resume_text: resumeText })
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function analyzeApplication(id: string) {
  const headers = await getHeaders();
  const response = await fetch(`${API_BASE_URL}/applications/${id}/analyze`, {
    method: "POST",
    headers
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function updateApplication(id: string, data: ApplicationUpdatePayload) {
  const headers = await getHeaders();
  const response = await fetch(`${API_BASE_URL}/applications/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.json();
}

export async function deleteApplication(id: string) {
  const headers = await getHeaders();
  const response = await fetch(`${API_BASE_URL}/applications/${id}`, {
    method: "DELETE",
    headers
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errData.detail || `HTTP error ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}
