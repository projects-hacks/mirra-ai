/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/types";

// ── Types ────────────────────────────────────────────
interface SkinScores {
  overall: number;
  acne?: number;
  wrinkles?: number;
  pores?: number;
  moisture?: number;
  texture?: number;
  radiance?: number;
  oiliness?: number;
  firmness?: number;
  redness?: number;
  dark_circles?: number;
  eye_bag?: number;
  age_spot?: number;
  droopy_upper_eyelid?: number;
  droopy_lower_eyelid?: number;
}

interface SkinTone {
  skin_color?: string;
  eye_color?: string | null;
  eye_color_name?: string | null;
  lip_color?: string | null;
  eyebrow_color?: string | null;
  hair_color?: string | null;
  hair_color_name?: string | null;
}

interface FaceShape {
  shape?: string;
  age?: number | null;
  gender?: string | null;
  facial_ratios?: Record<string, unknown>;
  eye_shape?: string | null;
  eye_size?: string | null;
  eyelid_type?: string | null;
  lip_shape?: string | null;
  nose_width?: string | null;
  nose_length?: string | null;
}

interface BodyModel {
  skin_scores?: SkinScores;
  skin_tone?: SkinTone;
  face_shape?: FaceShape;
}

interface SkinScan {
  id: string;
  created_at: string;
  scores: SkinScores;
  skin_age?: number | null;
  scan_context?: string;
  weather_at_scan?: {
    temp_f?: number;
    humidity?: number;
    condition?: string;
    location?: string;
  } | null;
  location_at_scan?: string | null;
  selfie_url?: string | null;
}

interface EditableProfile {
  displayName: string;
  preferred_currency: string;
  budget_min: string;
  budget_max: string;
}

interface SkinScanRow extends Omit<SkinScan, "weather_at_scan"> {
  weather_at_scan?: SkinScan["weather_at_scan"] | string;
}

interface SettledQueryResult {
  data?: unknown;
  count?: number | null;
}

