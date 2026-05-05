/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import BottomNav from "@/components/navigation/BottomNav";

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
    wind_mph?: number;
    code?: number;
  } | null;
  location_at_scan?: string | null;
  selfie_url?: string | null;
}

interface SkinScanRow extends Omit<SkinScan, "weather_at_scan"> {
  weather_at_scan?: SkinScan["weather_at_scan"] | string;
}

// ── Helpers ──────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "#f59e0b";
  return "var(--error)";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { 
    hour: "numeric", 
    minute: "2-digit",
    hour12: true 
  });
}

// ── Components ───────────────────────────────────────

// Line chart for score trends
function TrendChart({ scans, metric }: Readonly<{ scans: SkinScan[]; metric: keyof SkinScores }>) {
  if (scans.length < 2) return null;
  
  const points = scans.slice(0, 30).reverse().map((s) => s.scores[metric] ?? 75);
  const max = Math.max(...points, 100);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  
  const w = 300;
  const h = 120;
  const padding = 20;
  
  const pathPoints = points.map((value, i) => {
    const x = padding + (i / (points.length - 1)) * (w - padding * 2);
    const y = h - padding - ((value - min) / range) * (h - padding * 2);
    return `${x},${y}`;
  }).join(" ");
  
  const areaPoints = `${padding},${h - padding} ${pathPoints} ${w - padding},${h - padding}`;
  
  return (
    <div className="relative">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((val) => {
          const y = h - padding - ((val - min) / range) * (h - padding * 2);
          return (
            <g key={val}>
              <line
                x1={padding}
                y1={y}
                x2={w - padding}
                y2={y}
                stroke="var(--outline)"
                strokeWidth="0.5"
                opacity="0.3"
              />
              <text
                x={padding - 5}
                y={y + 3}
                fontSize="10"
                fill="var(--on-surface-variant)"
                textAnchor="end"
              >
                {val}
              </text>
            </g>
          );
        })}
        
        {/* Area fill */}
        <polygon
          points={areaPoints}
          fill="var(--primary)"
          opacity="0.1"
        />
        
        {/* Line */}
        <polyline
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          points={pathPoints}
        />
        
        {/* Points */}
        {pathPoints.split(" ").map((point, i) => {
          const [x, y] = point.split(",").map(Number);
          return (
            <circle
              key={`point-${i}-${x}-${y}`}
              cx={x}
              cy={y}
              r="3"
              fill="var(--primary)"
              opacity={i === points.length - 1 ? 1 : 0.6}
            />
          );
        })}
      </svg>
    </div>
  );
}

function getContextEmoji(context: string): string {
  if (context === 'morning') return '🌅';
  if (context === 'afternoon') return '☀️';
  if (context === 'evening') return '🌆';
  return '🌙';
}

