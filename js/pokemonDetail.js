/* ===================== ELEMENTS ===================== */
const detail = document.getElementById("detail");
const detailBackdrop = document.getElementById("detailBackdrop");
const detailClose = document.getElementById("detailClose");
const detailPlaceholder = document.getElementById("detailPlaceholder");
const detailBody = document.getElementById("detailBody");
const detailHero = document.getElementById("detailHero");
const detailId = document.getElementById("detailId");
const detailName = document.getElementById("detailName");
const detailImg = document.getElementById("detailImg");
const detailTypes = document.getElementById("detailTypes");
const detailDescription = document.getElementById("detailDescription");
const detailHeight = document.getElementById("detailHeight");
const detailWeight = document.getElementById("detailWeight");
const detailStats = document.getElementById("detailStats");
const detailWeaknesses = document.getElementById("detailWeaknesses");
const detailResistances = document.getElementById("detailResistances");
const detailAbilities = document.getElementById("detailAbilities");
const detailMoves = document.getElementById("detailMoves");
const detailMovesCount = document.getElementById("detailMovesCount");
const detailLocations = document.getElementById("detailLocations");
const detailGenus = document.getElementById("detailGenus");
const detailForms = document.getElementById("detailForms");
const detailFusion = document.getElementById("detailFusion");
const detailExtraGames = document.getElementById("detailExtraGames");
const extraGamesLabel = document.getElementById("extraGamesLabel");
const shinyBtn = document.getElementById("shinyBtn");
const detailBadges = document.getElementById("detailBadges");
const detailGender = document.getElementById("detailGender");
const detailEggGroups = document.getElementById("detailEggGroups");
const detailCapture = document.getElementById("detailCapture");
const detailEvolution = document.getElementById("detailEvolution");
const abilityInfo = document.getElementById("abilityInfo");
const detailGeneration = document.getElementById("detailGeneration");
const detailGames = document.getElementById("detailGames");
const movesControls = document.getElementById("movesControls");
const movesGame = document.getElementById("movesGame");
const locationsControls = document.getElementById("locationsControls");
const locationsGame = document.getElementById("locationsGame");
const favoriteBtn = document.getElementById("favoriteBtn");

const desktopQuery = window.matchMedia("(min-width: 1000px)");

let currentPokemonId = null;
let currentPokemon = null;
let showShiny = false;
let movesByGame = new Map();
let placesByVersion = new Map();
let detailRequest = 0;
let locationsLoadedFor = null;

/* ===================== OPEN AND CLOSE ===================== */
async function openDetail(id) {
	const request = ++detailRequest;
	currentPokemonId = id;

	detail.classList.add("open");
	detailBackdrop.classList.add("open");
	document.body.classList.add("sheet-open");
	updateDetailAccess();
	markSelectedCard();

	detailPlaceholder.hidden = true;
	detailBody.hidden = false;
	detailBody.classList.add("loading");

	try {
		// The forms are needed to tell which one is being shown
		const [pokemon] = await Promise.all([
			fetchData(`pokemon/${id}`),
			loadForms().catch((error) => console.error("Error fetching forms:", error)),
		]);
		if (request !== detailRequest) {
			return;
		}

		renderPokemon(pokemon);
		detailBody.classList.remove("loading");

		loadSpecies(pokemon, request);
		loadMatchups(pokemon, request);
		loadAbilities(pokemon, request);
		loadGames(pokemon, request);
		loadMoves(pokemon, request);
	} catch (error) {
		console.error(error);
		detailBody.hidden = true;
		detailPlaceholder.hidden = false;
		detailPlaceholder.textContent =
			"No se pudo cargar este Pokémon. Inténtalo de nuevo.";
	}
}

function closeDetail() {
	detailRequest++;
	currentPokemonId = null;

	detail.classList.remove("open");
	detailBackdrop.classList.remove("open");
	document.body.classList.remove("sheet-open");
	updateDetailAccess();
	markSelectedCard();

	detailBody.hidden = true;
	detailPlaceholder.hidden = false;
	detailPlaceholder.textContent = "Selecciona un Pokémon para ver su información.";
	document.title = "Pokébox";
}

// The sheet must not be reachable with the keyboard while it is off screen
function updateDetailAccess() {
	detail.inert = !desktopQuery.matches && !detail.classList.contains("open");
}
desktopQuery.addEventListener("change", updateDetailAccess);
updateDetailAccess();

