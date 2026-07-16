import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client for server-only privileged writes. Bypasses RLS.
// NEVER import this into a client component or expose the key to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
