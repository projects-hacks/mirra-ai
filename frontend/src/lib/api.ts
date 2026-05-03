import { API_URL } from "@/lib/constants";

/** Typed fetch wrapper for backend REST API. */
export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

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

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "Unknown error");
    throw new Error(`Upload ${res.status}: ${body}`);
  }

  return res.json();
}
