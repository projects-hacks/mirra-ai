import { API_URL } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";

// ── Token helper ──────────────────────────────────────
async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {
    // Session unavailable — proceed without auth header (middleware will 401)
  }
  return {};
}

// ── 401 handler: clear session and redirect to "/" ────
async function handle401(): Promise<never> {
  try {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    localStorage.clear();
  } catch { /* ignore */ }
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
  throw new Error("Session expired. Redirecting to sign-in.");
}

// ── Core fetch with auth ──────────────────────────────
/** Typed fetch wrapper for backend REST API. Automatically attaches Bearer token. */
export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`;
  const authHeaders = await getAuthHeader();

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...options.headers,
    },
    ...options,
  });

  if (res.status === 401) {
    return handle401() as never;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${res.status}: ${body}`);
  }

  return res.json();
}

/** POST with JSON body. */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return api<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Upload a file (multipart/form-data). */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const url = `${API_URL}${path}`;
  const authHeaders = await getAuthHeader();

  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });

  if (res.status === 401) {
    return handle401() as never;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "Unknown error");
    throw new Error(`Upload ${res.status}: ${body}`);
  }

  return res.json();
}
