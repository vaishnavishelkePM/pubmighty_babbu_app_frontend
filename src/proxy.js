import { NextResponse } from 'next/server';

export default async function proxy(req) {
  const { pathname } = req.nextUrl;

  // Allow auth pages
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/logout')
  ) {
    return NextResponse.next();
  }

  // Protect dashboard
  if (pathname.startsWith('/dashboard')) {
    const token = req.cookies.get('session_key')?.value;
    console.log('MIDDLEWARE token:', token ? 'YES' : 'NO');
    if (!token) {
      return redirectToLogin(req);
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/v1/admin/verify-session`, {
        method: 'GET',
        headers: {
          authorization: `Bearer ${token}`,
          accept: 'application/json',
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        return redirectToLogin(req);
      }

      const data = await res.json();

      if (!data?.success) {
        return redirectToLogin(req);
      }
    } catch (err) {
      return redirectToLogin(req);
    }
  }

  return NextResponse.next();
}

function redirectToLogin(req) {
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', req.nextUrl.pathname);

  const res = NextResponse.redirect(url);

  // clear cookies to prevent loop
  res.cookies.set('session_key', '', { maxAge: 0, path: '/' });
  res.cookies.set('session_exp', '', { maxAge: 0, path: '/' });

  return res;
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
