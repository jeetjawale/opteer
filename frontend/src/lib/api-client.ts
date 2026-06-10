const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function useApiClient() {
  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);

    
    // Only set Content-Type to application/json if it's not explicitly omitted or overridden
    if (!options.headers || !('Content-Type' in options.headers)) {
      headers.set('Content-Type', 'application/json');
    } else if (headers.get('Content-Type') === 'multipart/form-data') {
      // Browser must set the boundary automatically for multipart/form-data, so delete it
      headers.delete('Content-Type');
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch (e) {
        // ignore JSON parse error
      }
      throw new Error(errorMessage);
    }

    // Sometimes DELETE returns 204 No Content
    if (response.status === 204) return null;

    return response.json();
  };

  return {
    get: (endpoint: string) => fetchWithAuth(endpoint),
    post: (endpoint: string, body: any) => fetchWithAuth(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    postFormData: (endpoint: string, formData: FormData) => fetchWithAuth(endpoint, { 
      method: 'POST', 
      body: formData,
      headers: { 'Content-Type': 'multipart/form-data' } // Sentinel value to be stripped
    }),
    patch: (endpoint: string, body: any) => fetchWithAuth(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
    put: (endpoint: string, body: any) => fetchWithAuth(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (endpoint: string) => fetchWithAuth(endpoint, { method: 'DELETE' }),
  };
}
