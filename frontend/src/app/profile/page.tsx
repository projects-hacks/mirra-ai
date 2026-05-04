"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  facial_ratios?: Record<string, any>;
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

// ── Helpers ──────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "#f59e0b";
  return "var(--error)";
}

function ScoreBar({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1" style={{ color: "var(--on-surface-variant)" }}>
        <span>{label}</span>
        <span style={{ color: scoreColor(value), fontWeight: 600 }}>{value}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-variant)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: scoreColor(value) }}
        />
      </div>
    </div>
  );
}

// Trend indicator
function TrendIndicator({ scans }: Readonly<{ scans: SkinScan[] }>) {
  if (scans.length < 2) return null;
  
  const latest = scans[0]?.scores?.overall ?? 0;
  const previous = scans[1]?.scores?.overall ?? 0;
  const diff = latest - previous;
  
  if (Math.abs(diff) < 2) {
    return (
      <span className="text-xs flex items-center gap-1" style={{ color: "var(--on-surface-variant)" }}>
        <span>→</span> Stable
      </span>
    );
  }
  
  return (
    <span 
      className="text-xs flex items-center gap-1 font-medium"
      style={{ color: diff > 0 ? "var(--success)" : "var(--error)" }}
    >
      <span>{diff > 0 ? "↑" : "↓"}</span>
      {Math.abs(diff)} pts
    </span>
  );
}

// Mini chart for last 7 scans
function MiniChart({ scans }: Readonly<{ scans: SkinScan[] }>) {
  if (scans.length < 2) return null;
  
  const points = scans.slice(0, 7).reverse().map((s) => s.scores?.overall ?? 75);
  const max = Math.max(...points, 100);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  
  return (
    <div className="flex items-end gap-1 h-12">
      {points.map((value, i) => {
        const height = ((value - min) / range) * 100;
        return (
          <div
            key={`chart-${i}-${value}`}
            className="flex-1 rounded-t transition-all"
            style={{
              height: `${height}%`,
              minHeight: "4px",
              background: scoreColor(value),
              opacity: i === points.length - 1 ? 1 : 0.6,
            }}
          />
        );
      })}
    </div>
  );
}

