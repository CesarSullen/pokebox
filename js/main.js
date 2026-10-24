/* ===================== ELEMENTS ===================== */
const mainContent = document.getElementById("mainContent");
const pokemonList = document.getElementById("pokemonList");
const emptyMessage = document.getElementById("emptyMessage");
const generationFilter = document.getElementById("generationFilter");
const generationList = document.getElementById("generationList");
const regionFilter = document.getElementById("regionFilter");
const regionList = document.getElementById("regionList");
const typeList = document.getElementById("typeList");
const typeToggle = document.getElementById("typeToggle");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");
const pagination = document.getElementById("pagination");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");
const navButtons = document.querySelectorAll(".nav-btn");

const PAGE_SIZE = 12;
let page = 0;
let view = "all";
let activeType = "all";
let activeGeneration = 1;
let activeRegion = "kanto";
let searchTerm = "";
let allPokemon = [];
let filteredPokemon = [];
let listRequest = 0;
let firstLoad = true;

/* ===================== POKÉMON TYPES ===================== */
function createTypeChip(name, label) {
	const chip = createElement("button", "type-chip");
	chip.type = "button";
	chip.dataset.type = name;

	if (name === "all") {
		chip.classList.add("active");
		chip.append(createElement("span", "icon icon-pokeball"));
	} else {
		chip.append(createTypeIcon(name));
	}

	chip.setAttribute("aria-pressed", name === "all");
	chip.append(createElement("span", "", label));
	chip.addEventListener("click", () => selectType(name));

	return chip;
}

function buildTypeFilter() {
	typeList.append(createTypeChip("all", "Todos"));
	POKEMON_TYPES.forEach((type) => typeList.append(createTypeChip(type.name, type.label)));
}

function selectType(name) {
	activeType = name;

	typeList.querySelectorAll(".type-chip").forEach((chip) => {
		const isActive = chip.dataset.type === name;
		chip.classList.toggle("active", isActive);
		chip.setAttribute("aria-pressed", isActive);
	});

	updateList();
}

typeToggle.addEventListener("click", () => {
	const expanded = typeList.classList.toggle("expanded");
	typeToggle.setAttribute("aria-expanded", expanded);
});

/* ===================== GENERATIONS ===================== */
function buildGenerationFilter() {
	GENERATIONS.forEach((generation) => {
		const chip = createElement("button", "group-chip");
		chip.type = "button";
		chip.dataset.generation = generation.id;
		chip.title = `${formatNumber(generation.from)} - ${formatNumber(generation.to)}`;
		chip.classList.toggle("active", generation.id === activeGeneration);
		chip.setAttribute("aria-pressed", generation.id === activeGeneration);

		chip.append(
			createElement("span", "group-badge", generation.roman),
			createElement("span", "", generation.region)
		);
		chip.addEventListener("click", () => selectGeneration(generation.id));
		generationList.append(chip);
	});
}

function selectGeneration(id) {
	activeGeneration = id;

	generationList.querySelectorAll(".group-chip").forEach((chip) => {
		const isActive = Number(chip.dataset.generation) === id;
		chip.classList.toggle("active", isActive);
		chip.setAttribute("aria-pressed", isActive);
	});

	updateList();
}

/* ===================== REGIONS ===================== */
function buildRegionFilter() {
	REGIONS.forEach((region) => {
		const chip = createElement("button", "group-chip");
		chip.type = "button";
		chip.dataset.region = region.name;
		chip.classList.toggle("active", region.name === activeRegion);
		chip.setAttribute("aria-pressed", region.name === activeRegion);

		const badge = createElement("span", "group-badge");
		badge.appendChild(createElement("span", "icon icon-map-pin"));

		chip.append(badge, createElement("span", "", region.label));
		chip.addEventListener("click", () => selectRegion(region.name));
		regionList.append(chip);
	});
}

function selectRegion(name) {
	activeRegion = name;

	regionList.querySelectorAll(".group-chip").forEach((chip) => {
		const isActive = chip.dataset.region === name;
		chip.classList.toggle("active", isActive);
		chip.setAttribute("aria-pressed", isActive);
	});

	updateList();
}

function updateGroupFilters() {
	generationFilter.hidden = view !== "generations";
	regionFilter.hidden = view !== "regions";
}

