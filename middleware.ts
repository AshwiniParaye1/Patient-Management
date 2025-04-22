//middleware.ts

import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Define paths that are considered public
  const publicPaths = ["/", "/auth/signin"];
  const isPublicPath = publicPaths.includes(path);

  // Get the authentication token
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET
  });

  // Redirect logic
  if (!token && !isPublicPath) {
    // Redirect to signin page if trying to access a protected route without a token
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  return NextResponse.next();
}

// Only run middleware on the following paths
export const config = {
  matcher: [
    // Add paths that you want to protect with authentication
    "/drive/:path*"
  ]
};
