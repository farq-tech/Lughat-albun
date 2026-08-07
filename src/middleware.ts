import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_STAFF = ["/staff/login"];
const PUBLIC_ADMIN = ["/admin/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isStaffRoute = pathname.startsWith("/staff");
  const isAdminRoute = pathname.startsWith("/admin");

  if (!isStaffRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  const isPublic =
    PUBLIC_STAFF.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    PUBLIC_ADMIN.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const loginPath = isAdminRoute ? "/admin/login" : "/staff/login";
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isPublic) {
    const dest = isAdminRoute ? "/admin" : "/staff";
    const url = request.nextUrl.clone();
    url.pathname = dest;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/staff/:path*", "/admin/:path*"],
};
