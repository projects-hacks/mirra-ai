/**
 * Retry Utility with Exponential Backoff
 * Retries failed async operations with increasing delays
 * Useful for network requests and API calls
 */

/**
 * Debounce function
 * Delays execution until after wait milliseconds have elapsed
 * since the last time it was invoked
 */
export function debounce<Args extends unknown[], Return>(
  func: (...args: Args) => Return,
  wait: number
): (...args: Args) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Args) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * Ensures function is called at most once per specified time period
 */
export function throttle<Args extends unknown[], Return>(
  func: (...args: Args) => Return,
  limit: number
): (...args: Args) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
