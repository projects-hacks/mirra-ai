"use client";

import { memo, useMemo } from "react";
import { materialSymbolLigature } from "@/lib/materialSymbols";

interface CostPerWearBadgeProps {
  price?: number;
  timesWorn?: number;
  className?: string;
}

/**
 * Cost Per Wear Badge Component
 * Displays the cost-per-wear metric for closet items
 * Shows different states based on price and wear data
 */
const CostPerWearBadge = memo(function CostPerWearBadge({
  price,
  timesWorn = 0,
  className = "",
}: Readonly<CostPerWearBadgeProps>) {
  const { display, colorClass, icon } = useMemo(() => {
    // No price data
    if (!price || price <= 0) {
      return {
        display: "Price unknown",
        colorClass: "bg-gray-700 text-gray-400",
        icon: "help",
      };
    }

    // Never worn
    if (timesWorn === 0) {
      return {
        display: "Not worn yet",
        colorClass: "bg-yellow-900/30 text-yellow-400 border-yellow-700/50",
        icon: "new_releases",
      };
    }

    // Calculate CPW
    const cpw = price / timesWorn;
    const formattedCPW = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cpw);

    // Determine color based on CPW value
    let colorClass = "bg-green-900/30 text-green-400 border-green-700/50"; // Good value
    let icon = "trending_down";

    if (cpw > 50) {
      // High CPW (poor value)
      colorClass = "bg-red-900/30 text-red-400 border-red-700/50";
      icon = "trending_up";
    } else if (cpw > 20) {
      // Medium CPW (okay value)
      colorClass = "bg-orange-900/30 text-orange-400 border-orange-700/50";
      icon = "remove";
    }

    return {
      display: `${formattedCPW}/wear`,
      colorClass,
      icon,
    };
  }, [price, timesWorn]);

  const ligature = materialSymbolLigature(icon);

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${colorClass} ${className}`}
    >
      <span className="material-symbols-outlined text-[14px]">{ligature}</span>
      <span>{display}</span>
    </div>
  );
});

export default CostPerWearBadge;
