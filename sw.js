// Cache version
const CACHE_NAME = "pokebox-1.0.7";
const DATA_CACHE = "pokebox-data-1";
const MAX_IMAGES = 300;

const STATIC_ASSETS = [
  // Page
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/constants.js",
  "./js/api.js",
  "./js/favorites.js",
  "./js/reveal.js",
  "./js/forms.js",
  "./js/games.js",
  "./js/evolution.js",
  "./js/pokemonDetail.js",
  "./js/main.js",

  // Data
  "./data/moves.json",
  "./data/locations.json",
  "./data/items.json",
  "./data/versions.json",
  "./data/forms.json",
  "./data/extra-games.json",

  // Assets
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-512-maskable.png",
  "./assets/apple-touch-icon.png",
  "./assets/icons/arrow-right.svg",
  "./assets/icons/bug.svg",
  "./assets/icons/check.svg",
  "./assets/icons/chevron-down.svg",
  "./assets/icons/close.svg",
  "./assets/icons/dark.svg",
  "./assets/icons/dragon.svg",
  "./assets/icons/electric.svg",
  "./assets/icons/fairy.svg",
  "./assets/icons/fighting.svg",
  "./assets/icons/fire.svg",
  "./assets/icons/flying.svg",
  "./assets/icons/gamepad.svg",
  "./assets/icons/ghost.svg",
  "./assets/icons/grass.svg",
  "./assets/icons/ground.svg",
  "./assets/icons/height.svg",
  "./assets/icons/ice.svg",
  "./assets/icons/layers.svg",
  "./assets/icons/mars.svg",
  "./assets/icons/normal.svg",
  "./assets/icons/poison.svg",
  "./assets/icons/pokeball.svg",
  "./assets/icons/psychic.svg",
  "./assets/icons/rock.svg",
  "./assets/icons/search.svg",
  "./assets/icons/sigma.svg",
  "./assets/icons/sparkles.svg",
  "./assets/icons/star-outline.svg",
  "./assets/icons/star.svg",
  "./assets/icons/stat-attack.svg",
  "./assets/icons/stat-defense.svg",
  "./assets/icons/stat-hp.svg",
  "./assets/icons/stat-special-attack.svg",
  "./assets/icons/stat-special-defense.svg",
  "./assets/icons/stat-speed.svg",
  "./assets/icons/steel.svg",
  "./assets/icons/venus.svg",
  "./assets/icons/water.svg",
  "./assets/icons/weight.svg",

  // Typography
  "./typography/inter-variable.woff2",
];

// Max time to wait for the network before using the cache
const NETWORK_TIMEOUT = 5000;

// Files needed to render the app: if these fail, the install fails
const CORE_ASSETS = STATIC_ASSETS.slice(0, 13);

// Install
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS);

      // The rest is best effort, one missing file must not block the update
      await Promise.allSettled(
        STATIC_ASSETS.slice(CORE_ASSETS.length).map((url) => cache.add(url)),
      );
    })(),
  );
});

// Activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== DATA_CACHE)
          .map((k) => caches.delete(k)),
      );

      await self.clients.claim();
    })(),
  );
});

// After one request times out, the cache answers right away for a while,
// so a slow connection costs one wait, not one per file
const SLOW_WINDOW = 30000;
let slowUntil = 0;

// Network-first, but a slow connection falls back to the cache instead of leaving the app blank
async function networkFirst(request) {
  const started = Date.now();
  const fromCache = () => caches.match(request, { ignoreSearch: true });

  const network = fetch(request).then(async (response) => {
    if (Date.now() - started < NETWORK_TIMEOUT) slowUntil = 0;

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  });
  network.catch(() => {});

  if (Date.now() < slowUntil) {
    const hit = await fromCache();
    if (hit) return hit;
  }

  const slowFallback = new Promise((resolve) =>
    setTimeout(async () => {
      const hit = await fromCache();
      if (hit) slowUntil = Date.now() + SLOW_WINDOW;
      resolve(hit || null);
    }, NETWORK_TIMEOUT),
  );

  try {
    const first = await Promise.race([network, slowFallback]);
    if (first) return first;

    // Nothing cached yet: keep waiting for the network
    return await network;
  } catch (error) {
    return (
      (await fromCache()) ||
      (request.mode === "navigate" ? await caches.match("./index.html") : null) ||
      Response.error()
    );
  }
}

// Keep only the newest images so the cache does not grow forever
async function trimImages(cache) {
  const keys = await cache.keys();
  const images = keys.filter((request) =>
    request.url.includes("raw.githubusercontent.com"),
  );

  await Promise.all(
    images
      .slice(0, Math.max(images.length - MAX_IMAGES, 0))
      .map((request) => cache.delete(request)),
  );
}

// Fetch
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API: answer from cache and refresh it in the background
  if (url.hostname === "pokeapi.co") {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached || Response.error());

        return cached || network;
      }),
    );
    return;
  }

  // Sprites: cache-first
  if (url.hostname === "raw.githubusercontent.com") {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);

        // Opaque responses are not stored because browsers count them as very large
        if (response.ok && response.type !== "opaque") {
          await cache.put(request, response.clone());
          trimImages(cache);
        }

        return response;
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Own files: network-first, so updates show up right away, and cache when offline or slow
  event.respondWith(networkFirst(request));
});
