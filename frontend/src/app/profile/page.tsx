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
  undertone?: string | null;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function normalizeSkinToneSnapshot(value: unknown) {
  const tone = asRecord(value);
  const results = asRecord(tone?.results);
  const color = asRecord(results?.color) ?? asRecord(tone?.color);

  return {
    skinColor: firstString(
      tone?.skin_color,
      tone?.skin_tone_hex,
      tone?.hex,
      color?.skin_color,
      color?.hex
    ),
    undertone: firstString(
      tone?.undertone,
      tone?.undertone_name,
      tone?.skin_tone,
      color?.undertone
    ),
    hairColorName: firstString(
      tone?.hair_color_name,
      tone?.hair_color,
      color?.hair_color_name,
      color?.hair_color
    ),
    eyeColorName: firstString(
      tone?.eye_color_name,
      tone?.eye_color,
      color?.eye_color_name,
      color?.eye_color
    ),
  };
}

function normalizeFaceSnapshot(value: unknown) {
  const face = asRecord(value);
  const results = asRecord(face?.results);
  const agegender = asRecord(results?.agegender) ?? asRecord(face?.agegender);

  return {
    shape: firstString(
      face?.shape,
      face?.face_shape,
      face?.faceshape,
      results?.shape,
      results?.face_shape,
      results?.faceshape
    ),
    age: firstNumber(face?.age, results?.age, agegender?.age),
    lipShape: firstString(face?.lip_shape, face?.lipshape, results?.lip_shape, results?.lipshape),
    eyelidType: firstString(face?.eyelid_type, face?.eyelid, results?.eyelid_type, results?.eyelid),
  };
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
  currency: string;
  budget_min: string;
  budget_max: string;
}

interface SavedPreferences {
  currency: string;
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
  const [savedPreferences, setSavedPreferences] = useState<SavedPreferences>({
    currency: "USD",
    budget_min: "",
    budget_max: "",
  });
  const [editForm, setEditForm] = useState<EditableProfile>({
    displayName: "",
    currency: "USD",
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
        const nextPreferences = {
          currency:
            typeof p.currency === "string"
              ? p.currency
              : typeof p.preferred_currency === "string"
                ? p.preferred_currency
                : "USD",
          budget_min:
            typeof p.budget_min === "number" ? p.budget_min.toString() : "",
          budget_max:
            typeof p.budget_max === "number" ? p.budget_max.toString() : "",
        };
        setCalendarConnected(
          typeof p.calendar_connected === "boolean" ? p.calendar_connected : false
        );
        setSavedPreferences(nextPreferences);
        setEditForm((f) => ({
          ...f,
          ...nextPreferences,
        }));
      }

      setIsLoading(false);
    }

