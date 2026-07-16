import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client (public anon key). Use in client components.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
