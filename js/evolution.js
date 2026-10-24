/* ===================== EVOLUTION ===================== */
const EVOLUTION_TRIGGERS = {
	trade: "Intercambio",
	spin: "Girar",
	shed: "Muda",
	"three-critical-hits": "3 golpes críticos",
	"take-damage": "Recibir daño",
	"recoil-damage": "Daño por retroceso",
	"tower-of-darkness": "Torre de la Oscuridad",
	"tower-of-waters": "Torre de las Aguas",
	"strong-style-move": "Movimiento fuerte",
	"agile-style-move": "Movimiento ágil",
	"use-move": "Usar un movimiento",
	"three-defeated-bisharp": "Derrotar a 3 Bisharp",
	"meltan-candies": "Caramelos de Meltan",
	"in-battle-level-up": "Subir de nivel en combate",
	"gimmighoul-coins": "999 monedas",
};

const TIMES_OF_DAY = { day: "de día", night: "de noche", dusk: "al atardecer" };

function describeEvolution(detail, names) {
	const parts = [];
	const item = (slug) => names.items[slug] || formatName(slug);
	const move = (slug) => names.moves[slug] || formatName(slug);

	if (detail.trigger.name === "use-item" && detail.item) {
		parts.push(item(detail.item.name));
	} else if (EVOLUTION_TRIGGERS[detail.trigger.name]) {
		parts.push(EVOLUTION_TRIGGERS[detail.trigger.name]);
	}

	if (detail.min_level) {
		parts.push(`Nv. ${detail.min_level}`);
	}
	if (detail.min_happiness) {
		parts.push("Felicidad alta");
	}
	if (detail.min_affection) {
		parts.push("Cariño alto");
	}
	if (detail.min_beauty) {
		parts.push("Belleza alta");
	}
	if (detail.held_item) {
		parts.push(`con ${item(detail.held_item.name)}`);
	}
	if (detail.known_move) {
		parts.push(`conociendo ${move(detail.known_move.name)}`);
	}
	if (detail.known_move_type) {
		parts.push(`con un movimiento ${getTypeLabel(detail.known_move_type.name)}`);
	}
	if (detail.used_move && detail.min_move_count) {
		parts.push(`usando ${move(detail.used_move.name)} ${detail.min_move_count} veces`);
	}
	if (detail.time_of_day) {
		parts.push(TIMES_OF_DAY[detail.time_of_day] || detail.time_of_day);
	}
	// The rock already tells where it happens
	if (detail.location && !detail.near_special_rock) {
		parts.push(`en ${formatName(detail.location.name)}`);
	}
	if (detail.gender) {
		parts.push(detail.gender === 1 ? "hembra" : "macho");
	}
	if (detail.needs_overworld_rain) {
		parts.push("con lluvia");
	}
	if (detail.turn_upside_down) {
		parts.push("boca abajo");
	}
	if (detail.party_species) {
		parts.push(`con ${formatName(detail.party_species.name)} en el equipo`);
	}
	if (detail.party_type) {
		parts.push(`con un Pokémon ${getTypeLabel(detail.party_type.name)} en el equipo`);
	}
	if (detail.trade_species) {
		parts.push(`por ${formatName(detail.trade_species.name)}`);
	}
	if (detail.relative_physical_stats !== null && detail.relative_physical_stats !== undefined) {
		const symbol = { 1: ">", 0: "=", [-1]: "<" }[detail.relative_physical_stats];
		parts.push(`Ataque ${symbol} Defensa`);
	}
	if (detail.min_damage_taken) {
		parts.push(`tras recibir ${detail.min_damage_taken} de daño`);
	}
	if (detail.min_steps) {
		parts.push(`${detail.min_steps} pasos`);
	}
	if (detail.near_special_rock) {
		parts.push("cerca de una roca especial");
	}

	// Level up without anything else
	if (!parts.length) {
		parts.push("Subir de nivel");
	}

	return parts.join(", ");
}

function createEvolutionNode(species, currentId) {
	const id = getIdFromUrl(species.url);
	const node = createElement("a", "evo-node");
	node.href = `#${id}`;

	if (id === currentId) {
		node.classList.add("current");
		node.setAttribute("aria-current", "true");
	}

	const img = document.createElement("img");
	img.src = getHomeImage(id);
	img.alt = "";
	img.loading = "lazy";
	img.crossOrigin = "anonymous";
	img.width = 96;
	img.height = 96;

	node.append(
		img,
		createElement("span", "evo-name", formatName(species.name)),
		createElement("span", "evo-number", formatNumber(id))
	);

	return node;
}

// Each branch is the way into a Pokémon (condition) plus the Pokémon and what it evolves into
function createEvolutionBranch(chain, currentId, names, isRoot = false) {
	const branch = createElement("div", "evo-branch");

	if (!isRoot) {
		// Some Pokémon evolve in several ways, the first one is shown and all of them go in the tooltip
		const texts = [...new Set(chain.evolution_details.map((detail) => describeEvolution(detail, names)))];
		const condition = createElement("div", "evo-condition");
		condition.title = texts.join(" / ");

		condition.append(
			createElement("span", "evo-condition-text", texts[0]),
			createElement("span", "icon icon-arrow-right")
		);
		branch.appendChild(condition);
	}

	branch.appendChild(createEvolutionNode(chain.species, currentId));

	if (chain.evolves_to.length) {
		const next = createElement("div", "evo-next");
		chain.evolves_to.forEach((child) => {
			next.appendChild(createEvolutionBranch(child, currentId, names));
		});
		branch.appendChild(next);
	}

	return branch;
}

function renderEvolution(chain, currentId, names) {
	if (!chain.evolves_to.length) {
		return createElement("span", "muted", "No evoluciona");
	}

	return createEvolutionBranch(chain, currentId, names, true);
}
