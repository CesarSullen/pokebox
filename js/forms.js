/* ===================== FORMS ===================== */
// Regional forms are other Pokémon in the API with their own types, so Zorua de Hisui is not the same as Zorua
const formsById = new Map();
const formsByName = new Map();
const formsBySpecies = new Map();
const baseGames = new Map();

let formsRequest = null;

function loadForms() {
	if (!formsRequest) {
		formsRequest = fetch("./data/forms.json")
			.then((response) => response.json())
			.then((data) => {
				data.forms.forEach((form) => {
					formsById.set(form.id, form);
					formsByName.set(form.name, form);
					formsBySpecies.set(form.species, [...(formsBySpecies.get(form.species) || []), form]);
				});

				// Games where the original form of those species exists, as a bit mask over GAMES
				Object.entries(data.base).forEach(([species, games]) => {
					baseGames.set(Number(species), games);
				});
			});

		// A failed request must not stay cached
		formsRequest.catch(() => (formsRequest = null));
	}

	return formsRequest;
}

function hasGame(mask, gameName) {
	const index = GAMES.findIndex((game) => game.name === gameName);

	return index !== -1 && ((mask >> index) & 1) === 1;
}

// The first game where the form exists is the one that introduced it
function getNativeGame(form) {
	const index = GAMES.findIndex((game, position) => ((form.games >> position) & 1) === 1);

	return index === -1 ? null : GAMES[index].name;
}

// The Pokédex of a game lists species. Where a regional form was introduced, that form is in the game
// (Zorua de Hisui in Legends: Arceus). The original is also shown if it exists in that game too (Sneasel)
function isShownInGame(entry, gameName) {
	if (entry.form) {
		return getNativeGame(formsById.get(entry.id)) === gameName;
	}

	const forms = formsBySpecies.get(entry.species) || [];

	if (!forms.some((form) => getNativeGame(form) === gameName)) {
		return true;
	}

	return baseGames.has(entry.species) && hasGame(baseGames.get(entry.species), gameName);
}

// Games where it exists but has no entry in the Pokédex, only known for species with regional forms
function getGamesMask(entry) {
	return entry.form ? formsById.get(entry.id).games : baseGames.get(entry.species);
}