/* ===================== POKÉMON LIST ===================== */
async function loadAllPokemon() {
	const data = await fetchData(`pokemon?limit=${TOTAL_POKEMONS}`);

	allPokemon = data.results.map((pokemon) => ({
		id: getIdFromUrl(pokemon.url),
		name: pokemon.name,
	}));
}

async function getFilteredList() {
	let list = allPokemon;

	if (view === "favorites") {
		const favorites = new Set(getFavorites());
		list = list.filter((pokemon) => favorites.has(pokemon.id));
	}

	if (view === "generations") {
		const generation = GENERATIONS.find((item) => item.id === activeGeneration);
		list = list.filter((pokemon) => pokemon.id >= generation.from && pokemon.id <= generation.to);
	}

	if (view === "regions") {
		const ids = await getRegionPokemon(activeRegion);
		list = list.filter((pokemon) => ids.has(pokemon.id));
	}

	if (activeType !== "all") {
		const data = await fetchData(`type/${activeType}`);
		const ids = new Set(data.pokemon.map((entry) => getIdFromUrl(entry.pokemon.url)));
		list = list.filter((pokemon) => ids.has(pokemon.id));
	}

	if (searchTerm) {
		list = list.filter(
			(pokemon) =>
				pokemon.name.includes(searchTerm) || String(pokemon.id) === searchTerm
		);
	}

	return list;
}

async function updateList(resetPage = true) {
	if (resetPage) {
		page = 0;
	}

	const request = ++listRequest;
	showSkeletons();

	try {
		filteredPokemon = await getFilteredList();
		if (request !== listRequest) {
			return;
		}

		const lastPage = Math.max(Math.ceil(filteredPokemon.length / PAGE_SIZE) - 1, 0);
		page = Math.min(page, lastPage);

		await loadPage(request);
	} catch (error) {
		console.error(error);
		showMessage("No se pudo cargar la lista. Revisa tu conexión e inténtalo de nuevo.");
	}
}

async function loadPage(request = ++listRequest) {
	const items = filteredPokemon.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

	if (!items.length) {
		pokemonList.replaceChildren();
		showMessage(
			view === "favorites" && !searchTerm && activeType === "all"
				? "Aún no tienes favoritos. Toca el marcador de un Pokémon para guardarlo."
				: "No se encontraron Pokémon."
		);
		updatePagination();
		return;
	}

	const pokemons = await Promise.all(items.map((item) => fetchData(`pokemon/${item.id}`)));
	if (request !== listRequest) {
		return;
	}

	emptyMessage.hidden = true;
	pokemonList.replaceChildren(...pokemons.map(createCard));
	pokemonList.querySelectorAll(".pokemon-item").forEach(reveal);
	markSelectedCard();
	updatePagination();

	selectFirstOnDesktop(pokemons[0].id);
}

function createCard(pokemon) {
	const item = createElement("li", "pokemon-item");
	const typeNames = pokemon.types.map((type) => type.type.name);
	const name = formatName(pokemon.name);

	const card = createElement("a", `pokemon-card type-${typeNames[0]}`);
	card.href = `#${pokemon.id}`;
	card.dataset.id = pokemon.id;
	card.setAttribute(
		"aria-label",
		`${name}, ${formatNumber(pokemon.id)}, ${typeNames.map(getTypeLabel).join(" y ")}`
	);

	// Types are only icons here, the full tags are in the detail
	const typeIcons = createElement("div", "pokemon-type-icons");
	typeNames.forEach((typeName) => {
		const icon = createTypeIcon(typeName);
		icon.title = getTypeLabel(typeName);
		typeIcons.appendChild(icon);
	});

	const header = createElement("div", "pokemon-header");
	header.append(createElement("span", "pokemon-number", formatNumber(pokemon.id)), typeIcons);

	const check = createElement("span", "selected-check");
	check.appendChild(createElement("span", "icon icon-check"));

	const imgContainer = createElement("div", "pokemon-img");
	const img = document.createElement("img");
	img.src = getCardImage(pokemon);
	img.alt = "";
	img.loading = "lazy";
	img.crossOrigin = "anonymous";
	img.width = 512;
	img.height = 512;
	imgContainer.appendChild(img);

	card.append(header, check, imgContainer, createElement("h3", "pokemon-name", name));
	item.appendChild(card);

	return item;
}

