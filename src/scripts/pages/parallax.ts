interface ParallaxOptions {
	desktopRise: number;
	coarsePointerRise: number;
	startAtHeroBottom?: boolean;
	revealTarget?: boolean;
	collapseLiftSpace?: boolean;
}

const scrollHandlers = new WeakMap<HTMLElement, () => void>();

export function cleanupParallax() {
	const mainContent = document.getElementById('main-content');
	if (!mainContent) return;

	const handler = scrollHandlers.get(mainContent);
	if (!handler) return;

	mainContent.removeEventListener('scroll', handler);
	scrollHandlers.delete(mainContent);
}

export function setupParallax({
	desktopRise,
	coarsePointerRise,
	startAtHeroBottom = false,
	revealTarget = false,
	collapseLiftSpace = false,
}: ParallaxOptions) {
	const target = document.getElementById('stats-card');
	const mainContent = document.getElementById('main-content');
	const heroHeader = startAtHeroBottom
		? document.querySelector<HTMLElement>('.hero-header')
		: null;

	if (revealTarget && target) {
		target.style.opacity = '1';
		target.style.transform = 'translateY(0)';
		if (collapseLiftSpace) target.style.marginBottom = '0px';
	}

	if (!target || !mainContent || (startAtHeroBottom && !heroHeader)) return;

	cleanupParallax();

	const isCoarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
	const maxRise = isCoarsePointer ? coarsePointerRise : desktopRise;
	let ticking = false;

	const update = () => {
		const scrollStart = heroHeader
			? heroHeader.offsetTop + heroHeader.offsetHeight - window.innerHeight
			: 0;
		const distance = Math.max(0, mainContent.scrollTop - scrollStart);
		const progress = Math.min(distance / (window.innerHeight * 0.5), 1);
		const lift = Math.min(progress * maxRise, target.offsetHeight);
		target.style.transform = `translateY(-${lift}px)`;
		if (collapseLiftSpace) target.style.marginBottom = `-${lift}px`;
	};

	const onScroll = () => {
		if (ticking) return;
		ticking = true;
		requestAnimationFrame(() => {
			update();
			ticking = false;
		});
	};

	scrollHandlers.set(mainContent, onScroll);
	update();
	mainContent.addEventListener('scroll', onScroll, { passive: true });
}
