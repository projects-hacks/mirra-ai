import { getSupabase } from "@/lib/supabase";

const DEFAULT_LOCATION = "San Francisco";

export async function resolveUserLocation(userId: string | null | undefined): Promise<string> {
  if (!userId) return DEFAULT_LOCATION;

  const supabase = getSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("location")
    .eq("id", userId)
    .single();

  const location = (data as { location?: string } | null)?.location?.trim();
  return location || DEFAULT_LOCATION;
}
