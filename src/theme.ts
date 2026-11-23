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

  const mobileTarget =
    document.querySelector('.header-bottom .header-bottom__right') ||
    document.querySelector('.header-bottom .header-block--cart')?.parentElement ||
    document.querySelector('.header-bottom .container') ||
    document.querySelector('.header-bottom');
  if (mobileTarget && !document.getElementById('sf3d-mobile-theme-btn')) {
    const mobileBtn = makeThemeBtn('sf3d-mobile-theme-btn', 'sf3d-mobile-theme-btn');
    const cartOrFirst =
      mobileTarget.querySelector('.header-block--cart, #_mobile_cart, .header-bottom__cart') ||
      mobileTarget.firstChild;
    if (cartOrFirst) {
      mobileTarget.insertBefore(mobileBtn, cartOrFirst);
    } else {
      mobileTarget.appendChild(mobileBtn);
    }
  }

  // Ensure #mobileMenu (.ps-mainmenu__mobile) always renders visible links (native .menu lacks .menu--current)
  const mobileDrawerNav = document.querySelector('#mobileMenu .ps-mainmenu__mobile');
  if (mobileDrawerNav && !mobileDrawerNav.querySelector('.sf3d-mobile-nav-list')) {
    const sourceLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('#header .ps-mainmenu a, #header .main-menu a')
    );
    const items: Array<{ label: string; href: string; external?: boolean }> = [];
    const seen = new Set<string>();
    for (const a of sourceLinks) {
      const label = (a.textContent || '').trim();
      const href = a.href;
      if (!label || !href || seen.has(href)) continue;
      seen.add(href);
      items.push({ label, href, external: a.target === '_blank' });
    }
    if (items.length === 0) {
      items.push(
        { label: 'Produit', href: 'https://www.5426.fr/' },
        { label: 'Portfolio', href: 'https://liampiecourt.fr', external: true }
      );
    }
    if (!items.some((it) => it.href.includes('instagram.com'))) {
      items.push({ label: 'Instagram @5426_studio', href: 'https://www.instagram.com/5426_studio/', external: true });
    }
    const list = document.createElement('ul');
    list.className = 'sf3d-mobile-nav-list';
    for (const it of items) {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = it.href;
      link.textContent = it.label;
      if (it.external) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      li.appendChild(link);
      list.appendChild(li);
    }
    mobileDrawerNav.appendChild(list);
  }

  // Hide "Déjà vus" / "Recently viewed" sections across the shop
  document.querySelectorAll<HTMLElement>('section, .featured-products, .ps-viewedproducts').forEach((sec) => {
    const h = sec.querySelector('h2, h3, .h2, .products-section-title');
    if (h && /d[ée]j[àa]\s*vus|recently\s*viewed/i.test(h.textContent || '')) {
      sec.style.display = 'none';
    }
  });

  // Add clean institutional & legal links bar right below "Produits de la même catégorie" (or in #footer)
  const sameCatSec =
    document.querySelector('.product-accessories, .category-products, .ps-categoryproducts') ||
    document.querySelector('#footer .container');
  if (sameCatSec && !document.getElementById('sf3d-legal-links-bar')) {
    const bar = document.createElement('nav');
    bar.id = 'sf3d-legal-links-bar';
    bar.className = 'sf3d-legal-links-bar';
    bar.setAttribute('aria-label', 'Liens légaux et contact');
    const legalLinks = [
      { label: 'Licences', href: 'https://www.5426.fr/content/9-licence' },
      { label: 'Mentions légales', href: 'https://www.5426.fr/content/2-mentions-legales' },
      { label: 'CGV', href: 'https://www.5426.fr/content/3-conditions-utilisation' },
      { label: 'Politique de confidentialité', href: 'https://www.5426.fr/content/6-security-policy' },
      { label: 'Contact', href: 'https://www.5426.fr/nous-contacter' },
    ];
    bar.innerHTML = legalLinks
      .map((l) => `<a href="${l.href}">${l.label}</a>`)
      .join('');
    sameCatSec.insertAdjacentElement('afterend', bar);
  }
}