function markSelectedCard() {
	document.querySelectorAll(".pokemon-card").forEach((card) => {
		card.classList.toggle("selected", Number(card.dataset.id) === currentPokemonId);
	});
}

/* ===================== RENDER ===================== */
function renderPokemon(pokemon) {
	const name = formatPokemonName(pokemon.name);
	const speciesId = getSpeciesId(pokemon);
	const types = pokemon.types.map((type) => type.type.name);

	detailHero.className = `detail-hero section type-${types[0]}`;
	detailId.textContent = formatNumber(speciesId);
	detailName.textContent = name;
	detailTypes.replaceChildren(...types.map(createTypeTag));
	detailDescription.textContent = "";
	detailHeight.textContent = `${(pokemon.height / 10).toFixed(1)} m`;
	detailWeight.textContent = `${(pokemon.weight / 10).toFixed(1)} kg`;
	document.title = `${name} · Pokébox`;

	detailImg.alt = name;
	currentPokemon = pokemon;
	showShiny = false;
	updateShinyButton();
	setDetailImage();

	detailGenus.textContent = "";
	renderForms(pokemon);
	detailBadges.replaceChildren();
	detailGender.replaceChildren();
	detailEggGroups.textContent = "";
	detailCapture.textContent = "";
	detailEvolution.replaceChildren();
	abilityInfo.hidden = true;

	updateFavoriteButton();
	renderStats(pokemon.stats);
	detailMovesCount.textContent = 0;
	detailMoves.replaceChildren();
	movesControls.hidden = true;

	const generation = getGeneration(speciesId);
	detailGeneration.replaceChildren(
		createElement("span", "origin-chip accent", `Generación ${generation.roman} · ${generation.region}`)
	);
	detailGames.replaceChildren();
	detailExtraGames.replaceChildren();
	extraGamesLabel.hidden = true;

	detailWeaknesses.replaceChildren();
	detailResistances.replaceChildren();
	detailAbilities.replaceChildren();
	detailLocations.replaceChildren();
	locationsControls.hidden = true;
	placesByVersion = new Map();
	locationsLoadedFor = null;

	// Restart the entrance animation
	detailBody.classList.remove("enter");
	void detailBody.offsetWidth;
	detailBody.classList.add("enter");
}

function renderStats(stats) {
	const rows = STAT_LABELS.map((statLabel, index) => {
		const stat = stats.find((item) => item.stat.name === statLabel.key);
		const value = stat ? stat.base_stat : 0;

		const row = createElement("div", `stat stat-${statLabel.key}`);
		row.style.setProperty("--value", Math.min((value / 255) * 100, 100));
		row.style.setProperty("--index", index);

		const meter = createElement("div", "custom-meter");
		meter.appendChild(createElement("div", "meter-value"));

		row.append(
			createElement("span", "icon stat-icon"),
			createElement("span", "stat-name", statLabel.label),
			meter,
			createElement("span", "stat-value", value)
		);

		return row;
	});

	// Sum of the six, with a bar scaled to the highest total of the games
	const total = STAT_LABELS.reduce((sum, statLabel) => {
		const stat = stats.find((item) => item.stat.name === statLabel.key);
		return sum + (stat ? stat.base_stat : 0);
	}, 0);

	const totalRow = createElement("div", "stat stat-total");
	totalRow.style.setProperty("--value", Math.min((total / 720) * 100, 100));
	totalRow.style.setProperty("--index", rows.length);

	const totalMeter = createElement("div", "custom-meter");
	totalMeter.appendChild(createElement("div", "meter-value"));

	totalRow.append(
		createElement("span", "icon stat-icon"),
		createElement("span", "stat-name", "Total"),
		totalMeter,
		createElement("span", "stat-value", total)
	);

	detailStats.replaceChildren(...rows, totalRow);

	// Two frames so the browser paints the empty bars before they fill up
	requestAnimationFrame(() => {
		requestAnimationFrame(() => detailStats.classList.add("filled"));
	});
	detailStats.classList.remove("filled");
}

/* ===================== NAMES ===================== */
// The API only gives names one request at a time, so the Spanish ones are stored in data/
let namesRequest = null;

function loadNames() {
	if (!namesRequest) {
		namesRequest = Promise.all([
			fetch("./data/moves.json").then((response) => response.json()),
			fetch("./data/locations.json").then((response) => response.json()),
			fetch("./data/items.json").then((response) => response.json()),
			fetch("./data/versions.json").then((response) => response.json()),
		]).then(([moves, locations, items, versions]) => ({ moves, locations, items, versions }));

		// A failed request must not stay cached
		namesRequest.catch(() => (namesRequest = null));
	}

	return namesRequest;
}

