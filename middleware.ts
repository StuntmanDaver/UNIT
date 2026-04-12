import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isPortalRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/promotions') ||
    request.nextUrl.pathname.startsWith('/success') ||
    request.nextUrl.pathname.startsWith('/settings');

  if (isPortalRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  if (isPortalRoute && user) {
    const { data: profile } = await supabase
      .from('advertiser_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const signupUrl = request.nextUrl.clone();
      signupUrl.pathname = '/signup';
      return NextResponse.redirect(signupUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/dashboard/:path*', '/promotions/:path*', '/success/:path*', '/settings/:path*'],
};
