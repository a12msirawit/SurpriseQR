import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
    console.error('❌ Supabase URL is missing or using placeholder. Please set NEXT_PUBLIC_SUPABASE_URL in .env.local');
  }
  
  if (!supabaseAnonKey || supabaseAnonKey === 'placeholder-anon-key') {
    console.error('❌ Supabase Anon Key is missing or using placeholder. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase client cannot be initialized. Auth calls will fail.');
  }

  const supabase = createServerClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}
