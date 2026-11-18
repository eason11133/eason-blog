// Shared header behavior for desktop links and the mobile drawer.
// Active navigation is now a CSS underline; no moving dot or blur animation.
let themeTransitionTimer: number | null = null;
const MOBILE_BREAKPOINT = 900;

function isMobileViewport() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
}

function updateHeaderState() {
    const header = document.querySelector('header');
    if (!header) return;

    const pathname = window.location.pathname.replace(/\/$/, '') || '/';
    const syncActiveState = (selector: string) => {
        document.querySelectorAll<HTMLAnchorElement>(selector).forEach((link) => {
            const href = link.getAttribute('href') || '';
            const isActive = href === '/'
                ? pathname === '/'
                : pathname === href || pathname.startsWith(href + '/');
            link.classList.toggle('active', isActive);
            if (isActive) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
    };
    syncActiveState('.internal-links a');
    syncActiveState('.mobile-nav-link');

        // --- 3. Sticky header scroll logic ---
        if (header.classList.contains('transparent')) {
            const mainContent = document.getElementById('main-content');
            if (!mainContent) return;

            const onScroll = () => {
                if (mainContent.scrollTop > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
            };

            onScroll();
            if ((mainContent as any).__scrollHandler) {
                mainContent.removeEventListener('scroll', (mainContent as any).__scrollHandler);
            }

            (mainContent as any).__scrollHandler = onScroll;
            mainContent.addEventListener('scroll', onScroll, { passive: true });
        }
    }

    function parseCssTimeToMs(value: string): number | null {
        const normalized = value.trim();
        if (!normalized) return null;
        const match = normalized.match(/^(-?\d*\.?\d+)(ms|s)$/i);
        if (!match) return null;
        const amount = Number(match[1]);
        if (!Number.isFinite(amount)) return null;
        return match[2].toLowerCase() === 's' ? amount * 1000 : amount;
    }

    function getThemeTransitionDurationMs(html: HTMLElement): number {
        const styles = getComputedStyle(html);
        const variableDuration = styles.getPropertyValue('--theme-color-transition-duration');
        const parsed = parseCssTimeToMs(variableDuration);
        return parsed ?? 400;
    }

    // ====== Theme Toggle ======
    function initThemeToggle() {
        const toggle = document.getElementById('theme-toggle');
        if (!toggle) return;

        // Remove old listener to prevent stacking (due to transition:persist)
        if ((toggle as any).__themeHandler) {
            toggle.removeEventListener('click', (toggle as any).__themeHandler);
        }

        const handler = () => {
            const html = document.documentElement;
            const transitionDuration = Math.max(0, getThemeTransitionDurationMs(html));

            // Enable smooth theme transition on all elements
            html.classList.add('theme-transitioning');

            // Ensure the transition class is applied before switching theme values.
            requestAnimationFrame(() => {
                const current = html.getAttribute('data-theme') || 'light';
                const next = current === 'dark' ? 'light' : 'dark';
                html.setAttribute('data-theme', next);
                localStorage.setItem('theme', next);

                if (themeTransitionTimer !== null) {
                    clearTimeout(themeTransitionTimer);
                }
                const cleanupDelay = transitionDuration <= 0 ? 0 : transitionDuration + 34;
                themeTransitionTimer = window.setTimeout(() => {
                    html.classList.remove('theme-transitioning');
                    themeTransitionTimer = null;
                }, cleanupDelay);
            });
        };

        (toggle as any).__themeHandler = handler;
        toggle.addEventListener('click', handler);
    }

    // ====== Mobile Menu ======
    function initMobileMenu() {
        const header = document.querySelector('header');
        const menuBtn = document.getElementById('mobile-menu-btn') as HTMLButtonElement | null;
        const overlay = document.getElementById('mobile-nav-overlay');
        const drawer = document.getElementById('mobile-nav-drawer');
        const mobileLinks = document.querySelectorAll('.mobile-nav-link') as NodeListOf<HTMLAnchorElement>;

        if (!header || !menuBtn || !overlay || !drawer) return;

        const openMenu = () => {
            if (!isMobileViewport()) return;
            header.classList.add('mobile-menu-open');
            document.body.classList.add('mobile-menu-open');
            menuBtn.setAttribute('aria-expanded', 'true');
            overlay.setAttribute('aria-hidden', 'false');
            drawer.setAttribute('aria-hidden', 'false');
        };

        const closeMenu = () => {
            header.classList.remove('mobile-menu-open');
            document.body.classList.remove('mobile-menu-open');
            menuBtn.setAttribute('aria-expanded', 'false');
            overlay.setAttribute('aria-hidden', 'true');
            drawer.setAttribute('aria-hidden', 'true');
        };

        const toggleMenu = () => {
            if (header.classList.contains('mobile-menu-open')) {
                closeMenu();
            } else {
                openMenu();
            }
        };

        // Remove old listeners (persist-safe)
        const menuBtnAny = menuBtn as any;
        const overlayAny = overlay as any;
        const windowAny = window as any;
        const docAny = document as any;

        if (menuBtnAny.__menuToggleHandler) {
            menuBtn.removeEventListener('click', menuBtnAny.__menuToggleHandler);
        }
        if (overlayAny.__menuOverlayHandler) {
            overlay.removeEventListener('click', overlayAny.__menuOverlayHandler);
        }
        if (windowAny.__menuResizeHandler) {
            window.removeEventListener('resize', windowAny.__menuResizeHandler);
        }
        if (docAny.__menuKeyHandler) {
            document.removeEventListener('keydown', docAny.__menuKeyHandler);
        }

        menuBtnAny.__menuToggleHandler = toggleMenu;
        overlayAny.__menuOverlayHandler = closeMenu;
        windowAny.__menuResizeHandler = () => {
            if (!isMobileViewport()) {
                closeMenu();
            }
        };
        docAny.__menuKeyHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeMenu();
            }
        };

        menuBtn.addEventListener('click', menuBtnAny.__menuToggleHandler);
        overlay.addEventListener('click', overlayAny.__menuOverlayHandler);
        window.addEventListener('resize', windowAny.__menuResizeHandler);
        document.addEventListener('keydown', docAny.__menuKeyHandler);

        mobileLinks.forEach((link) => {
            const linkAny = link as any;
            if (linkAny.__menuLinkHandler) {
                link.removeEventListener('click', linkAny.__menuLinkHandler);
            }
            linkAny.__menuLinkHandler = closeMenu;
            link.addEventListener('click', linkAny.__menuLinkHandler);
        });

        closeMenu();
    }

    const applyHeaderBehaviors = () => {
        initThemeToggle();
        initMobileMenu();
        updateHeaderState();


    };

    document.addEventListener('astro:page-load', applyHeaderBehaviors);
    applyHeaderBehaviors();
