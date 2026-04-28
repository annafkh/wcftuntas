import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { findUserById } from "@/lib/data";
import { getDefaultRoute } from "@/lib/rbac";

const protectedPrefixes = ["/dashboard", "/tasks", "/calendar", "/approval", "/history", "/users", "/partners"];
const passwordResetPath = "/change-password";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!token && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!token) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(token);

  if (!session && isProtected) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  const user = session ? await findUserById(session.userId) : null;

  if (!user && isProtected) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  if (user?.mustChangePassword && pathname !== passwordResetPath) {
    return NextResponse.redirect(new URL(passwordResetPath, request.url));
  }

  if (session && pathname === "/login") {
    return NextResponse.redirect(
      new URL(user?.mustChangePassword ? passwordResetPath : getDefaultRoute(user?.role ?? session.role), request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/change-password",
    "/dashboard/:path*",
    "/tasks/:path*",
    "/calendar/:path*",
    "/approval/:path*",
    "/history/:path*",
    "/users/:path*",
    "/partners/:path*",
  ],
};
