
/**
 * Move only the tags which do not fit beside "More" into a dropdown.
 * Runs on client-navigation and window resize; original links remain valid.
 */
function setupTagOverflow() {
  for (const bar of document.querySelectorAll<HTMLElement>('[data-tag-overflow]')) {
    const visible = bar.querySelector<HTMLElement>('[data-tag-visible]');
    const more = bar.querySelector<HTMLElement>('[data-tag-more]');
    const menu = bar.querySelector<HTMLElement>('[data-tag-more-menu]');
    const toggle = bar.querySelector<HTMLButtonElement>('[data-tag-more-button]');
    const counter = bar.querySelector<HTMLElement>('[data-tag-more-count]');
    if (!visible || !more || !menu || !toggle || !counter) continue;
    const all = visible.querySelector<HTMLAnchorElement>('.all-tag');
    if (!all) continue;
    const tags = [...visible.querySelectorAll<HTMLAnchorElement>('.tag-filter:not(.all-tag)')];
    if (!tags.length) continue;
    let animationFrame = 0;
    const close = () => {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    };
    const layout = () => {
      close();
      // Restore DOM order before each measurement, including after resizes.
      for (const tag of tags) visible.appendChild(tag);
      // Check whether everything already fits without the More button.
      // Only reserve its width when there is an actual overflow.
      more.hidden = true;
      const gap = Number.parseFloat(getComputedStyle(visible).columnGap) || 0;
      const naturalWidth = all.getBoundingClientRect().width
        + tags.reduce((sum, tag) => sum + gap + tag.getBoundingClientRect().width, 0);
      if (naturalWidth <= visible.clientWidth + .5) {
        counter.textContent = '';
        return;
      }
      more.hidden = false;
      const available = visible.clientWidth;
      let used = all.getBoundingClientRect().width;
      for (const tag of tags) {
        const tagWidth = tag.getBoundingClientRect().width;
        if (used + gap + tagWidth <= available + .5) {
          used += gap + tagWidth;
        } else {
          menu.appendChild(tag);
        }
      }
      const hiddenCount = menu.children.length;
      counter.textContent = hiddenCount ? String(hiddenCount) : '';
      more.hidden = hiddenCount === 0;
    };
    const schedule = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(layout);
    };
    toggle.addEventListener('click', () => {
      menu.hidden = !menu.hidden;
      toggle.setAttribute('aria-expanded', String(!menu.hidden));
    });
    document.addEventListener('pointerdown', event => {
      if (!bar.contains(event.target as Node)) close();
    });
    bar.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        close();
        toggle.focus();
      }
    });
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(schedule);
      ro.observe(bar);
    } else {
      window.addEventListener('resize', schedule, { passive: true });
    }
    schedule();
  }
}


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
  setupTagOverflow();
  setupTagPagination();
  setupScrollReveal();
}