function getContextEmoji(context: string): string {
  if (context === 'morning') return '🌅';
  if (context === 'afternoon') return '☀️';
  if (context === 'evening') return '🌆';
  return '🌙';
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
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);
  const [calendarMessage, setCalendarMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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

      // Check for calendar OAuth callback messages
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('calendar_success')) {
        setCalendarMessage({ type: 'success', text: 'Calendar connected successfully!' });
        // Clear URL params
        window.history.replaceState({}, '', '/profile');
      } else if (urlParams.get('calendar_error')) {
        const error = urlParams.get('calendar_error');
        setCalendarMessage({ 
          type: 'error', 
          text: error === 'connection_failed' 
            ? 'Failed to connect calendar. Please try again.' 
            : 'Calendar connection was cancelled.'
        });
        // Clear URL params
        window.history.replaceState({}, '', '/profile');
      }

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

      // Parallel fetch — cast to any to bypass Supabase's strict generic inference
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [bmRes, scansRes, closetRes, prefRes] = await Promise.allSettled([
        supabase.from("body_model").select("*").eq("user_id", u.id).single(),
        supabase.from("skin_scans").select("*").eq("user_id", u.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("closet_items").select("id", { count: "exact", head: true }).eq("user_id", u.id),
        supabase.from("user_preferences").select("*").eq("user_id", u.id).single(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ]) as any[];

      if (bmRes.status === "fulfilled" && bmRes.value?.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = bmRes.value.data as any;
        setBodyModel({
          skin_scores: typeof data.skin_scores === 'string' ? JSON.parse(data.skin_scores) : data.skin_scores,
          skin_tone: typeof data.skin_tone === 'string' ? JSON.parse(data.skin_tone) : data.skin_tone,
          face_shape: typeof data.face_shape === 'string' ? JSON.parse(data.face_shape) : data.face_shape,
        });
      }
      
      if (scansRes.status === "fulfilled" && scansRes.value?.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scans = (scansRes.value.data as any[]).map(scan => ({
          ...scan,
          scores: typeof scan.scores === 'string' ? JSON.parse(scan.scores) : scan.scores,
          weather_at_scan: typeof scan.weather_at_scan === 'string' ? JSON.parse(scan.weather_at_scan) : scan.weather_at_scan,
        }));
        setSkinScans(scans);
      }
      
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
      const ws = (window as any).__mirraWS;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    } catch { /* ignore */ }
    await signOut();
  }, [signOut]);

  // ── Connect calendar ────────────────────────────
  const handleConnectCalendar = useCallback(() => {
    if (!user) return;
    
    // Redirect to backend OAuth endpoint
    const authUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/calendar/oauth/authorize?user_id=${user.id}`;
    window.location.href = authUrl;
  }, [user]);

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

  // ── Re-analyze skin ────────────────────────────────
  const handleReanalyze = useCallback(async () => {
    if (!user) return;
    
    setIsReanalyzing(true);
    setReanalyzeError(null);
    
    try {
      const supabase = getSupabase();
      
      // Get latest selfie from skin_scans
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: latestScan, error: scanError } = await supabase
        .from("skin_scans")
        .select("selfie_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single() as any;
      
      if (scanError || !latestScan?.selfie_url) {
        throw new Error("No selfie found. Please complete onboarding first.");
      }
      
      // Download the selfie
      const response = await fetch(latestScan.selfie_url);
      if (!response.ok) {
        throw new Error("Failed to download selfie");
      }
      
      const blob = await response.blob();
      
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      const selfieBase64 = await base64Promise;
      
      // Get client IP for location detection
      const ipResponse = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipResponse.json();
      const clientIp = ipData.ip;
      
      // Call backend analyze endpoint
      const analyzeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          selfie: selfieBase64,
          ip_address: clientIp,
        }),
      });
      
      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(errorData.detail || "Analysis failed");
      }
      
      const result = await analyzeResponse.json();
      
      // Update local state with new data
      if (result.body_model) {
        setBodyModel(result.body_model);
      }
      
      // Reload skin scans
      const { data: newScans } = await supabase
        .from("skin_scans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      
      if (newScans) {
        const parsedScans = newScans.map((scan: any) => ({
          ...scan,
          scores: typeof scan.scores === 'string' ? JSON.parse(scan.scores) : scan.scores,
          weather_at_scan: typeof scan.weather_at_scan === 'string' ? JSON.parse(scan.weather_at_scan) : scan.weather_at_scan,
        }));
        setSkinScans(parsedScans);
      }
      
      // Success!
      setIsReanalyzing(false);
      
    } catch (error) {
      console.error("Re-analyze error:", error);
      setReanalyzeError(error instanceof Error ? error.message : "Failed to re-analyze");
      setIsReanalyzing(false);
    }
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
  const latestScan = skinScans[0];
  
  // Top 3 concerns (lowest scores)
  const topConcerns = Object.entries(scores)
    .filter(([k]) => k !== "overall")
    .sort(([, a], [, b]) => (a as number) - (b as number))
    .slice(0, 3);

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

        {/* ── Skin Intelligence Card (Enhanced) ── */}
        {bodyModel && (
          <div className="glass-card space-y-4">
            {/* Header with score and trend */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium mb-1">Skin Intelligence</p>
                <TrendIndicator scans={skinScans} />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold" style={{ color: scoreColor(overallScore) }}>
                  {overallScore}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)" }}>
                  Overall Score
                </p>
              </div>
            </div>

            {/* Mini chart */}
            {skinScans.length >= 2 && (
              <div>
                <p className="text-xs mb-2" style={{ color: "var(--on-surface-variant)" }}>
                  Last 7 scans
                </p>
                <MiniChart scans={skinScans} />
              </div>
            )}

            {/* Top 3 concerns */}
            {topConcerns.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-xs font-medium" style={{ color: "var(--on-surface-variant)" }}>
                  Areas to improve
                </p>
                {topConcerns.map(([key, value]) => (
                  <ScoreBar
                    key={key}
                    label={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    value={value as number}
                  />
                ))}
              </div>
            )}

            {/* Latest scan context */}
            {latestScan && (
              <div className="flex gap-2 flex-wrap text-xs">
                {latestScan.scan_context && (
                  <span className="context-pill">
                    {getContextEmoji(latestScan.scan_context)} {latestScan.scan_context}
                  </span>
                )}
                {latestScan.location_at_scan && (
                  <span className="context-pill">📍 {latestScan.location_at_scan}</span>
                )}
                {latestScan.weather_at_scan?.temp_f && (
                  <span className="context-pill">🌡️ {Math.round(latestScan.weather_at_scan.temp_f)}°F</span>
                )}
                {latestScan.weather_at_scan?.humidity && (
                  <span className="context-pill">💧 {latestScan.weather_at_scan.humidity}%</span>
                )}
              </div>
            )}

            {/* Face attributes */}
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

            {skinScans.length > 0 && (
              <p className="text-xs" style={{ color: "var(--on-surface-muted)" }}>
                Last scanned {new Date(skinScans[0].created_at).toLocaleDateString()} · {skinScans.length} total scans
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/new-scan")}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                New Scan
              </button>
              <button
                onClick={handleReanalyze}
                disabled={isReanalyzing}
                className="btn-secondary flex-1 text-sm flex items-center justify-center gap-2"
              >
                {isReanalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Re-analyze
                  </>
                )}
              </button>
            </div>
            
            <button
              onClick={() => router.push("/skin-history")}
              className="btn-secondary w-full text-sm"
            >
              View Detailed History →
            </button>
            
            {reanalyzeError && (
              <p className="text-xs px-1" style={{ color: "var(--error)" }}>
                {reanalyzeError}
              </p>
            )}
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
        <div className="glass-card">
          {calendarMessage && (
            <div 
              className="mb-3 p-3 rounded-lg text-sm"
              style={{ 
                background: calendarMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: calendarMessage.type === 'success' ? 'var(--success)' : 'var(--error)',
                border: `1px solid ${calendarMessage.type === 'success' ? 'var(--success)' : 'var(--error)'}`
              }}
            >
              {calendarMessage.text}
            </div>
          )}
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