function sortNames(names) {
	return names.sort((a, b) => a.localeCompare(b, "es"));
}

// Moves of each game, split by the way they are learned
function groupMoves(pokemon, names) {
	const games = new Map();

	pokemon.moves.forEach((item) => {
		const name = names.moves[item.move.name] || formatName(item.move.name);

		item.version_group_details.forEach((detail) => {
			const game = detail.version_group.name;

			if (!GAMES.some((entry) => entry.name === game)) {
				return;
			}

			const known = MOVE_METHODS.some((method) => method.key === detail.move_learn_method.name);
			const method = known ? detail.move_learn_method.name : "other";

			if (!games.has(game)) {
				games.set(game, Object.fromEntries(MOVE_METHODS.map((entry) => [entry.key, []])));
			}

			games.get(game)[method].push({ name, level: detail.level_learned_at });
		});
	});

	return games;
}

async function loadMoves(pokemon, request) {
	try {
		const names = await loadNames();
		if (request !== detailRequest) {
			return;
		}

		movesByGame = groupMoves(pokemon, names);
		const games = GAMES.filter((game) => movesByGame.has(game.name));

		movesControls.hidden = games.length === 0;
		movesGame.replaceChildren(
			...games.map((game) => {
				const option = createElement("option", "", game.label);
				option.value = game.name;
				return option;
			})
		);

		// The latest game is the one that shows first
		movesGame.value = games.length ? games[games.length - 1].name : "";
		renderMoves();
	} catch (error) {
		console.error("Error fetching move names:", error);
	}
}

function renderMoves() {
	const data = movesByGame.get(movesGame.value);
	const sections = [];
	let total = 0;

	MOVE_METHODS.forEach((method) => {
		const moves = data ? [...data[method.key]] : [];

		if (!moves.length) {
			return;
		}

		total += moves.length;
		moves.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "es"));

		const section = createElement("div", "move-section");
		section.appendChild(createElement("h4", "move-title", `${method.label} (${moves.length})`));

		if (method.key === "level-up") {
			const list = createElement("div", "move-levels");

			moves.forEach((move) => {
				const row = createElement("div", "move-row");
				row.append(
					createElement("span", "move-level", move.level ? `Nv. ${move.level}` : "Evo."),
					createElement("span", "move-name", move.name)
				);
				list.appendChild(row);
			});
			section.appendChild(list);
		} else {
			const list = createElement("div", "chip-list");
			list.append(...moves.map((move) => createElement("span", "chip", move.name)));
			section.appendChild(list);
		}

		sections.push(section);
	});

	detailMovesCount.textContent = total;
	detailMoves.replaceChildren(
		...(sections.length ? sections : [createElement("span", "muted", "Sin datos de movimientos")])
	);
}

movesGame.addEventListener("change", renderMoves);

/* ===================== SPECIES ===================== */
async function loadSpecies(pokemon, request) {
	try {
		const species = await fetchData(`pokemon-species/${getSpeciesId(pokemon)}`);
		if (request !== detailRequest) {
			return;
		}

		const entries = species.flavor_text_entries;
		const spanish = entries.filter((entry) => entry.language.name === "es");
		const entry = spanish.length
			? spanish[spanish.length - 1]
			: entries.find((item) => item.language.name === "en");

		detailDescription.textContent = entry
			? entry.flavor_text.replace(/\s+/g, " ")
			: "";

		const genus = species.genera.find((item) => item.language.name === "es");
		detailGenus.textContent = genus ? genus.genus : "";

		renderSpeciesFacts(species);
		loadEvolution(species, pokemon.id, request);
	} catch (error) {
		console.error("Error fetching species:", error);
	}
}

function renderSpeciesFacts(species) {
	const badges = [];

	if (species.is_legendary) {
		badges.push("Legendario");
	}
	if (species.is_mythical) {
		badges.push("Singular");
	}
	if (species.is_baby) {
		badges.push("Bebé");
	}

	detailBadges.replaceChildren(
		...badges.map((badge) => createElement("span", "origin-chip accent", badge))
	);
	detailBadges.hidden = badges.length === 0;

	renderGender(species.gender_rate);

	detailEggGroups.replaceChildren(
		...species.egg_groups.map((group) =>
			createElement("span", "chip", EGG_GROUPS[group.name] || formatName(group.name))
		)
	);
	detailCapture.textContent = `${species.capture_rate} / 255`;
}

