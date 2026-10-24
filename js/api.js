/* ===================== API ===================== */
const cache = new Map();

function fetchData(path) {
	if (!cache.has(path)) {
		const request = fetch(`${API_URL}/${path}`).then((response) => {
			if (!response.ok) {
				throw new Error(`Request failed: ${response.status}`);
			}
			return response.json();
		});

		// A failed request must not stay cached
		request.catch(() => cache.delete(path));
		cache.set(path, request);
	}

	return cache.get(path);
}
