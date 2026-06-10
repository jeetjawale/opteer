import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      }
    });
    
    const contentType = res.headers.get("content-type") || "";
    
    // If it's HTML, we inject a <base> tag to fix relative links
    if (contentType.includes("text/html")) {
      let html = await res.text();
      const origin = new URL(url).origin;
      html = html.replace("<head>", `<head><base href="${origin}/">`);
      
      return new NextResponse(html, {
        headers: {
          "Content-Type": contentType,
          // We deliberately do NOT include X-Frame-Options or CSP so the iframe can render it
        }
      });
    }

    // For other assets, just pass through
    const blob = await res.blob();
    return new NextResponse(blob, {
      headers: { "Content-Type": contentType }
    });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