// ── Main Component ────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { signOut } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [bodyModel, setBodyModel] = useState<BodyModel | null>(null);
  const [skinScans, setSkinScans] = useState<SkinScan[]>([]);
  const [closetCount, setClosetCount] = useState<number | null>(null);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditableProfile>({
    displayName: "",
    preferred_currency: "USD",
    budget_min: "",
    budget_max: "",
  });

  // ── Load data ──────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = getSupabase();

      // Session check
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace("/");
        return;
      }

      const u: User = {
        id: session.user.id,
        email: session.user.email ?? "",
        displayName:
          session.user.user_metadata?.full_name ??
          session.user.user_metadata?.name ??
          session.user.email?.split("@")[0] ?? "User",
        avatarUrl: session.user.user_metadata?.avatar_url,
      };
      setUser(u);
      setEditForm((f) => ({ ...f, displayName: u.displayName }));

      const settledResults = (await Promise.allSettled([
        supabase.from("body_model").select("*").eq("user_id", u.id).single(),
        supabase.from("skin_scans").select("*").eq("user_id", u.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("closet_items").select("id", { count: "exact", head: true }).eq("user_id", u.id),
        supabase.from("user_preferences").select("*").eq("user_id", u.id).single(),
      ])) as PromiseSettledResult<SettledQueryResult>[];
      const [bmRes, scansRes, closetRes, prefRes] = settledResults;

      if (bmRes.status === "fulfilled" && bmRes.value?.data) {
        const data = bmRes.value.data as Record<string, unknown>;
        setBodyModel({
          skin_scores: typeof data.skin_scores === 'string' ? JSON.parse(data.skin_scores) : data.skin_scores,
          skin_tone: typeof data.skin_tone === 'string' ? JSON.parse(data.skin_tone) : data.skin_tone,
          face_shape: typeof data.face_shape === 'string' ? JSON.parse(data.face_shape) : data.face_shape,
        });
      }
      
      if (scansRes.status === "fulfilled" && scansRes.value?.data) {
        const scans = (scansRes.value.data as SkinScanRow[]).map((scan) => ({
          ...scan,
          scores: typeof scan.scores === 'string' ? JSON.parse(scan.scores) : scan.scores,
          weather_at_scan: typeof scan.weather_at_scan === 'string' ? JSON.parse(scan.weather_at_scan) : scan.weather_at_scan,
        }));
        setSkinScans(scans);
      }
      
      if (closetRes.status === "fulfilled") setClosetCount((closetRes.value?.count as number) ?? 0);
      
      if (prefRes.status === "fulfilled" && prefRes.value?.data) {
        const p = prefRes.value.data as Record<string, unknown>;
        setCalendarConnected(
          typeof p.calendar_connected === "boolean" ? p.calendar_connected : false
        );
        setEditForm((f) => ({
          ...f,
          preferred_currency:
            typeof p.preferred_currency === "string" ? p.preferred_currency : "USD",
          budget_min:
            typeof p.budget_min === "number" ? p.budget_min.toString() : "",
          budget_max:
            typeof p.budget_max === "number" ? p.budget_max.toString() : "",
        }));
      }

      setIsLoading(false);
    }

    load();
  }, [router]);

  // ── Save profile ───────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveError(null);

    const supabase = getSupabase();
    const [r1, r2] = await Promise.all([
      supabase.from("profiles").upsert({ id: user.id, display_name: editForm.displayName } as never),
      supabase.from("user_preferences").upsert(
        {
          user_id: user.id,
          preferred_currency: editForm.preferred_currency,
          budget_min: editForm.budget_min ? Number.parseFloat(editForm.budget_min) : null,
          budget_max: editForm.budget_max ? Number.parseFloat(editForm.budget_max) : null,
        } as never,
        { onConflict: "user_id" }
      ),
    ] as const);

    if (r1.error || r2.error) {
      setSaveError((r1.error ?? r2.error)?.message ?? "Save failed");
    } else {
      setUser((u) => u ? { ...u, displayName: editForm.displayName } : u);
      setIsEditing(false);
    }
    setIsSaving(false);
  }, [user, editForm]);

  // ── Log out ──
  const handleLogOut = useCallback(async () => {
    try {
      const ws = (window as Window & { __mirraWS?: WebSocket }).__mirraWS;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    } catch { /* ignore */ }
    await signOut();
  }, [signOut]);

  // ── Connect calendar ────────────────────────────
  const handleConnectCalendar = useCallback(async () => {
    if (!user) return;
    
    // Calendar is connected during sign-in, so we need to prompt re-authentication
    const confirmed = confirm(
      "To connect your calendar, you'll need to sign out and sign in again. " +
      "You'll be prompted to grant calendar access during sign-in. Continue?"
    );
    
    if (confirmed) {
      await signOut();
    }
  }, [user, signOut]);

  // ── Disconnect calendar ────────────────────────────
  const handleDisconnectCalendar = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabase();
    await supabase.from("user_preferences").upsert(
      { user_id: user.id, calendar_connected: false, google_calendar_token: null } as never,
      { onConflict: "user_id" }
    );
    setCalendarConnected(false);
  }, [user]);

  // ── Render ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="processing-ring" />
      </div>
    );
  }

  const scores = bodyModel?.skin_scores ?? {} as SkinScores;
  const overallScore = scores.overall ?? 75;

  return (
    <div
      className="min-h-screen pb-12"
      style={{ background: "var(--bg)", color: "var(--on-surface)" }}
    >
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-4"
        style={{ background: "rgba(var(--bg-rgb, 10,10,20),0.85)", backdropFilter: "blur(16px)" }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--on-surface-variant)" }}
        >
          ← Back
        </button>
        <h1 className="text-base font-semibold tracking-tight">Profile</h1>
        <button
          onClick={handleLogOut}
          className="text-sm"
          style={{ color: "var(--error)" }}
        >
          Log Out
        </button>
      </div>

      <div className="max-w-lg mx-auto px-5 space-y-5 pt-4">

        {/* ── Identity Card ── */}
        <div className="glass-card flex items-center gap-4">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold"
              style={{ background: "var(--primary)", color: "white" }}
            >
              {user?.displayName?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                className="w-full rounded-lg px-3 py-1.5 text-sm mb-1"
                style={{ background: "var(--surface-variant)", color: "var(--on-surface)", border: "1px solid var(--outline)" }}
                value={editForm.displayName}
                onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            ) : (
              <p className="font-semibold truncate">{user?.displayName}</p>
            )}
            <p className="text-xs truncate" style={{ color: "var(--on-surface-variant)" }}>{user?.email}</p>
          </div>
          {isEditing ? (
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setIsEditing(false)} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
              <button onClick={handleSave} disabled={isSaving} className="btn-primary text-xs px-3 py-1.5">
                {isSaving ? "…" : "Save"}
              </button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0">Edit</button>
          )}
        </div>
        {saveError && <p className="text-xs px-1" style={{ color: "var(--error)" }}>{saveError}</p>}

        {/* ── Edit: currency + budget (only when editing) ── */}
        {isEditing && (
          <div className="glass-card space-y-3">
            <p className="text-sm font-medium">Preferences</p>
            <div>
              <label htmlFor="currency-select" className="text-xs mb-1 block" style={{ color: "var(--on-surface-variant)" }}>Currency</label>
              <select
                id="currency-select"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: "var(--surface-variant)", color: "var(--on-surface)", border: "1px solid var(--outline)" }}
                value={editForm.preferred_currency}
                onChange={(e) => setEditForm((f) => ({ ...f, preferred_currency: e.target.value }))}
              >
                {["USD", "EUR", "GBP", "INR", "CAD", "AUD"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="budget-min" className="text-xs mb-1 block" style={{ color: "var(--on-surface-variant)" }}>Budget Min</label>
                <input
                  id="budget-min"
                  type="number" placeholder="0"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: "var(--surface-variant)", color: "var(--on-surface)", border: "1px solid var(--outline)" }}
                  value={editForm.budget_min}
                  onChange={(e) => setEditForm((f) => ({ ...f, budget_min: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="budget-max" className="text-xs mb-1 block" style={{ color: "var(--on-surface-variant)" }}>Budget Max</label>
                <input
                  id="budget-max"
                  type="number" placeholder="500"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: "var(--surface-variant)", color: "var(--on-surface)", border: "1px solid var(--outline)" }}
                  value={editForm.budget_max}
                  onChange={(e) => setEditForm((f) => ({ ...f, budget_max: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Skin Health Summary ── */}
        {bodyModel && (
          <div className="glass-card flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Skin Health</p>
              <p className="mt-1 text-xs" style={{ color: "var(--on-surface-variant)" }}>
                {skinScans.length > 0
                  ? `${skinScans.length} saved scans. Latest ${new Date(skinScans[0].created_at).toLocaleDateString()}.`
                  : "Open Skin Health to review scan details."}
              </p>
              <button
                type="button"
                onClick={() => router.push("/skin-history")}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium"
                style={{ color: "var(--primary)" }}
              >
                View history
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                {overallScore}
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                Overall
              </p>
            </div>
            <button
              onClick={() => router.push("/skin")}
              className="btn-secondary shrink-0 text-sm"
            >
              Open
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* ── Face and tone snapshot ── */}
        {bodyModel && (
          <div className="glass-card space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Appearance Snapshot</p>
                <p className="mt-1 text-xs" style={{ color: "var(--on-surface-variant)" }}>
                  Current face and tone context used by styling flows.
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap text-xs">
              {bodyModel.face_shape?.shape && (
                <span className="context-pill">{bodyModel.face_shape.shape} face</span>
              )}
              {bodyModel.face_shape?.age && (
                <span className="context-pill">Age {bodyModel.face_shape.age}</span>
              )}
              {bodyModel.skin_tone?.skin_color && (
                <span className="context-pill flex items-center gap-1.5">
                  <span 
                    className="w-3 h-3 rounded-full border"
                    style={{ 
                      background: bodyModel.skin_tone.skin_color,
                      borderColor: "var(--outline)"
                    }}
                  />
                  Skin tone
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Closet Stats ── */}
        <div className="glass-card flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Your Closet</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
              {closetCount !== null ? `${closetCount} items` : "—"}
            </p>
          </div>
          <button onClick={() => router.push("/closet")} className="btn-secondary text-sm">
            View Closet
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>

        {/* ── Calendar ── */}
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Google Calendar</p>
              <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--on-surface-variant)" }}>
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ background: calendarConnected ? "var(--success)" : "var(--outline)" }}
                />
                {calendarConnected ? "Connected" : "Not connected"}
              </p>
              {!calendarConnected && (
                <p className="text-xs mt-1" style={{ color: "var(--on-surface-muted)" }}>
                  Calendar access is granted during sign-in
                </p>
              )}
            </div>
          {calendarConnected ? (
            <button onClick={handleDisconnectCalendar} className="btn-secondary text-sm" style={{ color: "var(--error)" }}>
              Disconnect
            </button>
          ) : (
            <button onClick={handleConnectCalendar} className="btn-primary text-sm">
              Connect
            </button>
          )}
          </div>
        </div>

        {/* ── Danger Zone ── */}
        <div className="glass-card border" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
          <p className="text-sm font-medium mb-3" style={{ color: "var(--error)" }}>Account</p>
          <button onClick={handleLogOut} className="btn-secondary w-full text-sm" style={{ color: "var(--error)", borderColor: "var(--error)" }}>
            Log Out
          </button>
        </div>

      </div>
    </div>
  );
}
