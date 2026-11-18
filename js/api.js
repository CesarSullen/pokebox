/* ===================== API ===================== */
const cache = new Map();

// A request that hangs must fail so the app can show an error and retry
const FETCH_TIMEOUT = 12000;
const FETCH_ATTEMPTS = 2;

async function requestJson(url) {
	for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

		try {
			const response = await fetch(url, { signal: controller.signal });

			if (!response.ok) {
				const error = new Error(`Request failed: ${response.status}`);
				// A missing resource will not appear by asking again
				error.final = response.status === 404;
				throw error;
			}

			// Reading the body is inside the timeout too
			return await response.json();
		} catch (error) {
			if (error.final || attempt === FETCH_ATTEMPTS) throw error;
		} finally {
			clearTimeout(timer);
		}
	}
}

function fetchData(path) {
	if (!cache.has(path)) {
		const request = requestJson(`${API_URL}/${path}`);

		// A failed request must not stay cached
		request.catch(() => cache.delete(path));
		cache.set(path, request);
	}

	return cache.get(path);
}
