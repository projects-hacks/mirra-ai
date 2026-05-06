'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { formatApiError, styleProfileApi } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import StyleInsightsChart from '@/components/closet/StyleInsightsChart';
import { SkeletonAnalyticsCard } from '@/components/common/SkeletonLoader';
import { EmptyAnalytics } from '@/components/common/EmptyState';

interface StyleProfile {
  user_id: string;
  period_start: string;
  period_end: string;
  top_colors: string[];
  top_categories: Record<string, number>;
  top_brands: string[];
  formality_avg: number;
  outfit_success_rate: number;
  avg_cost_per_wear: number;
  total_outfits: number;
  drift_insights?: {
    drift_detected: boolean;
    insights: Array<{
      type: string;
      message: string;
      change?: number;
      new_colors?: string[];
      category?: string;
      change_percent?: number;
    }>;
  };
}

function StyleProfileHeader({ title = 'Style Profile' }: Readonly<{ title?: string }>) {
  const router = useRouter();
  return (
    <header className="page-header-shell" style={{ paddingTop: 'calc(var(--safe-top) + 0.5rem)' }}>
      <div className="page-shell flex min-h-[52px] items-center justify-between gap-3 py-3 sm:py-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex min-h-11 items-center gap-2 text-sm"
          style={{ color: 'var(--on-surface-variant)' }}
        >
          ← Back
        </button>
        <h1 className="section-display text-center text-base sm:text-lg">{title}</h1>
        <div className="w-10 sm:w-12" aria-hidden />
      </div>
    </header>
  );
}

export default function StyleProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        router.push('/');
      }
    };
    fetchUser();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await styleProfileApi.get(userId);
        setProfile(data);
      } catch (err) {
        console.error('Error fetching style profile:', err);
        setError(formatApiError(err, 'Failed to load style profile'));
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDriftIcon = (type: string) => {
    switch (type) {
      case 'formality_drift':
        return 'trending_up';
      case 'color_shift':
        return 'palette';
      case 'category_shift':
        return 'swap_horiz';
      default:
        return 'info';
    }
  };

  const shell = (children: ReactNode) => (
    <div className="min-h-screen pb-10" style={{ background: 'var(--bg)', color: 'var(--on-surface)' }}>
      <StyleProfileHeader />
      <div className="page-shell mx-auto max-w-4xl space-y-6 pt-4">{children}</div>
    </div>
  );

  if (loading) {
    return shell(
      <>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonAnalyticsCard key={i} />
        ))}
      </>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen pb-10" style={{ background: 'var(--bg)', color: 'var(--on-surface)' }}>
        <StyleProfileHeader />
        <div className="page-shell mx-auto max-w-4xl space-y-4 pt-4">
          {profile && profile.total_outfits === 0 ? (
            <EmptyAnalytics />
          ) : (
            <div className="glass-card space-y-4 p-6 text-center sm:p-8">
              <span
                className="material-symbols-outlined mb-2 text-[56px]"
                style={{ color: 'var(--error)' }}
              >
                error
              </span>
              <p className="banner-error text-left" role="alert">
                {error || 'Failed to load style profile'}
              </p>
              <button type="button" onClick={() => window.location.reload()} className="btn-primary">
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: 'var(--bg)', color: 'var(--on-surface)' }}>
      <StyleProfileHeader />
      <div className="page-shell mx-auto max-w-4xl space-y-6 pt-4">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                Profile Period
              </p>
              <p className="font-semibold" style={{ color: 'var(--on-surface)' }}>
                {formatDate(profile.period_start)} - {formatDate(profile.period_end)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border px-4 py-2 transition-colors"
              style={{
                borderColor: 'var(--outline)',
                color: 'var(--on-surface)',
              }}
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
            </button>
          </div>
        </div>

        {profile.drift_insights?.drift_detected && profile.drift_insights.insights.length > 0 && (
          <div
            className="glass-card p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.05))',
            }}
          >
            <div className="mb-4 flex items-center gap-3">
              <span
                className="material-symbols-outlined text-[32px]"
                style={{ color: 'var(--primary)' }}
              >
                insights
              </span>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
                  Style Evolution Detected
                </h2>
                <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                  Your style is changing!
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {profile.drift_insights.insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg p-3"
                  style={{ background: 'var(--surface-variant)' }}
                >
                  <span
                    className="material-symbols-outlined text-[24px]"
                    style={{ color: 'var(--primary)' }}
                  >
                    {getDriftIcon(insight.type)}
                  </span>
                  <div className="flex-1">
                    <p style={{ color: 'var(--on-surface)' }}>{insight.message}</p>
                    {insight.change && (
                      <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                        Change: {(insight.change * 100).toFixed(1)}%
                      </p>
                    )}
                    {insight.change_percent && (
                      <p className="mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                        Change: {insight.change_percent}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <StyleInsightsChart profile={profile} />
      </div>
    </div>
  );
}
