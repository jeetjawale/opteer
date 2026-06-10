"use server";

export async function fetchServiceStatus(apiUrl: string) {
  try {
    const res = await fetch(apiUrl, {
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
