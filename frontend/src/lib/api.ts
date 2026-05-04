import { API_URL } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (attempt: number, error: Error) => boolean;
}

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

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    onRetry,
    shouldRetry,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      if (shouldRetry && !shouldRetry(attempt + 1, lastError)) {
        throw lastError;
      }

      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError || new Error("Retry failed with unknown error");
}

// ── Core fetch with auth ──────────────────────────────
/** Typed fetch wrapper for backend REST API. Automatically attaches Bearer token. */
export async function api<T>(
  path: string,
  options: RequestInit & { retry?: RetryOptions | boolean } = {}
): Promise<T> {
  const url = `${API_URL}${path}`;
  const authHeaders = await getAuthHeader();
  const retryOptions = options.retry === true ? {} : options.retry;

  const requestOnce = async () => {
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
      const error = new Error(`API ${res.status}: ${body}`) as Error & { retryable?: boolean };
      error.retryable = res.status >= 500;
      throw error;
    }

    return res.json() as Promise<T>;
  };

  if (!retryOptions) {
    return requestOnce();
  }

  return retryWithBackoff(requestOnce, {
    ...retryOptions,
    shouldRetry: (attempt, error) => {
      const retryable = (error as Error & { retryable?: boolean }).retryable;
      if (retryable === false) return false;
      return retryOptions.shouldRetry ? retryOptions.shouldRetry(attempt, error) : true;
    },
  });
}

/** POST with JSON body. */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return api<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Upload a file (multipart/form-data). */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  retry?: RetryOptions | boolean
): Promise<T> {
  const url = `${API_URL}${path}`;
  const authHeaders = await getAuthHeader();
  const retryOptions = retry === true ? {} : retry;

  const requestOnce = async () => {
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
      const error = new Error(`Upload ${res.status}: ${body}`) as Error & { retryable?: boolean };
      error.retryable = res.status >= 500;
      throw error;
    }

    return res.json() as Promise<T>;
  };

  if (!retryOptions) {
    return requestOnce();
  }

  return retryWithBackoff(requestOnce, {
    ...retryOptions,
    shouldRetry: (attempt, error) => {
      const retryable = (error as Error & { retryable?: boolean }).retryable;
      if (retryable === false) return false;
      return retryOptions.shouldRetry ? retryOptions.shouldRetry(attempt, error) : true;
    },
  });
}
