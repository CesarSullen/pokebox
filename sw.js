// Cache version
const CACHE_NAME = "pokebox-1.0.4";
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

  // Assets
  "./assets/icon-192.png",
  "./assets/icon-512.png",
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

// Install
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
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
          .catch(() => cached);

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

  // Own files: network-first, so updates show up right away, and cache when offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response.ok) return response;

        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, response.clone());
          return response;
        });
      })
      .catch(() =>
        caches
          .match(request)
          .then((cached) => cached || caches.match("./index.html")),
      ),
  );
});
