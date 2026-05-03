/**
 * Radial Progress Component
 * SVG-based circular progress indicator with percentage display
 */

"use client";

interface RadialProgressProps {
  value: number; // 0-100
  size?: number; // diameter in pixels
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showValue?: boolean;
  label?: string;
  className?: string;
}

export default function RadialProgress({
  value,
  size = 80,
  strokeWidth = 6,
  color = 'var(--primary)',
  backgroundColor = 'var(--surface-container)',
  showValue = true,
  label,
  className = '',
}: RadialProgressProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));
  
  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;
  
  // Center point
  const center = size / 2;

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
        
        {/* Value text (rotated back to normal) */}
        {showValue && (
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dominantBaseline="central"
            className="transform rotate-90 origin-center font-sans font-bold text-sm"
            fill="var(--on-surface)"
            style={{ fontSize: size * 0.2 }}
          >
            {Math.round(clampedValue)}
          </text>
        )}
      </svg>
      
      {/* Label */}
      {label && (
        <span className="text-xs text-[var(--on-surface-variant)] text-center">
          {label}
        </span>
      )}
    </div>
  );
}
