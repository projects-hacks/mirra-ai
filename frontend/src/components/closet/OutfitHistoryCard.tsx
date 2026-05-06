'use client';

/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';
import { getApiUrl } from '@/lib/constants';

interface OutfitWeather {
  temperature?: number;
  condition?: string;
}

interface OutfitItem {
  name?: string;
  category?: string;
  brand?: string;
}

interface OutfitHistoryCardProps {
  log: {
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
  };
  onUpdate?: () => void;
}

export default function OutfitHistoryCard({ log, onUpdate }: OutfitHistoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  
  // Feedback form state
  const [outcome, setOutcome] = useState<string>(log.outcome);
  const [rating, setRating] = useState<number>(log.rating || 0);
  const [feedback, setFeedback] = useState<string>(log.feedback || '');
  const [compliments, setCompliments] = useState<boolean>(log.compliments || false);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Get outcome badge styling
  const getOutcomeBadgeClass = (outcome: string) => {
    switch (outcome) {
      case 'wore':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'loved':
        return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      case 'skipped':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'returned':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'pending':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  // Get outcome icon
  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'wore':
        return 'check_circle';
      case 'loved':
        return 'favorite';
      case 'skipped':
        return 'cancel';
      case 'returned':
        return 'undo';
      case 'pending':
        return 'schedule';
      default:
        return 'help';
    }
  };

  // Handle outcome update
  const handleUpdateOutcome = async () => {
    try {
      setIsUpdating(true);

      const response = await fetch(getApiUrl(`/api/outfit-history/${log.id}/outcome`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outcome,
          rating: rating > 0 ? rating : null,
          feedback: feedback.trim() || null,
          compliments,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update outcome');
      }

      setShowFeedbackForm(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error updating outcome:', err);
      alert('Failed to update outfit outcome');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="glass-panel p-6 hover:bg-white/10 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-white capitalize">
              {log.occasion || 'Casual Outfit'}
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getOutcomeBadgeClass(
                log.outcome
              )}`}
            >
              <span className="material-symbols-outlined text-sm">
                {getOutcomeIcon(log.outcome)}
              </span>
              {log.outcome.charAt(0).toUpperCase() + log.outcome.slice(1)}
            </span>
          </div>
          <p className="text-white/70 text-sm">{formatDate(log.created_at)}</p>
        </div>

        {/* Rating */}
        {log.rating && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`material-symbols-outlined text-sm ${
                  i < log.rating! ? 'text-yellow-400' : 'text-white/20'
                }`}
              >
                star
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Items Preview */}
      <div className="mb-4">
        <p className="text-white/70 text-sm mb-2">
          {log.items.length} {log.items.length === 1 ? 'item' : 'items'}
        </p>
        <div className="flex flex-wrap gap-2">
          {log.items.slice(0, 5).map((item, index) => (
            <div
              key={index}
              className="px-3 py-1 bg-white/5 rounded-lg text-sm text-white/80"
            >
              {item.name || item.category}
            </div>
          ))}
          {log.items.length > 5 && (
            <div className="px-3 py-1 bg-white/5 rounded-lg text-sm text-white/60">
              +{log.items.length - 5} more
            </div>
          )}
        </div>
      </div>

      {/* Feedback */}
      {log.feedback && (
        <div className="mb-4">
          <p className="text-white/90 text-sm italic">"{log.feedback}"</p>
        </div>
      )}

      {/* Compliments Badge */}
      {log.compliments && (
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-500/20 text-pink-300 rounded-lg text-sm mb-4">
          <span className="material-symbols-outlined text-sm">thumb_up</span>
          Received compliments
        </div>
      )}

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
      >
        {isExpanded ? 'Show less' : 'Show more'}
        <span className="material-symbols-outlined text-sm">
          {isExpanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
          {/* Weather */}
          {log.weather && (
            <div>
              <h4 className="text-sm font-medium text-white/70 mb-2">Weather</h4>
              <div className="flex items-center gap-2 text-sm text-white/80">
                <span className="material-symbols-outlined">thermostat</span>
                {log.weather.temperature}°F • {log.weather.condition}
              </div>
            </div>
          )}

          {/* All Items */}
          <div>
            <h4 className="text-sm font-medium text-white/70 mb-2">All Items</h4>
            <div className="grid grid-cols-2 gap-2">
              {log.items.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-white/5 rounded-lg"
                >
                  <p className="text-sm font-medium text-white">{item.name || item.category}</p>
                  {item.brand && (
                    <p className="text-xs text-white/60">{item.brand}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Photos */}
          {log.photos && log.photos.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-white/70 mb-2">Photos</h4>
              <div className="grid grid-cols-3 gap-2">
                {log.photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Outfit photo ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Update Outcome Button (only for pending) */}
          {log.outcome === 'pending' && !showFeedbackForm && (
            <button
              onClick={() => setShowFeedbackForm(true)}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-medium transition-all"
            >
              Update Outcome
            </button>
          )}

          {/* Feedback Form */}
          {showFeedbackForm && (
            <div className="space-y-4 p-4 bg-white/5 rounded-lg">
              <h4 className="text-sm font-medium text-white">How did it go?</h4>

              {/* Outcome Selection */}
              <div>
                <label className="block text-sm text-white/70 mb-2">Outcome</label>
                <div className="grid grid-cols-2 gap-2">
                  {['wore', 'loved', 'skipped', 'returned'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setOutcome(opt)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        outcome === opt
                          ? 'bg-purple-500 border-purple-500 text-white'
                          : 'border-white/20 text-white/70 hover:border-white/40'
                      }`}
                    >
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm text-white/70 mb-2">Rating</label>
                <div className="flex gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setRating(i + 1)}
                      className="text-2xl transition-colors"
                    >
                      <span
                        className={`material-symbols-outlined ${
                          i < rating ? 'text-yellow-400' : 'text-white/20'
                        }`}
                      >
                        star
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Text */}
              <div>
                <label className="block text-sm text-white/70 mb-2">Feedback (optional)</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="How did you feel? Any notes?"
                  rows={3}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Compliments Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compliments}
                  onChange={(e) => setCompliments(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-white/80">Received compliments</span>
              </label>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateOutcome}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-medium transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowFeedbackForm(false)}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
