/* ===================== FAVORITES ===================== */
const FAVORITES_KEY = "pokebox-favorites";

function getFavorites() {
	try {
		const favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY));
		return Array.isArray(favorites) ? favorites.filter(Number.isInteger) : [];
	} catch (error) {
		return [];
	}
}

function isFavorite(id) {
	return getFavorites().includes(id);
}

function toggleFavorite(id) {
	const favorites = getFavorites();
	const updated = favorites.includes(id)
		? favorites.filter((favorite) => favorite !== id)
		: [...favorites, id];

	try {
		localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
	} catch (error) {
		console.error("Favorites could not be saved:", error);
	}

	return updated.includes(id);
}