function showSkeletons() {
	emptyMessage.hidden = true;

	pokemonList.replaceChildren(
		...Array.from({ length: PAGE_SIZE }, () => {
			const item = createElement("li", "pokemon-item skeleton");
			item.appendChild(createElement("div", "pokemon-card"));
			return item;
		})
	);
}

function showMessage(text) {
	emptyMessage.textContent = text;
	emptyMessage.hidden = false;
}

function scrollToTop() {
	mainContent.scrollTo({ top: 0, behavior: "smooth" });
	window.scrollTo({ top: 0, behavior: "smooth" });
}

// On desktop the side panel always shows a Pokémon
function selectFirstOnDesktop(id) {
	if (!firstLoad) {
		return;
	}
	firstLoad = false;

	if (desktopQuery.matches && !getHashId()) {
		history.replaceState(null, "", `#${id}`);
		openDetail(id);
	}
}

/* ===================== PAGINATION ===================== */
function updatePagination() {
	const totalPages = Math.max(Math.ceil(filteredPokemon.length / PAGE_SIZE), 1);

	pagination.hidden = totalPages <= 1;
	pageInfo.textContent = `Página ${page + 1} de ${totalPages}`;
	prevBtn.disabled = page === 0;
	nextBtn.disabled = page >= totalPages - 1;
}

async function changePage(step) {
	page += step;
	showSkeletons();
	scrollToTop();

	try {
		await loadPage();
	} catch (error) {
		console.error(error);
		showMessage("No se pudo cargar la lista. Revisa tu conexión e inténtalo de nuevo.");
	}
}

prevBtn.addEventListener("click", () => changePage(-1));
nextBtn.addEventListener("click", () => changePage(1));

/* ===================== SEARCH ===================== */
function applySearch() {
	searchTerm = searchInput.value.trim().toLowerCase();
	clearBtn.hidden = searchInput.value === "";
	updateList();
}

searchInput.addEventListener("input", debounce(applySearch, 300));

searchInput.addEventListener("keydown", (event) => {
	if (event.key === "Enter") {
		applySearch();
		searchInput.blur();
	}
});

searchBtn.addEventListener("click", applySearch);

clearBtn.addEventListener("click", () => {
	searchInput.value = "";
	searchInput.focus();
	applySearch();
});

/* ===================== NAVIGATION ===================== */
navButtons.forEach((button) => {
	button.addEventListener("click", () => {
		if (button.dataset.view === view) {
			scrollToTop();
			return;
		}

		view = button.dataset.view;
		updateGroupFilters();
		navButtons.forEach((item) => {
			const isActive = item === button;
			item.classList.toggle("active", isActive);
			item.toggleAttribute("aria-current", isActive);
		});

		updateList();
		scrollToTop();
	});
});

document.addEventListener("favoritechange", () => {
	if (view === "favorites") {
		updateList(false);
	}
});

/* ===================== SELECTED POKÉMON IN THE URL ===================== */
let hasNavigated = false;

function getHashId() {
	const id = Number.parseInt(location.hash.slice(1), 10);
	return Number.isInteger(id) && id > 0 ? id : null;
}

function handleHash() {
	const id = getHashId();

	if (id) {
		openDetail(id);
	} else {
		closeDetail();
	}
}

window.addEventListener("hashchange", () => {
	hasNavigated = getHashId() !== null;
	handleHash();
});

function requestClose() {
	if (hasNavigated) {
		history.back();
	} else {
		history.replaceState(null, "", location.pathname + location.search);
		closeDetail();
	}
}

detailClose.addEventListener("click", requestClose);
detailBackdrop.addEventListener("click", requestClose);

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape" && !desktopQuery.matches && detail.classList.contains("open")) {
		requestClose();
	}
});

/* ===================== INIT ===================== */
async function init() {
	buildGenerationFilter();
	buildRegionFilter();
	buildTypeFilter();

	if (getHashId()) {
		handleHash();
	}

	showSkeletons();

	try {
		await loadAllPokemon();
		await updateList();
	} catch (error) {
		console.error(error);
		pokemonList.replaceChildren();
		showMessage("No se pudo cargar la lista. Revisa tu conexión e inténtalo de nuevo.");
	}
}

init();

/* ===================== SERVICE WORKER ===================== */
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker
			.register("./sw.js")
			.catch((error) => console.error("Service worker could not be registered:", error));
	});
}
