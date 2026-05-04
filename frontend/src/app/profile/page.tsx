"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/types";

// ── Types ────────────────────────────────────────────
interface SkinScores {
  acne?: number;
  wrinkle?: number;
  pore?: number;
  moisture?: number;
  texture?: number;
  radiance?: number;
  oiliness?: number;
  firmness?: number;
  redness?: number;
  darkCircle?: number;
  eyeBag?: number;
  ageSpot?: number;
  skin_age?: number;
}

interface BodyModel {
  skin_scores?: SkinScores;
  skin_tone?: { undertone?: string; depth?: string; hex?: string };
  face_shape?: { shape?: string };
}

interface SkinScan {
  created_at: string;
  scores: SkinScores;
}

interface EditableProfile {
  displayName: string;
  preferred_currency: string;
  budget_min: string;
  budget_max: string;
}

// ── Helpers ──────────────────────────────────────────
function avg(scores: SkinScores): number {
  const vals = Object.entries(scores)
    .filter(([k]) => k !== "skin_age")
    .map(([, v]) => v as number)
    .filter((v) => typeof v === "number");
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "#f59e0b";
  return "var(--error)";
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1" style={{ color: "var(--on-surface-variant)" }}>
        <span>{label}</span>
        <span style={{ color: scoreColor(value) }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-variant)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: scoreColor(value) }}
        />
      </div>
    </div>
  );
}

// Inline sparkline for skin trend (last 7 scans)
function SparkLine({ scans }: { scans: SkinScan[] }) {
  if (scans.length < 2) return null;
  const points = scans.slice(-7).map((s) => avg(s.scores));
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const pts = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-80">
      <polyline fill="none" stroke="var(--primary)" strokeWidth="2" points={pts} />
    </svg>
  );
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

      // Parallel fetch — cast to any to bypass Supabase's strict generic inference in allSettled
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [bmRes, scansRes, closetRes, prefRes] = await Promise.allSettled([
        supabase.from("body_model").select("skin_scores,skin_tone,face_shape").eq("user_id", u.id).single(),
        supabase.from("skin_scans").select("created_at,scores").eq("user_id", u.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("closet_items").select("id", { count: "exact", head: true }).eq("user_id", u.id),
        supabase.from("user_preferences").select("preferred_currency,budget_min,budget_max,calendar_connected").eq("user_id", u.id).single(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ]) as any[];

      if (bmRes.status === "fulfilled" && bmRes.value?.data) setBodyModel(bmRes.value.data as BodyModel);
      if (scansRes.status === "fulfilled" && scansRes.value?.data) setSkinScans(scansRes.value.data as SkinScan[]);
      if (closetRes.status === "fulfilled") setClosetCount((closetRes.value?.count as number) ?? 0);
      if (prefRes.status === "fulfilled" && prefRes.value?.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = prefRes.value.data as any;
        setCalendarConnected(p.calendar_connected ?? false);
        setEditForm((f) => ({
          ...f,
          preferred_currency: p.preferred_currency ?? "USD",
          budget_min: p.budget_min?.toString() ?? "",
          budget_max: p.budget_max?.toString() ?? "",
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
          budget_min: editForm.budget_min ? parseFloat(editForm.budget_min) : null,
          budget_max: editForm.budget_max ? parseFloat(editForm.budget_max) : null,
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

  // ── Log out (uses useAuth which broadcasts to other tabs) ──
  const handleLogOut = useCallback(async () => {
    // Close any open WebSocket connections (Task 16.6)
    try {
      const ws = (window as any).__mirraWS;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    } catch { /* ignore */ }
    await signOut();
  }, [signOut]);

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

  const scores = bodyModel?.skin_scores ?? {};
  const overallScore = avg(scores);
  const scoreEntries = Object.entries(scores)
    .filter(([k]) => k !== "skin_age")
    .sort(([, a], [, b]) => (a as number) - (b as number))
    .slice(0, 6);

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
              <label className="text-xs mb-1 block" style={{ color: "var(--on-surface-variant)" }}>Currency</label>
              <select
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
                <label className="text-xs mb-1 block" style={{ color: "var(--on-surface-variant)" }}>Budget Min</label>
                <input
                  type="number" placeholder="0"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: "var(--surface-variant)", color: "var(--on-surface)", border: "1px solid var(--outline)" }}
                  value={editForm.budget_min}
                  onChange={(e) => setEditForm((f) => ({ ...f, budget_min: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs mb-1 block" style={{ color: "var(--on-surface-variant)" }}>Budget Max</label>
                <input
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

        {/* ── Skin Intelligence Card ── */}
        {bodyModel && (
          <div className="glass-card space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Skin Intelligence</p>
              <div className="flex items-center gap-2">
                {skinScans.length >= 2 && <SparkLine scans={skinScans} />}
                <span className="text-2xl font-bold" style={{ color: scoreColor(overallScore) }}>{overallScore}</span>
              </div>
            </div>

            {scoreEntries.length > 0 && (
              <div className="space-y-2">
                {scoreEntries.map(([key, value]) => (
                  <ScoreBar
                    key={key}
                    label={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    value={value as number}
                  />
                ))}
              </div>
            )}

            <div className="flex gap-3 flex-wrap text-xs">
              {bodyModel.skin_tone?.undertone && (
                <span className="context-pill">{bodyModel.skin_tone.undertone} undertone</span>
              )}
              {bodyModel.face_shape?.shape && (
                <span className="context-pill">{bodyModel.face_shape.shape} face</span>
              )}
              {scores.skin_age && (
                <span className="context-pill">Skin age {scores.skin_age}</span>
              )}
            </div>

            {skinScans.length > 0 && (
              <p className="text-xs" style={{ color: "var(--on-surface-muted)" }}>
                Last scanned {new Date(skinScans[0].created_at).toLocaleDateString()} · {skinScans.length} total scans
              </p>
            )}

            <button
              onClick={() => router.push("/skin-history")}
              className="btn-secondary w-full text-sm"
            >
              View Skin History →
            </button>
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
            View Closet →
          </button>
        </div>

        {/* ── Calendar ── */}
        <div className="glass-card flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Google Calendar</p>
            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--on-surface-variant)" }}>
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: calendarConnected ? "var(--success)" : "var(--outline)" }}
              />
              {calendarConnected ? "Connected" : "Not connected"}
            </p>
          </div>
          {calendarConnected ? (
            <button onClick={handleDisconnectCalendar} className="btn-secondary text-sm" style={{ color: "var(--error)" }}>
              Disconnect
            </button>
          ) : (
            <button className="btn-primary text-sm" disabled>
              Connect
            </button>
          )}
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
