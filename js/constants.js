/* ===================== CONSTANTS ===================== */
const API_URL = "https://pokeapi.co/api/v2";
const TOTAL_POKEMONS = 1025; // National Pokédex, without alternative forms

const POKEMON_TYPES = [
	{ name: "normal", label: "Normal" },
	{ name: "fire", label: "Fuego" },
	{ name: "water", label: "Agua" },
	{ name: "grass", label: "Planta" },
	{ name: "electric", label: "Eléctrico" },
	{ name: "flying", label: "Volador" },
	{ name: "ice", label: "Hielo" },
	{ name: "fighting", label: "Lucha" },
	{ name: "poison", label: "Veneno" },
	{ name: "ground", label: "Tierra" },
	{ name: "psychic", label: "Psíquico" },
	{ name: "bug", label: "Bicho" },
	{ name: "rock", label: "Roca" },
	{ name: "ghost", label: "Fantasma" },
	{ name: "dragon", label: "Dragón" },
	{ name: "dark", label: "Siniestro" },
	{ name: "steel", label: "Acero" },
	{ name: "fairy", label: "Hada" },
];

// Generations follow the National Pokédex numbering
const GENERATIONS = [
	{ id: 1, roman: "I", region: "Kanto", from: 1, to: 151 },
	{ id: 2, roman: "II", region: "Johto", from: 152, to: 251 },
	{ id: 3, roman: "III", region: "Hoenn", from: 252, to: 386 },
	{ id: 4, roman: "IV", region: "Sinnoh", from: 387, to: 493 },
	{ id: 5, roman: "V", region: "Teselia", from: 494, to: 649 },
	{ id: 6, roman: "VI", region: "Kalos", from: 650, to: 721 },
	{ id: 7, roman: "VII", region: "Alola", from: 722, to: 809 },
	{ id: 8, roman: "VIII", region: "Galar", from: 810, to: 905 },
	{ id: 9, roman: "IX", region: "Paldea", from: 906, to: 1025 },
];

// Games, by version group in the API. Each one lists the Pokémon of its own Pokédexes
const GAMES = [
	{ name: "red-blue", roman: "I", label: "Rojo / Azul" },
	{ name: "yellow", roman: "I", label: "Amarillo" },
	{ name: "gold-silver", roman: "II", label: "Oro / Plata" },
	{ name: "crystal", roman: "II", label: "Cristal" },
	{ name: "ruby-sapphire", roman: "III", label: "Rubí / Zafiro" },
	{ name: "emerald", roman: "III", label: "Esmeralda" },
	{ name: "firered-leafgreen", roman: "III", label: "Rojo Fuego / Verde Hoja" },
	{ name: "diamond-pearl", roman: "IV", label: "Diamante / Perla" },
	{ name: "platinum", roman: "IV", label: "Platino" },
	{ name: "heartgold-soulsilver", roman: "IV", label: "HeartGold / SoulSilver" },
	{ name: "black-white", roman: "V", label: "Negro / Blanco" },
	{ name: "black-2-white-2", roman: "V", label: "Negro 2 / Blanco 2" },
	{ name: "x-y", roman: "VI", label: "X / Y" },
	{ name: "omega-ruby-alpha-sapphire", roman: "VI", label: "Rubí Omega / Zafiro Alfa" },
	{ name: "sun-moon", roman: "VII", label: "Sol / Luna" },
	{ name: "ultra-sun-ultra-moon", roman: "VII", label: "Ultrasol / Ultraluna" },
	{ name: "lets-go-pikachu-lets-go-eevee", roman: "VII", label: "Let's Go, Pikachu / Eevee" },
	{ name: "sword-shield", roman: "VIII", label: "Espada / Escudo" },
	{ name: "brilliant-diamond-shining-pearl", roman: "VIII", label: "Diamante Brillante / Perla Reluciente" },
	{ name: "legends-arceus", roman: "VIII", label: "Leyendas Pokémon: Arceus" },
	{ name: "scarlet-violet", roman: "IX", label: "Escarlata / Púrpura" },
	{ name: "legends-za", roman: "IX", label: "Leyendas Pokémon: Z-A" },
	{ name: "champions", roman: "IX", label: "Champions" },
];

const EGG_GROUPS = {
	monster: "Monstruo",
	water1: "Agua 1",
	water2: "Agua 2",
	water3: "Agua 3",
	bug: "Bicho",
	flying: "Volador",
	ground: "Campo",
	fairy: "Hada",
	plant: "Planta",
	humanshape: "Humanoide",
	mineral: "Mineral",
	indeterminate: "Amorfo",
	ditto: "Ditto",
	dragon: "Dragón",
	"no-eggs": "Desconocido",
};

const STAT_LABELS = [
	{ key: "hp", label: "PS" },
	{ key: "attack", label: "Ataque" },
	{ key: "defense", label: "Defensa" },
	{ key: "special-attack", label: "At. Esp." },
	{ key: "special-defense", label: "Def. Esp." },
	{ key: "speed", label: "Velocidad" },
];

/* ===================== HELPERS ===================== */
function formatName(name) {
	return name
		.replace(/-/g, " ")
		.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNumber(id) {
	return `#${String(id).padStart(3, "0")}`;
}

function getIdFromUrl(url) {
	return Number(url.split("/").filter(Boolean).pop());
}

function getGeneration(id) {
	return GENERATIONS.find((generation) => id >= generation.from && id <= generation.to);
}

function getHomeImage(id) {
	return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`;
}

// HOME renders exist for every Pokémon
function getCardImage(pokemon, shiny = false) {
	const key = shiny ? "front_shiny" : "front_default";

	return (
		pokemon.sprites.other.home[key] ||
		pokemon.sprites.other["official-artwork"][key] ||
		pokemon.sprites[key]
	);
}

// Let's Go animated renders only exist for Kanto and Meltan/Melmetal, the rest falls back to HOME
function getDetailImage(pokemon, shiny = false) {
	const key = shiny ? "front_shiny" : "front_default";
	const letsGo = pokemon.sprites.versions?.["generation-vii"]?.["lets-go-pikachu-lets-go-eevee"];

	return letsGo?.[key] || getCardImage(pokemon, shiny);
}

function createElement(tag, className, text) {
	const element = document.createElement(tag);

	if (className) {
		element.className = className;
	}
	if (text !== undefined) {
		element.textContent = text;
	}

	return element;
}

function createTypeIcon(typeName) {
	const icon = document.createElement("img");
	icon.className = POKEMON_TYPES.some((type) => type.name === typeName)
		? `type-icon type-${typeName}`
		: "type-icon";
	icon.src = `./assets/icons/${typeName}.svg`;
	icon.alt = "";
	icon.width = 24;
	icon.height = 24;

	return icon;
}

function getTypeLabel(typeName) {
	const type = POKEMON_TYPES.find((item) => item.name === typeName);

	return type ? type.label : formatName(typeName);
}

function createTypeTag(typeName) {
	const tag = createElement("span", `type-tag type-${typeName}`);

	tag.append(createTypeIcon(typeName), createElement("span", "", getTypeLabel(typeName)));

	return tag;
}

function debounce(callback, delay) {
	let timeout;

	return (...args) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => callback(...args), delay);
	};
}