    load();
  }, [router]);

  const persistPreferences = useCallback(async (targetUserId: string) => {
    const supabase = getSupabase();
    return supabase.from("user_preferences").upsert(
      {
        user_id: targetUserId,
        currency: editForm.currency,
        budget_min: editForm.budget_min ? Number.parseFloat(editForm.budget_min) : null,
        budget_max: editForm.budget_max ? Number.parseFloat(editForm.budget_max) : null,
      } as never,
      { onConflict: "user_id" }
    );
  }, [editForm.budget_max, editForm.budget_min, editForm.currency]);

  // ── Save profile name ──────────────────────────────
  const handleSaveProfile = useCallback(async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveError(null);

    const supabase = getSupabase();
    const nextDisplayName = editForm.displayName.trim() || user.displayName;

    const authResult = await supabase.auth.updateUser({
      data: {
        full_name: nextDisplayName,
        name: nextDisplayName,
        display_name: nextDisplayName,
      },
    });

    if (authResult.error) {
      setSaveError(authResult.error.message ?? "Save failed");
      setIsSaving(false);
      return;
    }

    // Best-effort mirror to profiles when a row already exists.
    // Avoid upsert here because insert is blocked by RLS in some environments.
    const profileResult = await supabase
      .from("profiles")
      .update({ display_name: nextDisplayName } as never)
      .eq("id", user.id);

    if (profileResult.error) {
      console.warn("Profile row update skipped:", profileResult.error.message);
    }

    setUser((current) => current ? { ...current, displayName: nextDisplayName } : current);
    setEditForm((current) => ({
      ...current,
      displayName: nextDisplayName,
    }));
    setIsEditing(false);
    setIsSaving(false);
  }, [user, editForm]);

  // ── Save preferences ───────────────────────────────
  const handleSavePreferences = useCallback(async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveError(null);

    const preferenceResult = await persistPreferences(user.id);

    if (preferenceResult.error) {
      setSaveError(preferenceResult.error.message ?? "Save failed");
      setIsSaving(false);
      return;
    }

    const nextPreferences = {
      currency: editForm.currency,
      budget_min: editForm.budget_min,
      budget_max: editForm.budget_max,
    };
    setSavedPreferences(nextPreferences);
    setEditForm((current) => ({
      ...current,
      ...nextPreferences,
    }));
    setIsSaving(false);
  }, [user, editForm, persistPreferences]);

  const handleCancelEdit = useCallback(() => {
    setEditForm({
      displayName: user?.displayName ?? "",
      ...savedPreferences,
    });
    setSaveError(null);
    setIsEditing(false);
  }, [savedPreferences, user]);

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
  const appearanceTone = normalizeSkinToneSnapshot(bodyModel?.skin_tone);
  const appearanceFace = normalizeFaceSnapshot(bodyModel?.face_shape);
  const hasAppearanceSnapshot = Boolean(
    appearanceFace.shape ||
    appearanceFace.age !== null ||
    appearanceTone.skinColor ||
    appearanceTone.undertone ||
    appearanceTone.hairColorName ||
    appearanceTone.eyeColorName ||
    appearanceFace.lipShape ||
    appearanceFace.eyelidType
  );

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
              <button onClick={handleCancelEdit} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
              <button onClick={handleSaveProfile} disabled={isSaving} className="btn-primary text-xs px-3 py-1.5">
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
                value={editForm.currency}
                onChange={(e) => setEditForm((f) => ({ ...f, currency: e.target.value }))}
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
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={isSaving}
                className="btn-primary text-xs px-3 py-1.5"
              >
                {isSaving ? "Saving..." : "Save Preferences"}
              </button>
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
              {appearanceFace.shape && (
                <span className="context-pill">{appearanceFace.shape} face</span>
              )}
              {appearanceFace.age !== null && (
                <span className="context-pill">Age {appearanceFace.age}</span>
              )}
              {appearanceTone.undertone && (
                <span className="context-pill capitalize">{appearanceTone.undertone} undertone</span>
              )}
              {appearanceTone.hairColorName && (
                <span className="context-pill">{appearanceTone.hairColorName} hair</span>
              )}
              {appearanceTone.eyeColorName && (
                <span className="context-pill">{appearanceTone.eyeColorName} eyes</span>
              )}
              {appearanceFace.lipShape && (
                <span className="context-pill">{appearanceFace.lipShape} lips</span>
              )}
              {appearanceFace.eyelidType && (
                <span className="context-pill">{appearanceFace.eyelidType} eyelids</span>
              )}
              {appearanceTone.skinColor && (
                <span className="context-pill flex items-center gap-1.5">
                  <span 
                    className="w-3 h-3 rounded-full border"
                    style={{ 
                      background: appearanceTone.skinColor,
                      borderColor: "var(--outline)"
                    }}
                  />
                  Skin tone
                </span>
              )}
              {!hasAppearanceSnapshot && (
                <p className="text-xs" style={{ color: "var(--on-surface-muted)" }}>
                  Run a skin scan to populate your face shape and tone snapshot.
                </p>
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
