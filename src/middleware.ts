import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/", "/login", "/register", "/forgot-password", "/verify-otp"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: any;
          }>
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.includes(path);
  const isAdminPath = path.startsWith("/admin");
  const isAdminLogin = path === "/admin/login";

  // 1. Super Admin Protection:
  if (isAdminPath && !isAdminLogin) {
    const superAdminAuth = request.cookies.get("superAdminAuth")?.value === "true";
    if (!superAdminAuth) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // 2. Owner & Member Protection:
  if (!user && !isPublic && !isAdminPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. Member Onboarding Protection:
  if (user && (path.startsWith("/dashboard") || path === "/onboarding")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, approval_status, height, weight, gym_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "member" && profile.approval_status === "active") {
      const needsOnboarding = profile.gym_id === null || profile.height === null || profile.weight === null;
      if (needsOnboarding && path !== "/onboarding") {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      } else if (!needsOnboarding && path === "/onboarding") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)"],
};
