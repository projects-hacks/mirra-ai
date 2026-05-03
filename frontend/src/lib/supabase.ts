import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/constants";

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Singleton Supabase client for browser usage. */
export function getSupabase() {
  if (!client) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}
