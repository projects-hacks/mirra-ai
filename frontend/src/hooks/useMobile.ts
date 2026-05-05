'use client';

import { useState, useEffect } from 'react';

function getIsMobile() {
  return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
}

function getIsTouchDevice() {
  if (typeof window === 'undefined') return false;

  const nav = navigator as Navigator & { msMaxTouchPoints?: number };
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (nav.msMaxTouchPoints ?? 0) > 0
  );
}

function getScreenSize() {
  if (typeof window === 'undefined') {
    return {
      width: 0,
      height: 0,
      isMobile: false,
      isTablet: false,
      isDesktop: false,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    width,
    height,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
  };
}

/**
 * Hook to detect if device is mobile
 */
export function useMobile() {
  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    const checkMobile = () => setIsMobile(getIsMobile());
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

/**
 * Hook to detect touch device
 */
export function useTouchDevice() {
  const [isTouch] = useState(getIsTouchDevice);
  return isTouch;
}

/**
 * Hook to get current screen size
 */
export function useScreenSize() {
  const [screenSize, setScreenSize] = useState(getScreenSize);

  useEffect(() => {
    const updateSize = () => setScreenSize(getScreenSize());
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return screenSize;
}

/**
 * Hook to detect network status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
