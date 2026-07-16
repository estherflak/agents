import { createClient } from "@supabase/supabase-js";

// Browser-safe Supabase client using the public anon key.
// Import this in client components and browser code.
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. See .env.local.example.",
    );
  }

  return createClient(url, anonKey);
}
