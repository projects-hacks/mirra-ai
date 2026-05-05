const DEBUG_CAMERA_VOICE =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_DEBUG_CAMERA_VOICE === "true";

export function debugFlow(scope: string, event: string, data?: unknown): void {
  if (!DEBUG_CAMERA_VOICE) return;

  const timestamp = new Date().toISOString().slice(11, 23);
  const label = `[Mirra:${scope}] ${timestamp} ${event}`;

  if (data === undefined) {
    console.log(label);
    return;
  }

  console.log(label, data);
}
