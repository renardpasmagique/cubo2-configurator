export type Sf3dTheme = 'light' | 'dark';

const STORAGE_KEY = 'sf3d-theme';

export function getSf3dTheme(): Sf3dTheme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applySf3dTheme(theme: Sf3dTheme): void {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('sf3d-dark', isDark);
  if (document.body) {
    document.body.classList.toggle('sf3d-dark', isDark);
  }
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore storage errors
  }

  document.querySelectorAll<HTMLButtonElement>('.sf3d-theme-toggle').forEach((btn) => {
    btn.textContent = isDark ? '☀ Clair' : '◐ Sombre';
    btn.setAttribute('aria-pressed', String(isDark));
  });

  window.dispatchEvent(new CustomEvent('sf3d-theme-change', { detail: { theme, isDark } }));
}

export function toggleSf3dTheme(): Sf3dTheme {
  const next: Sf3dTheme = getSf3dTheme() === 'dark' ? 'light' : 'dark';
  applySf3dTheme(next);
  return next;
}

export function initThemeAndPortfolioLinks(): void {
  applySf3dTheme(getSf3dTheme());

  // Replace "Impression 3d sur demande" in PrestaShop header menu with "Portfolio" -> https://liampiecourt.fr
  // and place an elegant Instagram SVG icon right next to Portfolio (not next to Panier)
  document.querySelectorAll<HTMLAnchorElement>('#header a, nav a, .main-menu a').forEach((a) => {
    const txt = (a.textContent || '').trim();
    if (/impression\s*3d/i.test(txt) || a.href.includes('impression-3d')) {
      a.textContent = 'Portfolio';
      a.href = 'https://liampiecourt.fr';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = 'Portfolio — liampiecourt.fr';

      if (!document.getElementById('sf3d-nav-ig-link') && a.parentElement) {
        const ig = document.createElement('a');
        ig.id = 'sf3d-nav-ig-link';
        ig.href = 'https://www.instagram.com/5426_studio/';
        ig.target = '_blank';
        ig.rel = 'noopener noreferrer';
        ig.className = 'sf3d-nav-ig-link';
        ig.setAttribute('aria-label', 'Instagram 5426 Studio');
        ig.title = 'Instagram @5426_studio';
        ig.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>';
        a.parentElement.insertBefore(ig, a.nextSibling);
      }
    }
  });

  // Clean up footer copyright text if present + include Portfolio & Instagram links
  document.querySelectorAll<HTMLElement>('.sf3d-copyright').forEach((el) => {
    el.innerHTML =
      '© 2026 5426 Studio — <a href="https://liampiecourt.fr" target="_blank" rel="noopener noreferrer">Portfolio</a> · <a href="https://www.instagram.com/5426_studio/" target="_blank" rel="noopener noreferrer">Instagram @5426_studio</a>';
  });

  // Inject Dark/Light mode toggle into PrestaShop #header right area (desktop + mobile)
  const isDark = getSf3dTheme() === 'dark';
  const makeThemeBtn = (id: string, cls: string) => {
    const btn = document.createElement('button');
    btn.id = id;
    btn.type = 'button';
    btn.className = `sf3d-theme-toggle ${cls}`;
    btn.textContent = isDark ? '☀ Clair' : '◐ Sombre';
    btn.setAttribute('aria-pressed', String(isDark));
    btn.addEventListener('click', () => toggleSf3dTheme());
    return btn;
  };

  const headerRight =
    document.querySelector('.header-top__right') ||
    document.querySelector('#header .header-nav__right') ||
    document.querySelector('#header .container');
  if (headerRight && !document.getElementById('sf3d-header-theme-btn')) {
    headerRight.appendChild(makeThemeBtn('sf3d-header-theme-btn', 'sf3d-header-theme-btn'));
  }

  const mobileAnchor =
    document.querySelector('#_mobile_cart') ||
    document.querySelector('#_mobile_user_info') ||
    document.querySelector('#header .header-top__left')?.parentElement;
  if (mobileAnchor && mobileAnchor.parentElement && !document.getElementById('sf3d-mobile-theme-btn')) {
    const mobileBtn = makeThemeBtn('sf3d-mobile-theme-btn', 'sf3d-mobile-theme-btn');
    mobileAnchor.parentElement.insertBefore(mobileBtn, mobileAnchor);
  }
}