// Scan card with details
function ScanCard({ scan, isLatest }: Readonly<{ scan: SkinScan; isLatest: boolean }>) {
  const [expanded, setExpanded] = useState(false);
  
  const allMetrics = Object.entries(scan.scores)
    .filter(([k]) => k !== "overall")
    .sort(([, a], [, b]) => (a as number) - (b as number));
  
  return (
    <div className="glass-card space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium">{formatDate(scan.created_at)}</p>
            {isLatest && (
              <span 
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "var(--primary)", color: "white" }}
              >
                Latest
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
            {formatTime(scan.created_at)}
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: scoreColor(scan.scores.overall) }}>
            {scan.scores.overall}
          </div>
          <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
            Overall
          </p>
        </div>
      </div>
      
      {/* Context pills */}
      <div className="flex gap-2 flex-wrap text-xs">
        {scan.scan_context && (
          <span className="context-pill">
            {getContextEmoji(scan.scan_context)} {scan.scan_context}
          </span>
        )}
        {scan.location_at_scan && (
          <span className="context-pill">📍 {scan.location_at_scan}</span>
        )}
        {scan.weather_at_scan?.temp_f && (
          <span className="context-pill">🌡️ {Math.round(scan.weather_at_scan.temp_f)}°F</span>
        )}
        {scan.weather_at_scan?.humidity && (
          <span className="context-pill">💧 {scan.weather_at_scan.humidity}%</span>
        )}
        {scan.weather_at_scan?.wind_mph && (
          <span className="context-pill">💨 {Math.round(scan.weather_at_scan.wind_mph)} mph</span>
        )}
        {scan.skin_age && (
          <span className="context-pill">🎂 Skin age {scan.skin_age}</span>
        )}
      </div>
      
      {/* Selfie thumbnail */}
      {scan.selfie_url && (
        <div className="relative w-full aspect-square rounded-lg overflow-hidden">
          <img 
            src={scan.selfie_url} 
            alt="Scan selfie"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Top 3 metrics preview */}
      {!expanded && (
        <div className="space-y-2">
          {allMetrics.slice(0, 3).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--on-surface-variant)" }}>
                {key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
              <div className="flex items-center gap-2">
                <div 
                  className="w-16 h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--surface-variant)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${value}%`, background: scoreColor(value as number) }}
                  />
                </div>
                <span 
                  className="font-medium w-8 text-right"
                  style={{ color: scoreColor(value as number) }}
                >
                  {value}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* All metrics (expanded) */}
      {expanded && (
        <div className="space-y-2">
          {allMetrics.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--on-surface-variant)" }}>
                {key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
              <div className="flex items-center gap-2">
                <div 
                  className="w-24 h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--surface-variant)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${value}%`, background: scoreColor(value as number) }}
                  />
                </div>
                <span 
                  className="font-medium w-8 text-right"
                  style={{ color: scoreColor(value as number) }}
                >
                  {value}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Expand/collapse button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-xs py-2 rounded-lg transition-colors"
        style={{ 
          color: "var(--primary)",
          background: "var(--surface-variant)"
        }}
      >
        {expanded ? "Show less" : `Show all ${allMetrics.length} metrics`}
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────
export default function SkinHistoryPage() {
  const router = useRouter();
  const [scans, setScans] = useState<SkinScan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<keyof SkinScores>("overall");

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace("/");
        return;
      }
      
      const { data } = await supabase
        .from("skin_scans")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      
      if (data) {
        const parsedScans = (data as SkinScanRow[]).map((scan) => ({
          ...scan,
          scores: typeof scan.scores === 'string' ? JSON.parse(scan.scores) : scan.scores,
          weather_at_scan: typeof scan.weather_at_scan === 'string' ? JSON.parse(scan.weather_at_scan) : scan.weather_at_scan,
        }));
        setScans(parsedScans);
      }
      
      setIsLoading(false);
    }
    
    load();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="processing-ring" />
      </div>
    );
  }

  const metricOptions: Array<{ key: keyof SkinScores; label: string }> = [
    { key: "overall", label: "Overall" },
    { key: "moisture", label: "Moisture" },
    { key: "acne", label: "Acne" },
    { key: "wrinkles", label: "Wrinkles" },
    { key: "pores", label: "Pores" },
    { key: "dark_circles", label: "Dark Circles" },
    { key: "texture", label: "Texture" },
    { key: "redness", label: "Redness" },
    { key: "oiliness", label: "Oiliness" },
    { key: "radiance", label: "Radiance" },
    { key: "firmness", label: "Firmness" },
  ];

  return (
    <div
      className="bottom-nav-offset min-h-[100dvh]"
      style={{ background: "var(--bg)", color: "var(--on-surface)" }}
    >
      {/* Header */}
      <div className="page-header-shell">
        <div className="page-shell flex items-center justify-between px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex min-h-[44px] items-center gap-2 text-sm"
            style={{ color: "var(--on-surface-variant)" }}
          >
            ← Back
          </button>
          <h1 className="text-base font-semibold tracking-tight sm:text-lg" style={{ fontFamily: "var(--font-serif)" }}>Skin History</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="page-shell grid gap-6 px-4 pt-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
        
        {scans.length === 0 ? (
          <div className="glass-card py-12 text-center lg:col-span-2">
            <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
              No skin scans yet. Complete your first scan to see your history.
            </p>
          </div>
        ) : (
          <>
            {/* Stats overview */}
            <div className="glass-card space-y-3 lg:sticky lg:top-24">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Progress Overview</p>
                <p className="text-xs" style={{ color: "var(--on-surface-variant)" }}>
                  {scans.length} total scans
                </p>
              </div>
              
              {/* Metric selector */}
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 snap-x snap-mandatory">
                {metricOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setSelectedMetric(option.key)}
                    className="snap-start whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-all"
                    style={{
                      background: selectedMetric === option.key ? "var(--primary)" : "var(--surface-variant)",
                      color: selectedMetric === option.key ? "white" : "var(--on-surface-variant)",
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              
              {/* Trend chart */}
              {scans.length >= 2 && (
                <TrendChart scans={scans} metric={selectedMetric} />
              )}
              
              {/* Latest vs first comparison */}
              {scans.length >= 2 && (
                <div className="flex gap-3 text-xs">
                  <div className="flex-1 p-3 rounded-lg" style={{ background: "var(--surface-variant)" }}>
                    <p style={{ color: "var(--on-surface-variant)" }}>First scan</p>
                    <p className="text-lg font-bold mt-1" style={{ color: scoreColor(scans[scans.length - 1].scores[selectedMetric] ?? 75) }}>
                      {scans[scans.length - 1].scores[selectedMetric] ?? 75}
                    </p>
                  </div>
                  <div className="flex-1 p-3 rounded-lg" style={{ background: "var(--surface-variant)" }}>
                    <p style={{ color: "var(--on-surface-variant)" }}>Latest scan</p>
                    <p className="text-lg font-bold mt-1" style={{ color: scoreColor(scans[0].scores[selectedMetric] ?? 75) }}>
                      {scans[0].scores[selectedMetric] ?? 75}
                    </p>
                  </div>
                  <div className="flex-1 p-3 rounded-lg" style={{ background: "var(--surface-variant)" }}>
                    <p style={{ color: "var(--on-surface-variant)" }}>Change</p>
                    <p 
                      className="text-lg font-bold mt-1"
                      style={{ 
                        color: ((scans[0].scores[selectedMetric] ?? 75) - (scans[scans.length - 1].scores[selectedMetric] ?? 75)) >= 0 
                          ? "var(--success)" 
                          : "var(--error)" 
                      }}
                    >
                      {((scans[0].scores[selectedMetric] ?? 75) - (scans[scans.length - 1].scores[selectedMetric] ?? 75)) > 0 ? "+" : ""}
                      {((scans[0].scores[selectedMetric] ?? 75) - (scans[scans.length - 1].scores[selectedMetric] ?? 75))}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Scan timeline */}
            <div className="space-y-4">
              <p className="text-sm font-medium px-1">Scan Timeline</p>
              {scans.map((scan, index) => (
                <ScanCard key={scan.id} scan={scan} isLatest={index === 0} />
              ))}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
