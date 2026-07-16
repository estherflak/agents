import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

// App header: shows the signed-in user's email and a sign-out button.
// Renders nothing when there's no session (e.g. on the login screen).
export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <header className="flex items-center justify-between border-b border-black/5 px-6 py-3">
      <Link href="/" className="font-semibold tracking-tight">
        Agents
      </Link>

      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted">{user.email}</span>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full border border-black/10 px-4 py-1.5 font-medium transition-colors hover:bg-black/5"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
