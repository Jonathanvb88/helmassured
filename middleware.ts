import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    pages: { signIn: '/login' },
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
  }
);

// Everything requires a session EXCEPT:
// - /login and its API
// - /api/auth/* (NextAuth's own routes)
// - /portal/* and /api/portal/* — the client-facing portal uses its own
//   token-based access control, not staff session auth, by design.
export const config = {
  matcher: [
    '/((?!login|api/auth|portal|api/portal|_next/static|_next/image|favicon.ico).*)',
  ],
};
