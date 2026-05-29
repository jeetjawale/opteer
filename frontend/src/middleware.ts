import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.delete(name);
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.delete({ name, ...options });
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Protect authenticated application areas and sub-routes
  if (
    path.startsWith("/applications") ||
    path.startsWith("/resumes") ||
    path.startsWith("/settings")
  ) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Prevent logged-in users from visiting auth pages
  if (path === "/login" || path === "/signup") {
    if (user) {
      return NextResponse.redirect(new URL("/applications", request.url));
    }
  }

  // Redirect root page to applications
  if (path === "/") {
    return NextResponse.redirect(new URL("/applications", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/applications/:path*",
    "/resumes/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
  ],
};
