import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/constants";

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Singleton Supabase browser client. Uses cookie-backed PKCE storage. */
export function getSupabase() {
  if (!client) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}
