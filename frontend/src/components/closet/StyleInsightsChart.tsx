'use client';

interface StyleInsightsChartProps {
  profile: {
    top_colors: string[];
    top_categories: Record<string, number>;
    top_brands: string[];
    formality_avg: number;
    outfit_success_rate: number;
    avg_cost_per_wear: number;
    total_outfits: number;
  };
}

export default function StyleInsightsChart({ profile }: StyleInsightsChartProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Get formality label
  const getFormalityLabel = (value: number) => {
    if (value < 0.3) return 'Very Casual';
    if (value < 0.5) return 'Casual';
    if (value < 0.7) return 'Smart Casual';
    if (value < 0.9) return 'Business';
    return 'Formal';
  };

  // Calculate max category count for bar chart scaling
  const maxCategoryCount = Math.max(...Object.values(profile.top_categories));

  return (
    <div className="space-y-6">
      {/* Color Palette */}
      {profile.top_colors.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--on-surface)' }}>
            Your Color Palette
          </h3>
          <div className="flex flex-wrap gap-4">
            {profile.top_colors.map((color, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <div
                  className="w-16 h-16 rounded-full border-2"
                  style={{
                    background: color.startsWith('#') ? color : 'var(--surface-variant)',
                    borderColor: 'var(--outline)',
                  }}
                  title={color}
                />
                <span className="text-xs capitalize" style={{ color: 'var(--on-surface-variant)' }}>
                  {color}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Distribution */}
      {Object.keys(profile.top_categories).length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--on-surface)' }}>
            Category Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(profile.top_categories)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => (
                <div key={category}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm capitalize" style={{ color: 'var(--on-surface)' }}>
                      {category}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
                      {count}
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: 'var(--surface-variant)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(count / maxCategoryCount) * 100}%`,
                        background: 'var(--primary)',
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top Brands */}
      {profile.top_brands.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--on-surface)' }}>
            Favorite Brands
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.top_brands.map((brand, index) => (
              <span
                key={index}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: 'var(--primary-container)',
                  color: 'var(--on-primary-container)',
                }}
              >
                {brand}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Formality Level */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--on-surface)' }}>
          Style Formality
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span style={{ color: 'var(--on-surface-variant)' }}>Casual</span>
            <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>
              {getFormalityLabel(profile.formality_avg)}
            </span>
            <span style={{ color: 'var(--on-surface-variant)' }}>Formal</span>
          </div>
          <div
            className="h-3 rounded-full overflow-hidden relative"
            style={{ background: 'var(--surface-variant)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${profile.formality_avg * 100}%`,
                background: 'linear-gradient(to right, var(--primary), var(--secondary))',
              }}
            />
            <div
              className="absolute top-0 w-1 h-full bg-white/50"
              style={{ left: `${profile.formality_avg * 100}%` }}
            />
          </div>
          <p className="text-center text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            {(profile.formality_avg * 100).toFixed(0)}% formal
          </p>
        </div>
      </div>

      {/* Success Rate */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--on-surface)' }}>
          Outfit Success Rate
        </h3>
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="var(--surface-variant)"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="var(--success)"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - profile.outfit_success_rate)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold" style={{ color: 'var(--success)' }}>
                {(profile.outfit_success_rate * 100).toFixed(0)}%
              </span>
              <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                Success
              </span>
            </div>
          </div>
        </div>
        <p className="text-center text-sm mt-4" style={{ color: 'var(--on-surface-variant)' }}>
          Based on {profile.total_outfits} outfits
        </p>
      </div>

      {/* Average Cost Per Wear */}
      {profile.avg_cost_per_wear > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--on-surface)' }}>
            Average Cost Per Wear
          </h3>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2" style={{ color: 'var(--primary)' }}>
              {formatCurrency(profile.avg_cost_per_wear)}
            </div>
            <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
              per outfit this week
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
