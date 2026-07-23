import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const session = request.cookies.get("admin_session");
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/login";

  // If user is NOT logged in and trying to access a protected route
  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If user is already logged in and trying to access the login page
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Protect all routes EXCEPT API routes, static assets, next internals, etc.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
