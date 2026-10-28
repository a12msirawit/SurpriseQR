import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

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

  return createServerClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from Server Components where cookies cannot be set.
          }
        },
      },
    }
  );
}
