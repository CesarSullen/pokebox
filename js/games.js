/* ===================== GAMES ===================== */
// The Pokémon of a game are the ones in its Pokédexes, so each one only shows up in the games where it can be found
const gameCache = new Map();

function getGamePokemon(gameName) {
	if (!gameCache.has(gameName)) {
		const request = fetchData(`version-group/${gameName}`)
			.then((game) =>
				Promise.all(game.pokedexes.map((pokedex) => fetchData(`pokedex/${pokedex.name}`)))
			)
			.then((pokedexes) => {
				const ids = new Set();

				pokedexes.forEach((pokedex) => {
					pokedex.pokemon_entries.forEach((entry) => {
						ids.add(getIdFromUrl(entry.pokemon_species.url));
					});
				});

				return ids;
			});

		// A failed request must not stay cached
		request.catch(() => gameCache.delete(gameName));
		gameCache.set(gameName, request);
	}

	return gameCache.get(gameName);
}

async function getPokemonGames(id) {
	const games = await Promise.all(GAMES.map((game) => getGamePokemon(game.name)));

	return GAMES.filter((game, index) => games[index].has(id));
}

// Pokémon that can be obtained in a game without having an entry in its Pokédex (legendaries, gifts, what evolves from them)
const extraGames = new Map();

let extraRequest = null;

function loadExtraGames() {
	if (!extraRequest) {
		extraRequest = fetch("./data/extra-games.json")
			.then((response) => response.json())
			.then((data) => {
				Object.entries(data).forEach(([game, ids]) => extraGames.set(game, new Set(ids)));
			});

		// A failed request must not stay cached
		extraRequest.catch(() => (extraRequest = null));
	}

	return extraRequest;
}

function getExtraGames(gameName) {
	return extraGames.get(gameName) || new Set();
}
