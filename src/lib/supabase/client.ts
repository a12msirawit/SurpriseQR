import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
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

  return createBrowserClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key'
  );
}
