/* ===================== REVEAL ON SCROLL ===================== */
// Each element animates once, the first time it enters the screen
const revealObserver = new IntersectionObserver(
	(entries) => {
		entries
			.filter((entry) => entry.isIntersecting)
			.forEach((entry, index) => {
				entry.target.style.transitionDelay = `${index * 60}ms`;
				entry.target.classList.add("visible");
				revealObserver.unobserve(entry.target);
			});
	},
	{ threshold: 0.15 }
);

function reveal(element) {
	element.classList.add("reveal");
	revealObserver.observe(element);
}
