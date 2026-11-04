/**
 * Sends signed-out visitors of the app pages to the landing page. Only checks that a session cookie
 * exists; API routes verify its signature (lib/server/session.ts).
 * Roadmap: K4.1 · Spec: ARCHITECTURE.md §4.1
 */

import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (req.cookies.has("stack_session")) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/fund/:path*", "/plan/:path*", "/history/:path*", "/settings/:path*"],
};
