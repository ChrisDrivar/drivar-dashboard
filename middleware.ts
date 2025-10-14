import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const USERNAME = process.env.BASIC_AUTH_USER;
const PASSWORD = process.env.BASIC_AUTH_PASSWORD;

export function middleware(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const [user, pass] = auth ? atob(auth.split(' ')[1]).split(':') : [];

  if (USERNAME && PASSWORD && user === USERNAME && pass === PASSWORD) {
    return NextResponse.next();
  }

  return new NextResponse('Auth required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="DRIVAR Dashboard"' },
  });
}

export const config = {
  matcher: ['/(.*)'],
};