// gender_rate is the chance of being female in eighths, -1 means genderless
function createGenderValue(gender, value) {
	const item = createElement("span", `gender-value ${gender}`);

	item.append(
		createElement("span", `icon icon-${gender === "male" ? "mars" : "venus"}`),
		createElement("span", "", `${value}%`)
	);

	return item;
}

function renderGender(rate) {
	if (rate === -1) {
		detailGender.replaceChildren(createElement("span", "muted", "Sin género"));
		return;
	}

	const female = (rate / 8) * 100;
	const male = 100 - female;

	const bar = createElement("div", "gender-bar");
	const maleBar = createElement("span", "gender-male");
	const femaleBar = createElement("span", "gender-female");
	maleBar.style.width = `${male}%`;
	femaleBar.style.width = `${female}%`;
	bar.append(maleBar, femaleBar);

	const values = createElement("div", "gender-text");
	values.append(createGenderValue("male", male), createGenderValue("female", female));

	detailGender.replaceChildren(bar, values);
}

/* ===================== EVOLUTION ===================== */
async function loadEvolution(species, currentId, request) {
	try {
		const [chain, names] = await Promise.all([
			fetchData(`evolution-chain/${getIdFromUrl(species.evolution_chain.url)}`),
			loadNames(),
		]);
		if (request !== detailRequest) {
			return;
		}

		detailEvolution.replaceChildren(renderEvolution(chain.chain, currentId, names));
	} catch (error) {
		console.error("Error fetching evolution chain:", error);
	}
}

/* ===================== WEAKNESSES AND RESISTANCES ===================== */
async function loadMatchups(pokemon, request) {
	try {
		const typeNames = pokemon.types.map((type) => type.type.name);
		const typesData = await Promise.all(
			typeNames.map((name) => fetchData(`type/${name}`))
		);
		if (request !== detailRequest) {
			return;
		}

		const multipliers = {};
		POKEMON_TYPES.forEach((type) => (multipliers[type.name] = 1));

		typesData.forEach((data) => {
			const relations = data.damage_relations;
			const apply = (list, factor) => {
				list.forEach((type) => {
					if (type.name in multipliers) {
						multipliers[type.name] *= factor;
					}
				});
			};

			apply(relations.double_damage_from, 2);
			apply(relations.half_damage_from, 0.5);
			apply(relations.no_damage_from, 0);
		});

		const entries = Object.entries(multipliers);
		const weaknesses = entries
			.filter(([, multiplier]) => multiplier > 1)
			.sort((a, b) => b[1] - a[1]);
		const resistances = entries
			.filter(([, multiplier]) => multiplier < 1)
			.sort((a, b) => a[1] - b[1]);

		renderMatchups(detailWeaknesses, weaknesses);
		renderMatchups(detailResistances, resistances);
	} catch (error) {
		console.error("Error fetching type matchups:", error);
	}
}

function formatMultiplier(multiplier) {
	const labels = { 4: "×4", 2: "×2", 0.5: "×½", 0.25: "×¼", 0: "×0" };
	return labels[multiplier];
}

function renderMatchups(container, entries) {
	if (!entries.length) {
		container.replaceChildren(createElement("span", "muted", "Ninguna"));
		return;
	}

	const items = entries.map(([typeName, multiplier]) => {
		const type = POKEMON_TYPES.find((item) => item.name === typeName);
		const item = createElement("span", "matchup");
		item.title = `${type.label} ${formatMultiplier(multiplier)}`;

		item.append(
			createTypeIcon(typeName),
			createElement("span", "matchup-multiplier", formatMultiplier(multiplier))
		);

		return item;
	});

	container.replaceChildren(...items);
}

/* ===================== ABILITIES ===================== */
async function loadAbilities(pokemon, request) {
	try {
		const abilities = await Promise.all(
			pokemon.abilities.map(async (item) => {
				const data = await fetchData(`ability/${item.ability.name}`);
				const spanish = data.names.find((entry) => entry.language.name === "es");
				const texts = data.flavor_text_entries.filter((entry) => entry.language.name === "es");
				const effect = data.effect_entries.find((entry) => entry.language.name === "en");

				return {
					name: spanish ? spanish.name : formatName(item.ability.name),
					hidden: item.is_hidden,
					text: texts.length
						? texts[texts.length - 1].flavor_text.replace(/\s+/g, " ")
						: effect
							? effect.short_effect
							: "Sin descripción.",
				};
			})
		);
		if (request !== detailRequest) {
			return;
		}

		detailAbilities.replaceChildren(
			...abilities.map((ability) => {
				const chip = createElement("button", "ability-chip", ability.name);
				chip.type = "button";
				chip.setAttribute("aria-expanded", "false");

				if (ability.hidden) {
					chip.classList.add("hidden-ability");
					chip.title = "Habilidad oculta";
				}

				chip.addEventListener("click", () => showAbility(chip, ability));

				return chip;
			})
		);
	} catch (error) {
		console.error("Error fetching abilities:", error);
	}
}

