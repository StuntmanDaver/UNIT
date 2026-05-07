import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
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

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isPortalRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/promotions') ||
    request.nextUrl.pathname.startsWith('/success') ||
    request.nextUrl.pathname.startsWith('/settings');

  if ((isAdminRoute || isPortalRoute) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  if ((isAdminRoute || isPortalRoute) && user) {
    // Use service role to bypass RLS — user identity already verified above via getUser()
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (isAdminRoute) {
      const { data: adminProfile } = await serviceClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (adminProfile?.role !== 'landlord') {
        const dashboardUrl = request.nextUrl.clone();
        dashboardUrl.pathname = '/dashboard';
        return NextResponse.redirect(dashboardUrl);
      }

      return supabaseResponse;
    }

    const { data: profile } = await serviceClient
      .from('advertiser_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const { data: adminProfile } = await serviceClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (adminProfile?.role === 'landlord') {
        const adminUrl = request.nextUrl.clone();
        adminUrl.pathname = '/admin';
        return NextResponse.redirect(adminUrl);
      }

      const signupUrl = request.nextUrl.clone();
      signupUrl.pathname = '/signup';
      return NextResponse.redirect(signupUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/promotions/:path*', '/success/:path*', '/settings/:path*'],
};
