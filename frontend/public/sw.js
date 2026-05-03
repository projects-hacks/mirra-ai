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
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker v2.0.0");
  
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      console.log("[SW] Precaching static assets");
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log("[SW] Skip waiting");
      return self.skipWaiting();
    })
  );
});

// ── Activate Event ─────────────────────────────────
self.addEventListener("activate", (event) => {
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
      return self.clients.claim();
    })
  );
});

// ── Fetch Event ────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip service worker for:
  // 1. Chrome extensions
  if (url.protocol === "chrome-extension:") {
    return;
  }

  // 2. OAuth callbacks (critical - must not be cached)
  if (url.pathname.includes("/auth/callback") || url.pathname.includes("/auth/")) {
    console.log("[SW] Bypassing cache for auth:", url.pathname);
    return;
  }

  // 3. API calls (network-first with fallback)
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase.co")) {
    event.respondWith(networkFirstStrategy(request, CACHE_NAMES.dynamic));
    return;
  }

  // 4. WebSocket connections
  if (url.protocol === "ws:" || url.protocol === "wss:") {
    return;
  }

  // 5. Images (cache-first with network fallback)
  if (request.destination === "image") {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.images));
    return;
  }

  // 6. Static assets (cache-first with network fallback)
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAMES.static));
    return;
  }

  // 7. HTML pages (network-first with cache fallback)
  if (request.destination === "document" || request.mode === "navigate") {
    event.respondWith(networkFirstStrategy(request, CACHE_NAMES.dynamic));
    return;
  }

  // Default: network-first
  event.respondWith(networkFirstStrategy(request, CACHE_NAMES.dynamic));
});

// ── Caching Strategies ─────────────────────────────

/**
 * Network-first strategy: Try network, fall back to cache
 * Best for: API calls, dynamic content, HTML pages
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    // Only cache successful responses
    if (networkResponse && networkResponse.status === 200) {
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
      return caches.match("/offline.html") || new Response(
        createOfflinePage(),
        { headers: { "Content-Type": "text/html" } }
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
    
    if (networkResponse && networkResponse.status === 200) {
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
self.addEventListener("sync", (event) => {
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
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);
  
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === "CLEAR_CACHE") {
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