function showAbility(chip, ability) {
	const wasOpen = chip.getAttribute("aria-expanded") === "true";

	detailAbilities.querySelectorAll(".ability-chip").forEach((item) => {
		item.classList.remove("active");
		item.setAttribute("aria-expanded", "false");
	});

	abilityInfo.hidden = wasOpen;

	if (!wasOpen) {
		chip.classList.add("active");
		chip.setAttribute("aria-expanded", "true");
		abilityInfo.textContent = ability.text;
	}
}

/* ===================== FORMS ===================== */
// The original and its regional forms, each one is a different Pokémon with its own types
function renderForms(pokemon) {
	const speciesId = getSpeciesId(pokemon);
	const forms = formsBySpecies.get(speciesId) || [];

	detailForms.hidden = forms.length === 0;

	// Only the Pokémon it is fused with is known from the data, the rest is how fusions work in the games
	const fusion = formsById.get(pokemon.id)?.fusion;
	detailFusion.hidden = !fusion;
	detailFusion.textContent = fusion ? `Fusión con ${fusion}. Conserva el número de su Pokédex.` : "";
	detailForms.replaceChildren(
		...[{ id: speciesId, name: "" }, ...forms].map((form) => {
			const chip = createElement("a", "form-chip", form.name ? getFormLabel(form.name) : "Original");
			chip.href = `#${form.id}`;

			if (form.id === pokemon.id) {
				chip.classList.add("active");
				chip.setAttribute("aria-current", "true");
			}

			return chip;
		})
	);
}

/* ===================== GAMES ===================== */
async function loadGames(pokemon, request) {
	try {
		const speciesId = getSpeciesId(pokemon);
		const entry = { id: pokemon.id, species: speciesId, form: formsById.has(pokemon.id) };
		const inPokedex = await getPokemonGames(speciesId);
		if (request !== detailRequest) {
			return;
		}

		const shown = inPokedex.filter((game) => isShownInGame(entry, game.name));
		detailGames.replaceChildren(
			...shown.map((game) => createElement("span", "origin-chip", game.label))
		);

		// It can exist in a game without being catchable or having an entry, like Zorua de Hisui in Scarlet/Violet
		const mask = getGamesMask(entry);
		const extra = mask === undefined ? [] : GAMES.filter((game) => hasGame(mask, game.name) && !shown.includes(game));

		extraGamesLabel.hidden = extra.length === 0;
		detailExtraGames.replaceChildren(
			...extra.map((game) => createElement("span", "origin-chip dashed", game.label))
		);
	} catch (error) {
		console.error("Error fetching games:", error);
	}
}

/* ===================== LOCATIONS ===================== */
// Only requested when the section is opened
async function loadLocations() {
	if (locationsLoadedFor === currentPokemonId) {
		return;
	}

	const request = detailRequest;
	const id = currentPokemonId;
	locationsLoadedFor = id;

	try {
		const [encounters, names] = await Promise.all([
			fetchData(`pokemon/${id}/encounters`),
			loadNames(),
		]);
		if (request !== detailRequest) {
			return;
		}

		// Places of each game, with how it shows up there. Several areas of the same place are one place
		placesByVersion = new Map();

		encounters.forEach((encounter) => {
			const place =
				names.locations[getIdFromUrl(encounter.location_area.url)] ||
				formatName(encounter.location_area.name);

			encounter.version_details.forEach((detail) => {
				if (!(detail.version.name in names.versions)) {
					return;
				}

				if (!placesByVersion.has(detail.version.name)) {
					placesByVersion.set(detail.version.name, new Map());
				}

				const places = placesByVersion.get(detail.version.name);
				if (!places.has(place)) {
					places.set(place, { methods: new Set(), min: Infinity, max: 0 });
				}

				const info = places.get(place);
				detail.encounter_details.forEach((item) => {
					info.methods.add(item.method.name);
					info.min = Math.min(info.min, item.min_level);
					info.max = Math.max(info.max, item.max_level);
				});
			});
		});

		// Versions in release order, the latest one shows first
		const versions = Object.keys(names.versions).filter((slug) => placesByVersion.has(slug));

		locationsControls.hidden = versions.length === 0;
		locationsGame.replaceChildren(
			...versions.map((slug) => {
				const option = createElement("option", "", names.versions[slug]);
				option.value = slug;
				return option;
			})
		);

		if (!versions.length) {
			detailLocations.replaceChildren(
				createElement("span", "warning-text", "No se encuentra en la naturaleza")
			);
			return;
		}

		locationsGame.value = versions[versions.length - 1];
		renderPlaces();
	} catch (error) {
		locationsLoadedFor = null;
		console.error("Error fetching locations:", error);
	}
}

