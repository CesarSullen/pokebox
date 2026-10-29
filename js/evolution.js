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
	if (detail.region) {
		parts.push(`en ${REGIONAL_FORMS[detail.region.name] || formatName(detail.region.name)}`);
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

// The chain from the API is by species, but each evolution says which form it needs (required_pokemon_form)
// and which one it gives (evolved_pokemon_form), so it is turned into a graph of Pokémon and forms
function buildEvolutionGraph(root) {
	const nodes = new Map();
	const edges = [];

	const getNode = (species, formName) => {
		const form = formName ? formsByName.get(formName) : null;
		const key = form ? form.name : species.name;

		if (!nodes.has(key)) {
			nodes.set(key, { key, name: key, id: form ? form.id : getIdFromUrl(species.url) });
		}

		return nodes.get(key);
	};

	const walk = (chain) => {
		chain.evolves_to.forEach((child) => {
			const groups = new Map();

			child.evolution_details.forEach((detail) => {
				const from = detail.required_pokemon_form?.name;
				const to = detail.evolved_pokemon_form?.name;
				const key = `${formsByName.has(from) ? from : ""}|${formsByName.has(to) ? to : ""}`;

				groups.set(key, [...(groups.get(key) || []), detail]);
			});

			groups.forEach((details, key) => {
				const [from, to] = key.split("|");

				edges.push({
					from: getNode(chain.species, from),
					to: getNode(child.species, to),
					details,
				});
			});

			walk(child);
		});
	};

	getNode(root.species);
	walk(root);

	return { nodes: [...nodes.values()], edges };
}

// Only the Pokémon connected to the current one: Sneasel de Hisui evolves into Sneasler, Sneasel into Weavile
function getLineage(graph, current) {
	const keep = new Set([current]);
	const follow = (from, to) => {
		const queue = [current];

		while (queue.length) {
			const node = queue.shift();

			graph.edges
				.filter((edge) => edge[from] === node)
				.forEach((edge) => {
					if (!keep.has(edge[to])) {
						keep.add(edge[to]);
						queue.push(edge[to]);
					}
				});
		}
	};

	follow("to", "from");
	follow("from", "to");

	return {
		nodes: graph.nodes.filter((node) => keep.has(node)),
		edges: graph.edges.filter((edge) => keep.has(edge.from) && keep.has(edge.to)),
	};
}

function createEvolutionNode(node, currentId) {
	const element = createElement("a", "evo-node");
	element.href = `#${node.id}`;

	if (node.id === currentId) {
		element.classList.add("current");
		element.setAttribute("aria-current", "true");
	}

	const img = document.createElement("img");
	img.src = getHomeImage(node.id);
	img.alt = "";
	img.loading = "lazy";
	img.crossOrigin = "anonymous";
	img.width = 96;
	img.height = 96;

	const species = formsById.has(node.id) ? formsById.get(node.id).species : node.id;

	element.append(
		img,
		createElement("span", "evo-name", formatPokemonName(node.name)),
		createElement("span", "evo-number", formatNumber(species))
	);

	return element;
}

// Each branch is the way into a Pokémon (condition) plus the Pokémon and what it evolves into
function createEvolutionBranch(node, graph, currentId, names, edge = null) {
	const branch = createElement("div", "evo-branch");

	if (edge) {
		// Some Pokémon evolve in several ways, the first one is shown and all of them go in the tooltip
		const texts = [...new Set(edge.details.map((detail) => describeEvolution(detail, names)))];
		const condition = createElement("div", "evo-condition");
		condition.title = texts.join(" / ");

		condition.append(
			createElement("span", "evo-condition-text", texts[0]),
			createElement("span", "icon icon-arrow-right")
		);
		branch.appendChild(condition);
	}

	branch.appendChild(createEvolutionNode(node, currentId));

	const children = graph.edges.filter((item) => item.from === node);

	if (children.length) {
		const next = createElement("div", "evo-next");

		children.forEach((child) => {
			next.appendChild(createEvolutionBranch(child.to, graph, currentId, names, child));
		});
		branch.appendChild(next);
	}

	return branch;
}

function renderEvolution(chain, currentId, names) {
	const graph = buildEvolutionGraph(chain);
	let current = graph.nodes.find((node) => node.id === currentId);

	// A form the chain does not mention uses the evolutions of its species
	if (!current) {
		const species = formsById.has(currentId) ? formsById.get(currentId).species : currentId;
		current = graph.nodes.find((node) => node.id === species);
	}

	const lineage = current ? getLineage(graph, current) : graph;

	if (!lineage.edges.length) {
		return createElement("span", "muted", "No evoluciona");
	}

	const roots = lineage.nodes.filter((node) => !lineage.edges.some((edge) => edge.to === node));
	const wrapper = createElement("div", "evo-roots");

	roots.forEach((root) => wrapper.appendChild(createEvolutionBranch(root, lineage, currentId, names)));

	return wrapper;
}
