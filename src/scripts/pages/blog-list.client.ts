
function setupScrollReveal() {
	const targets = Array.from(document.querySelectorAll<HTMLElement>('.scroll-reveal'));
	if (targets.length === 0) return;

	const pending = targets.filter((el) => !el.classList.contains('visible'));
	if (pending.length === 0) return;
	if (document.documentElement.dataset.clientNavigated === 'true') {
		pending.forEach((el) => {
			el.classList.remove('reveal-pending');
			el.classList.add('visible');
		});
		return;
	}

	if (!('IntersectionObserver' in window)) {
		pending.forEach((el) => {
			el.classList.remove('reveal-pending');
			el.classList.add('visible');
		});
		return;
	}

	const observerOptions = {
		root: null,
		rootMargin: '0px',
		threshold: 0.1,
	};

	pending.forEach((el) => el.classList.add('reveal-pending'));

	const observer = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				entry.target.classList.remove('reveal-pending');
				entry.target.classList.add('visible');
				observer.unobserve(entry.target);
			}
		}
	}, observerOptions);

	pending.forEach((el) => observer.observe(el));

	// Fallback: avoid permanently hidden items if observer callback is missed.
	window.setTimeout(() => {
		pending.forEach((el) => {
			el.classList.remove('reveal-pending');
			el.classList.add('visible');
		});
		observer.disconnect();
	}, 1200);
}

function setupTagPagination() {
  const list = document.querySelector<HTMLElement>('[data-tag-pagination]');
  if (!list) return;
  const cards = [...list.querySelectorAll<HTMLElement>(':scope > [data-page-number]')];
  const pageCount = Math.max(1, Number(list.dataset.pageCount) || 1);
  const parsed = Number(new URL(location.href).searchParams.get('page') || 1);
  const page = Number.isSafeInteger(parsed) && parsed >= 1 ? Math.min(parsed, pageCount) : 1;
  for (const card of cards) {
    card.hidden = Number(card.dataset.pageNumber) !== page;
    card.classList.remove('reveal-pending');
    if (card.hidden) card.classList.remove('visible');
    else card.classList.add('visible');
  }
  const nav = document.querySelector<HTMLElement>('.tag-pagination');
  if (!nav) return;
  for (const link of nav.querySelectorAll<HTMLAnchorElement>('[data-tag-page-link]')) {
    const active = Number(link.dataset.pageNumber) === page;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  for (const direction of ['prev', 'next'] as const) {
    const anchor = nav.querySelector<HTMLAnchorElement>('[data-tag-nav="' + direction + '"]');
    if (!anchor) continue;
    const next = page + (direction === 'next' ? 1 : -1);
    const disabled = next < 1 || next > pageCount;
    anchor.classList.toggle('disabled', disabled);
    if (disabled) { anchor.removeAttribute('href'); anchor.setAttribute('aria-disabled', 'true'); }
    else {
      anchor.href = location.pathname + (next === 1 ? '' : '?page=' + next);
      anchor.removeAttribute('aria-disabled');
    }
  }
}

export function initBlogListPage() {
  setupTagPagination();
  setupScrollReveal();
}