function renderPlaces() {
	const places = placesByVersion.get(locationsGame.value) || new Map();

	detailLocations.replaceChildren(
		...sortNames([...places.keys()]).map((place) => {
			const info = places.get(place);
			const methods = [...info.methods].map((method) => ENCOUNTER_METHODS[method] || formatName(method));
			const levels = Number.isFinite(info.min)
				? info.min === info.max
					? `Nv. ${info.min}`
					: `Nv. ${info.min}–${info.max}`
				: "";

			const row = createElement("div", "place");
			row.append(
				createElement("span", "place-name", place),
				createElement("span", "place-meta", [...new Set(methods), levels].filter(Boolean).join(" · "))
			);

			return row;
		})
	);
}

locationsGame.addEventListener("change", renderPlaces);

/* ===================== SHINY ===================== */
function setDetailImage() {
	const image = getDetailImage(currentPokemon, showShiny);

	detailImg.classList.remove("loaded");
	detailImg.classList.toggle("is-animated", image.endsWith(".gif"));
	detailImg.onload = () => detailImg.classList.add("loaded");
	detailImg.src = image;
}

function updateShinyButton() {
	shinyBtn.classList.toggle("active", showShiny);
	shinyBtn.setAttribute("aria-pressed", showShiny);
	shinyBtn.setAttribute("aria-label", showShiny ? "Ver versión normal" : "Ver versión shiny");
}

shinyBtn.addEventListener("click", () => {
	showShiny = !showShiny;
	updateShinyButton();
	setDetailImage();

	shinyBtn.classList.remove("pop");
	void shinyBtn.offsetWidth;
	shinyBtn.classList.add("pop");
});

/* ===================== FAVORITE BUTTON ===================== */
function updateFavoriteButton() {
	const active = isFavorite(currentPokemonId);

	favoriteBtn.classList.toggle("active", active);
	favoriteBtn.setAttribute("aria-pressed", active);
	favoriteBtn.setAttribute(
		"aria-label",
		active ? "Quitar de favoritos" : "Añadir a favoritos"
	);
}

favoriteBtn.addEventListener("click", () => {
	toggleFavorite(currentPokemonId);
	updateFavoriteButton();

	favoriteBtn.classList.remove("pop");
	void favoriteBtn.offsetWidth;
	favoriteBtn.classList.add("pop");

	document.dispatchEvent(new CustomEvent("favoritechange"));
});

/* ===================== ACCORDION ===================== */
document.querySelectorAll(".accordion-header").forEach((header) => {
	header.addEventListener("click", () => {
		const item = header.parentElement;
		const isOpen = item.classList.toggle("open");

		header.setAttribute("aria-expanded", isOpen);

		if (isOpen && header.dataset.accordion === "locations") {
			loadLocations();
		}
	});
});

/* ===================== NAVIGATION INSIDE THE DETAIL ===================== */
// On mobile, going from one Pokémon to another inside the sheet replaces the history entry instead of adding one,
// so a single close (or back) leaves the sheet no matter how many Pokémon were opened from it
detail.addEventListener("click", (event) => {
	const link = event.target.closest('a[href^="#"]');

	if (
		!link ||
		desktopQuery.matches ||
		event.button !== 0 ||
		event.ctrlKey ||
		event.metaKey ||
		event.shiftKey
	) {
		return;
	}

	const id = Number.parseInt(link.getAttribute("href").slice(1), 10);

	if (!Number.isInteger(id) || id <= 0) {
		return;
	}

	event.preventDefault();
	history.replaceState(null, "", `#${id}`);
	openDetail(id);
	detail.scrollTo({ top: 0, behavior: "smooth" });
});
