import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CONFIG } from "@/constants/config";

const PUBLIC_PATHS = [
  "/",
  "/prices",
  "/stores",
  "/complaints",
  "/blogs",
  "/pages",
];

const AUTH_PATHS = ["/login", "/otp"];

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/admin",
  "/province",
  "/chamber",
  "/union",
  "/store",
  "/inspector",
  "/customer",
];

const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

const isAuthPath = (pathname: string): boolean =>
  AUTH_PATHS.some((p) => pathname.startsWith(p));

const isProtectedPath = (pathname: string): boolean =>
  PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken  = request.cookies.get(CONFIG.ACCESS_TOKEN_KEY)?.value;
  const hasToken     = Boolean(accessToken);

  // صفحات Auth
  if (isAuthPath(pathname)) {
    if (hasToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // صفحات Protected
  if (isProtectedPath(pathname)) {
    if (!hasToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // صفحات Public و بقیه
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icons|images|fonts).*)",
  ],
};