import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/jwt';

const BRAND_PREFIXES = ['/dashboard', '/inventory', '/customers', '/sales', '/invoices', '/expenses', '/reports', '/settings'];
const ADMIN_PREFIXES = ['/admin'];
const AUTH_PAGES = ['/login', '/signup'];

function matchesArea(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  const isBrandArea = matchesArea(pathname, BRAND_PREFIXES);
  const isAdminArea = matchesArea(pathname, ADMIN_PREFIXES);
  const isAuthPage = AUTH_PAGES.includes(pathname);

  // Unauthenticated users are sent to login with a "next" hint.
  if ((isBrandArea || isAdminArea) && !session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Already signed in? Skip the auth pages and land in the right area.
  if (session && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = session.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Keep the two areas separate per role.
  if (session && isBrandArea && session.role === 'SUPER_ADMIN') {
    const url = req.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';
    return NextResponse.redirect(url);
  }
  if (session && isAdminArea && session.role !== 'SUPER_ADMIN') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/signup',
    '/dashboard/:path*',
    '/inventory/:path*',
    '/customers/:path*',
    '/sales/:path*',
    '/invoices/:path*',
    '/expenses/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/admin/:path*',
  ],
};
