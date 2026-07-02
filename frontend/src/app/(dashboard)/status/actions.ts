"use server";

export async function fetchServiceStatus(apiUrl: string) {
  try {
    const publicUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const internalUrl = process.env.INTERNAL_API_URL;
    
    let fetchUrl = apiUrl;
    if (internalUrl && apiUrl.startsWith(publicUrl)) {
      fetchUrl = apiUrl.replace(publicUrl, internalUrl);
    }

    const res = await fetch(fetchUrl, {
      cache: "no-store", // don't cache status
      headers: {
        "User-Agent": "Opteer-Status-Monitor/1.0",
        "Accept": "application/json"
      }
    });
    if (!res.ok) throw new Error("Failed to fetch");
    return { data: await res.json(), error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}
