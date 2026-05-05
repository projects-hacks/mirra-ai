// Mirra PWA Service Worker - Enterprise Implementation
// Version: 2.0.0
// Strategy: Network-first for dynamic content, Cache-first for static assets

const CACHE_VERSION = "v2.0.0";
const CACHE_NAMES = {
  static: `mirra-static-${CACHE_VERSION}`,
  dynamic: `mirra-dynamic-${CACHE_VERSION}`,
  images: `mirra-images-${CACHE_VERSION}`,
};

const STATIC_ASSETS = [
  "/",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.json",
];

const CACHE_MAX_AGE = {
  static: 7 * 24 * 60 * 60 * 1000, // 7 days
  dynamic: 1 * 60 * 60 * 1000, // 1 hour
  images: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// ── Install Event ──────────────────────────────────
globalThis.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker v2.0.0");
  
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      console.log("[SW] Precaching static assets");
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log("[SW] Skip waiting");
      return globalThis.skipWaiting();
    })
  );
});

// ── Activate Event ─────────────────────────────────
globalThis.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker v2.0.0");
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Delete old caches
      const cachesToDelete = cacheNames.filter((cacheName) => {
        return !Object.values(CACHE_NAMES).includes(cacheName);
      });
      
      console.log("[SW] Deleting old caches:", cachesToDelete);
      return Promise.all(
        cachesToDelete.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      console.log("[SW] Claiming clients");
      return globalThis.clients.claim();
    })
  );
});

// ── Fetch Event ────────────────────────────────────
globalThis.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-cacheable requests
  if (shouldBypassCache(event.request, url)) return;

  event.respondWith(routeRequest(event.request, url));
});

/** Determine if a request should bypass the service worker entirely */
function shouldBypassCache(request, url) {
  return (
    request.method !== "GET" ||
    url.pathname.startsWith("/_next/") ||
    url.protocol === "chrome-extension:" ||
    url.pathname.includes("/auth/callback") ||
    url.pathname.includes("/auth/") ||
    url.protocol === "ws:" ||
    url.protocol === "wss:" ||
    (url.origin !== globalThis.location.origin && url.pathname.startsWith("/api/"))
  );
}

/** Route request to correct caching strategy */
async function routeRequest(request, url) {
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase.co")) {
    return networkFirstStrategy(request, CACHE_NAMES.dynamic);
  }
  if (request.destination === "image") {
    return cacheFirstStrategy(request, CACHE_NAMES.images);
  }
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    url.pathname.startsWith("/_next/static/")
  ) {
    return cacheFirstStrategy(request, CACHE_NAMES.static);
  }
  return networkFirstStrategy(request, CACHE_NAMES.dynamic);
}

// ── Caching Strategies ─────────────────────────────

/**
 * Network-first strategy: Try network, fall back to cache
 * Best for: API calls, dynamic content, HTML pages
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    // Only cache successful responses
    if (request.method === "GET" && networkResponse?.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log("[SW] Network failed, trying cache:", request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If both network and cache fail, return offline page for navigation requests
    if (request.mode === "navigate") {
      return (
        (await caches.match("/offline.html")) ??
        new Response(createOfflinePage(), {
          headers: { "Content-Type": "text/html" },
        })
      );
    }
    
    throw error;
  }
}

/**
 * Cache-first strategy: Try cache, fall back to network
 * Best for: Static assets, images, fonts
 */
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Check if cache is stale
    const cacheDate = new Date(cachedResponse.headers.get("date"));
    const now = new Date();
    const maxAge = CACHE_MAX_AGE.static;
    
    if (now - cacheDate < maxAge) {
      return cachedResponse;
    }
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (request.method === "GET" && networkResponse?.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Create inline offline page
 */
function createOfflinePage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - Mirra</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          padding: 20px;
        }
        .container {
          text-align: center;
          max-width: 400px;
        }
        .icon { font-size: 64px; margin-bottom: 20px; }
        h1 { font-size: 32px; margin-bottom: 16px; }
        p { font-size: 16px; opacity: 0.9; margin-bottom: 24px; }
        button {
          background: white;
          color: #667eea;
          border: none;
          padding: 12px 32px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        button:hover { transform: scale(1.05); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📡</div>
        <h1>You're Offline</h1>
        <p>It looks like you've lost your internet connection. Please check your network and try again.</p>
        <button onclick="window.location.reload()">Try Again</button>
      </div>
    </body>
    </html>
  `;
}

// ── Background Sync ────────────────────────────────
globalThis.addEventListener("sync", (event) => {
  console.log("[SW] Background sync:", event.tag);
  
  if (event.tag === "sync-failed-requests") {
    event.waitUntil(syncFailedRequests());
  }
});

/**
 * Retry failed requests when back online
 */
async function syncFailedRequests() {
  // This would integrate with IndexedDB to store failed requests
  // For now, just log
  console.log("[SW] Syncing failed requests...");
}

// ── Message Handler ────────────────────────────────
globalThis.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);
  
  if (event.data?.type === "SKIP_WAITING") {
    globalThis.skipWaiting();
  }
  
  if (event.data?.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log("[SW] Service worker v2.0.0 loaded");
