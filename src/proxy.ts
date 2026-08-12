import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Viewers can't access POST/PUT/DELETE API routes
    if (path.startsWith("/api") && req.method !== "GET") {
      if (!token || token.role === "VIEWER") {
        return new NextResponse("Unauthorized", { status: 403 });
      }
    }

    // Admins only routes
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/inventory/:path*",
    "/api/orders/:path*",
  ],
};
