'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import ClosetNav from '@/components/navigation/ClosetNav';
import { SkeletonLookDiary } from '@/components/common/SkeletonLoader';
import { EmptyLookDiary, EmptySearchResults } from '@/components/common/EmptyState';

interface ProofCard {
  id: string;
  look_name: string;
  occasion: string;
  tone_match: number;
  style_fit: number;
  skin_safe: boolean;
  owned_items: any[];
  new_items: any[];
  total_cost: number;
  approved: boolean;
  result_image_url: string;
  weather: any;
  calendar_event: string;
  created_at: string;
}

export default function LookDiaryPage() {
  const router = useRouter();
  const [proofCards, setProofCards] = useState<ProofCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // Fetch proof cards
  useEffect(() => {
    if (!userId) return;

    const fetchProofCards = async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push('/');
          return;
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/proof-cards?user_id=${userId}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch proof cards');
        }

        const data = await response.json();
        setProofCards(data.proof_cards || []);
      } catch (err) {
        console.error('Error fetching proof cards:', err);
        setError(err instanceof Error ? err.message : 'Failed to load look diary');
      } finally {
        setLoading(false);
      }
    };

    fetchProofCards();
  }, [userId, router]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6 pb-24">
        <div className="max-w-6xl mx-auto">
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
        <ClosetNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="glass-panel p-8 text-center">
            <span className="material-symbols-outlined text-red-400 text-5xl mb-4">error</span>
            <h2 className="text-xl font-semibold text-white mb-2">Error Loading Diary</h2>
            <p className="text-white/70 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6 pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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
                    <div key={card.id} className="glass-panel overflow-hidden hover:scale-105 transition-transform">
                      {/* Image */}
                      {card.result_image_url ? (
                        <div className="aspect-[3/4] bg-white/5">
                          <img
                            src={card.result_image_url}
                            alt={card.look_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[3/4] bg-white/5 flex items-center justify-center">
                          <span className="material-symbols-outlined text-white/30 text-6xl">
                            checkroom
                          </span>
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {card.look_name || 'Untitled Look'}
                        </h3>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs capitalize">
                            {card.occasion || 'Casual'}
                          </span>
                          {card.approved && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              Approved
                            </span>
                          )}
                        </div>

                        {/* Match Scores */}
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-white/70">Tone Match</span>
                            <span className="text-white font-semibold">{card.tone_match}%</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-white/70">Style Fit</span>
                            <span className="text-white font-semibold">{card.style_fit}%</span>
                          </div>
                        </div>

                        {/* Items Count */}
                        <div className="flex items-center justify-between text-sm text-white/70">
                          <span>{card.owned_items.length} owned items</span>
                          {card.new_items.length > 0 && (
                            <span>{card.new_items.length} new items</span>
                          )}
                        </div>

                        {/* Date */}
                        <p className="text-white/50 text-xs mt-2">{formatDate(card.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ClosetNav />
    </div>
  );
}
