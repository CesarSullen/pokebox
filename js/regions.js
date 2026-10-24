/* ===================== REGIONS ===================== */
// A Pokémon can belong to several regional Pokédexes, so it can show up in more than one region
const regionCache = new Map();

function getRegionPokemon(regionName) {
	if (!regionCache.has(regionName)) {
		const request = fetchData(`region/${regionName}`)
			.then((region) =>
				Promise.all(region.pokedexes.map((pokedex) => fetchData(`pokedex/${pokedex.name}`)))
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
		request.catch(() => regionCache.delete(regionName));
		regionCache.set(regionName, request);
	}

	return regionCache.get(regionName);
}

async function getPokemonRegions(id) {
	const regions = await Promise.all(REGIONS.map((region) => getRegionPokemon(region.name)));

	return REGIONS.filter((region, index) => regions[index].has(id));
}
