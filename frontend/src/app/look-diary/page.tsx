'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { proofCardsApi } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import ClosetSubNav from '@/components/navigation/ClosetSubNav';
import { SkeletonLookDiary } from '@/components/common/SkeletonLoader';
import { EmptyLookDiary, EmptySearchResults } from '@/components/common/EmptyState';
import LookDiaryCard from '@/components/closet/LookDiaryCard';

interface ProofCard {
  id: string;
  look_name: string;
  occasion: string;
  tone_match: number;
  style_fit: number;
  skin_safe: boolean;
  owned_items: ProofCardItem[];
  new_items: ProofCardItem[];
  total_cost: number;
  approved: boolean;
  result_image_url: string;
  weather: WeatherSnapshot | null;
  calendar_event: string;
  created_at: string;
}

interface ProofCardItem {
  id?: string;
  name?: string;
  category?: string;
  brand?: string;
  price?: number;
  url?: string;
}

interface WeatherSnapshot {
  temperature?: number;
  condition?: string;
}

export default function LookDiaryPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  // Filter states
  const [occasionFilter, setOccasionFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');

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

  const { data: proofCards = [], error, isLoading: loading } = useSWR<ProofCard[]>(
    userId ? (["look-diary", userId] as const) : null,
    async ([, currentUserId]: readonly [string, string]) => {
      const cards = await proofCardsApi.list(currentUserId);
      return cards as ProofCard[];
    }
  );

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

  // Apply filters
  const filteredCards = useMemo(() => {
    let filtered = [...proofCards];

    // Apply occasion filter
    if (occasionFilter !== 'all') {
      filtered = filtered.filter((card) => card.occasion === occasionFilter);
    }

    // Apply approval filter
    if (approvalFilter !== 'all') {
      const isApproved = approvalFilter === 'approved';
      filtered = filtered.filter((card) => card.approved === isApproved);
    }

    // Apply date range filter
    if (dateRangeFilter !== 'all') {
      const { start } = getDateRange(dateRangeFilter);
      if (start) {
        filtered = filtered.filter((card) => new Date(card.created_at) >= new Date(start));
      }
    }

    return filtered;
  }, [proofCards, occasionFilter, approvalFilter, dateRangeFilter]);

  // Group by month for timeline view
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, ProofCard[]> = {};

    filteredCards.forEach((card) => {
      const date = new Date(card.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(card);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, cards]) => ({
        key,
        label: new Date(cards[0].created_at).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        }),
        cards,
      }));
  }, [filteredCards]);

  // Get unique occasions
  const uniqueOccasions = useMemo(() => {
    const occasions = new Set(proofCards.map((card) => card.occasion).filter(Boolean));
    return Array.from(occasions).sort();
  }, [proofCards]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6 pb-10">
        <div className="mx-auto max-w-6xl">
          <ClosetSubNav variant="gradient" />
          {/* Header Skeleton */}
          <div className="mb-6">
            <div className="h-8 w-48 bg-white/10 rounded animate-pulse mb-4"></div>
          </div>
          
          {/* Filters Skeleton */}
          <div className="glass-panel p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-white/10 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
          
          {/* Look Diary Skeleton */}
          <SkeletonLookDiary count={6} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6 pb-10">
        <div className="mx-auto max-w-6xl space-y-4">
          <ClosetSubNav variant="gradient" />
          <div className="glass-panel p-8 text-center">
            <span className="material-symbols-outlined mb-4 text-5xl text-red-400">error</span>
            <h2 className="mb-2 text-xl font-semibold text-white">Error loading diary</h2>
            <p className="banner-error mb-4 text-left">
              {error instanceof Error ? error.message : "Failed to load look diary"}
            </p>
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
      <div className="mx-auto max-w-6xl">
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
            <h1 className="text-3xl font-bold text-white">Look Diary</h1>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-panel p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Occasion Filter */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Filter by Occasion
              </label>
              <select
                value={occasionFilter}
                onChange={(e) => setOccasionFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Occasions</option>
                {uniqueOccasions.map((occasion) => (
                  <option key={occasion} value={occasion}>
                    {occasion}
                  </option>
                ))}
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

            {/* Approval Filter */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Filter by Status
              </label>
              <select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Looks</option>
                <option value="approved">Approved</option>
                <option value="not_approved">Not Approved</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(occasionFilter !== 'all' || dateRangeFilter !== 'all' || approvalFilter !== 'all') && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-white/70">
                Showing {filteredCards.length} of {proofCards.length} looks
              </p>
              <button
                onClick={() => {
                  setOccasionFilter('all');
                  setDateRangeFilter('all');
                  setApprovalFilter('all');
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Timeline View */}
        {filteredCards.length === 0 ? (
          proofCards.length === 0 ? (
            <EmptyLookDiary onStartStyling={() => router.push('/')} />
          ) : (
            <EmptySearchResults
              onClearFilters={() => {
                setOccasionFilter('all');
                setDateRangeFilter('all');
                setApprovalFilter('all');
              }}
            />
          )
        ) : (
          <div className="space-y-8">
            {groupedByMonth.map((group) => (
              <div key={group.key}>
                {/* Month Header */}
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-xl font-semibold text-white">{group.label}</h2>
                  <div className="flex-1 h-px bg-white/20"></div>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.cards.map((card) => (
                    <LookDiaryCard
                      key={card.id}
                      proofCard={{
                        id: card.id,
                        result_image_url: card.result_image_url,
                        look_name: card.look_name || 'Untitled Look',
                        occasion: card.occasion || 'casual',
                        created_at: card.created_at,
                        tone_match: card.tone_match,
                        style_fit: card.style_fit,
                        skin_safe: card.skin_safe,
                        approved: card.approved,
                        total_cost: card.total_cost,
                        owned_items: card.owned_items.map((item, index) => ({
                          id: item.id ?? `${card.id}-owned-${index}`,
                          name: item.name ?? 'Closet item',
                          category: item.category ?? 'unknown',
                        })),
                        new_items: card.new_items.map((item) => ({
                          name: item.name ?? 'Recommended item',
                          price: item.price ?? 0,
                          url: item.url ?? '',
                        })),
                        weather: card.weather
                          ? {
                              temperature: card.weather.temperature ?? 0,
                              condition: card.weather.condition ?? 'Unknown',
                            }
                          : undefined,
                        calendar_event: typeof card.calendar_event === 'string'
                          ? undefined
                          : card.calendar_event,
                        is_favorite: false,
                      }}
                      onFavoriteToggle={async (id, isFavorite) => {
                        // TODO: Implement favorite toggle API call
                        console.log('Toggle favorite:', id, isFavorite);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
