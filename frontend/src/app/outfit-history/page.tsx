'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatApiError, outfitHistoryApi } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import ClosetSubNav from '@/components/navigation/ClosetSubNav';
import OutfitHistoryCard from '@/components/closet/OutfitHistoryCard';
import { SkeletonOutfitHistory } from '@/components/common/SkeletonLoader';

interface OutfitLog {
  id: string;
  proof_card_id: string | null;
  occasion: string;
  weather: OutfitWeather | null;
  items: OutfitItem[];
  outcome: 'pending' | 'wore' | 'skipped' | 'returned' | 'loved';
  rating: number | null;
  feedback: string | null;
  compliments: boolean;
  photos: string[];
  created_at: string;
}

interface OutfitWeather {
  temperature?: number;
  condition?: string;
}

interface OutfitItem {
  name?: string;
  category?: string;
  brand?: string;
}

interface OutfitSummary {
  wore: number;
  skipped: number;
  returned: number;
  loved: number;
  pending: number;
  total: number;
}

export default function OutfitHistoryPage() {
  const router = useRouter();
  const [outfitLogs, setOutfitLogs] = useState<OutfitLog[]>([]);
  const [summary, setSummary] = useState<OutfitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Filter states
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');

  const refreshOutfitHistory = useCallback(async (targetUserId: string) => {
    const [logsData, summaryData] = await Promise.all([
      outfitHistoryApi.list<OutfitLog>(targetUserId),
      outfitHistoryApi.summary(targetUserId),
    ]);
    setOutfitLogs(logsData.outfit_logs || []);
    setSummary(summaryData);
  }, []);

  // Fetch user ID
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

  // Fetch outfit history and summary
  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        await refreshOutfitHistory(userId);

      } catch (err) {
        console.error('Error fetching outfit history:', err);
        setError(formatApiError(err, 'Failed to load outfit history'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, refreshOutfitHistory]);

  // Calculate date range
  const getDateRange = (range: string): { start: string | null; end: string | null } => {
    const now = new Date();
    const end = now.toISOString();
    
    switch (range) {
      case 'week': {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        return { start: start.toISOString(), end };
      }
      case 'month': {
        const start = new Date(now);
        start.setMonth(start.getMonth() - 1);
        return { start: start.toISOString(), end };
      }
      case 'year': {
        const start = new Date(now);
        start.setFullYear(start.getFullYear() - 1);
        return { start: start.toISOString(), end };
      }
      default:
        return { start: null, end: null };
    }
  };

  // Apply filters to outfit logs
  const filteredLogs = useMemo(() => {
    let filtered = [...outfitLogs];

    // Apply outcome filter
    if (outcomeFilter !== 'all') {
      filtered = filtered.filter((log) => log.outcome === outcomeFilter);
    }

    // Apply date range filter
    if (dateRangeFilter !== 'all') {
      const { start } = getDateRange(dateRangeFilter);
      if (start) {
        filtered = filtered.filter((log) => new Date(log.created_at) >= new Date(start));
      }
    }

    return filtered;
  }, [outfitLogs, outcomeFilter, dateRangeFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6 pb-10">
        <div className="mx-auto max-w-4xl">
          <ClosetSubNav variant="gradient" />
          {/* Header Skeleton */}
          <div className="mb-6">
            <div className="h-8 w-48 bg-white/10 rounded animate-pulse mb-4"></div>
          </div>
          
          {/* Summary Cards Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass-panel p-4 text-center">
                <div className="h-8 w-12 bg-white/10 rounded animate-pulse mx-auto mb-2"></div>
                <div className="h-4 w-16 bg-white/10 rounded animate-pulse mx-auto"></div>
              </div>
            ))}
          </div>
          
          {/* Outfit Logs Skeleton */}
          <SkeletonOutfitHistory count={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6 pb-10">
        <div className="mx-auto max-w-4xl space-y-4">
          <ClosetSubNav variant="gradient" />
          <div className="glass-panel p-8 text-center">
            <span className="material-symbols-outlined mb-4 text-5xl text-red-400">error</span>
            <h2 className="mb-2 text-xl font-semibold text-white">Error loading history</h2>
            <p className="banner-error mb-4 text-left">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-white/15 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/25"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6 pb-10">
      <div className="mx-auto max-w-4xl">
        <ClosetSubNav variant="gradient" />
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-white">arrow_back</span>
            </button>
            <h1 className="text-3xl font-bold text-white">Outfit History</h1>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="glass-panel p-4 text-center">
              <div className="text-2xl font-bold text-green-300">{summary.wore}</div>
              <div className="text-sm text-white/70">Wore</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-2xl font-bold text-pink-300">{summary.loved}</div>
              <div className="text-sm text-white/70">Loved</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-2xl font-bold text-yellow-300">{summary.skipped}</div>
              <div className="text-sm text-white/70">Skipped</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-2xl font-bold text-red-300">{summary.returned}</div>
              <div className="text-sm text-white/70">Returned</div>
            </div>
            <div className="glass-panel p-4 text-center">
              <div className="text-2xl font-bold text-gray-300">{summary.pending}</div>
              <div className="text-sm text-white/70">Pending</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="glass-panel p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Outcome Filter */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Filter by Outcome
              </label>
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Outcomes</option>
                <option value="wore">Wore</option>
                <option value="loved">Loved</option>
                <option value="skipped">Skipped</option>
                <option value="returned">Returned</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Filter by Date
              </label>
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Time</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(outcomeFilter !== 'all' || dateRangeFilter !== 'all') && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-white/70">
                Showing {filteredLogs.length} of {outfitLogs.length} outfits
              </p>
              <button
                onClick={() => {
                  setOutcomeFilter('all');
                  setDateRangeFilter('all');
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Outfit Logs */}
        {filteredLogs.length === 0 ? (
          <div className="glass-panel p-12 text-center">
            <span className="material-symbols-outlined text-white/30 text-6xl mb-4">history</span>
            <h2 className="text-xl font-semibold text-white mb-2">
              {outfitLogs.length === 0 ? 'No Outfit History Yet' : 'No Matching Outfits'}
            </h2>
            <p className="text-white/70 mb-6">
              {outfitLogs.length === 0
                ? 'Your outfit history will appear here once you start approving proof cards.'
                : 'Try adjusting your filters to see more results.'}
            </p>
            {outfitLogs.length === 0 ? (
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-medium transition-all"
              >
                Start Styling
              </button>
            ) : (
              <button
                onClick={() => {
                  setOutcomeFilter('all');
                  setDateRangeFilter('all');
                }}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <OutfitHistoryCard
                key={log.id}
                log={log}
                onUpdate={() => {
                  // Refresh data after update
                  const fetchData = async () => {
                    if (!userId) return;
                    await refreshOutfitHistory(userId);
                  };
                  fetchData();
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
