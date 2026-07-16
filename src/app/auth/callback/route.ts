import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Magic-link landing route. Supabase redirects here with a `code` after the
// user clicks the emailed link; we exchange it for a session (cookies are set
// by the SSR server client) and send them into the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No code, or the exchange failed — bounce back to login with a flag.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
