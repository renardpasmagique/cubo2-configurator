import './style.css';
import { createDefaultConfig, createRandomConfig, Cubo2Config, HornType } from './config/pricing';
import { CatalogCard3D } from './scene/CatalogCard3D';
import { CathedraleHero } from './scene/CathedraleHero';
import { CameraPreset, Cubo2Viewer } from './scene/Cubo2Viewer';
import { HornFileViewer } from './scene/HornFileViewer';
import { Relica3Viewer } from './scene/Relica3Viewer';
import { injectProductSeoJsonLd } from './seo/structuredData';
import { initThemeAndPortfolioLinks } from './theme';
import { ConfiguratorUI } from './ui/ConfiguratorUI';
import { FILE_PRODUCTS, FileProductUI, HornPurchaseFormat, PolicyLink } from './ui/FileProductUI';
import { Relica3ProductUI } from './ui/Relica3ProductUI';

interface Sf3dWindow extends Window {
  SF3D_ASSETS_BASE?: string;
  SF3D_QUOTE_URL?: string;
  SF3D_SAVE_URL?: string;
  SF3D_CSRF_TOKEN?: string;
  SF3D_ID_PRODUCT?: number;
}

const win = window as unknown as Sf3dWindow;

function syncHeaderHeight(): void {
  const header = document.getElementById('header');
  if (header) {
    const h = header.getBoundingClientRect().height;
    if (h > 0) {
      document.documentElement.style.setProperty('--sf3d-header-h', `${Math.ceil(h)}px`);
    }
  }
}

function enterPrestaShopCatalog(): void {
  document.body.classList.add('sf3d-shop-entered');
  syncHeaderHeight();
  const homeHero = document.getElementById('sf3d-home-hero');
  const nextSection =
    document.querySelector('.ps-featuredproducts') ||
    document.querySelector('.featured-products') ||
    homeHero?.nextElementSibling;
  if (nextSection && 'scrollIntoView' in nextSection) {
    setTimeout(() => {
      (nextSection as HTMLElement).scrollIntoView({ behavior: 'smooth' });
    }, 40);
  }
}

function collectPrestaShopProductPhotos(): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const addUrl = (u: string | null | undefined) => {
    if (!u) return;
    let clean = u.trim();
    if (!clean || clean.startsWith('data:')) return;
    // Upgrade PrestaShop small/medium thumbnails to full-size large_default so gallery images are large & crisp
    clean = clean.replace(/-(default_xs|default_sm|default_md|default_lg|home_default)\//i, '-large_default/');
    if (seen.has(clean)) return;
    seen.add(clean);
    urls.push(clean);
  };

  document
    .querySelectorAll<HTMLImageElement>(
      '.product__images img, .product-cover img, .js-qv-product-images img, .product-images img, #content img.js-thumb'
    )
    .forEach((img) => {
      const srcset = img.getAttribute('srcset') || '';
      const lastSrc = srcset
        ? srcset
            .split(',')
            .map((s) => s.trim().split(' ')[0])
            .filter(Boolean)
            .pop()
        : '';
      addUrl(
        img.getAttribute('data-image-large-src') ||
          img.getAttribute('data-full-size-image-url') ||
          lastSrc ||
          img.currentSrc ||
          img.src
      );
    });

  return urls;
}

function collectPrestaShopPolicyLinks(): PolicyLink[] {
  const links: PolicyLink[] = [];
  const seen = new Set<string>();

  document.querySelectorAll<HTMLAnchorElement>('a[href*="/content/"]').forEach((a) => {
    const label = (a.textContent || '').trim();
    const url = a.href;
    if (!label || !url || seen.has(url)) return;
    if (/impression 3d sur demande/i.test(label)) return;
    seen.add(url);
    links.push({ label, url });
  });

  return links;
}

function detectHornProduct(idProduct: number): { hornType: HornType; initialFormat: HornPurchaseFormat } | null {
  if (idProduct === 1) return { hornType: '3x4', initialFormat: 'digital' };
  if (idProduct === 5) return { hornType: '3x4', initialFormat: 'printed' };
  if (idProduct === 2) return { hornType: '2x5', initialFormat: 'digital' };
  if (idProduct === 7) return { hornType: '2x5', initialFormat: 'printed' };
  if (idProduct === 3) return { hornType: 'oval', initialFormat: 'digital' };

  const path = window.location.pathname.toLowerCase();
  if (path.includes('1-5426-multicell-horn-3x4')) return { hornType: '3x4', initialFormat: 'digital' };
  if (path.includes('5-5426-multicell-horn-3x4')) return { hornType: '3x4', initialFormat: 'printed' };
  if (path.includes('2-5426-multicell-horn-2x5')) return { hornType: '2x5', initialFormat: 'digital' };
  if (path.includes('7-5426-multicell-horn-2x5')) return { hornType: '2x5', initialFormat: 'printed' };
  if (path.includes('3-pavillon-acoustique-elliptique')) return { hornType: 'oval', initialFormat: 'digital' };
  return null;
}

function isRelica3Product(idProduct: number): boolean {
  if (idProduct === 10) return true;
  return window.location.pathname.toLowerCase().includes('10-relica-3');
}

const HOME_MARKUP = `
  <span style="font-family: 'GothicPixels', serif; position: absolute; opacity: 0; pointer-events: none" aria-hidden="true">5426 studio</span>
  <section id="home-screen" class="home-screen">
    <div id="cathedrale-viewport" class="cathedrale-viewport"></div>
    <div class="home-overlay">
      <header class="home-header">
        <h1 class="home-title">5426 Studio</h1>
      </header>
      <footer class="home-footer">
        <a href="https://www.5426.fr/" target="_top" id="btn-enter-shop" class="btn-primary home-cta">
          Accéder à la boutique →
        </a>
      </footer>
    </div>
  </section>
`;

const APP_MARKUP = `
  <span style="font-family: 'GothicPixels', serif; position: absolute; opacity: 0; pointer-events: none" aria-hidden="true">5426 studio</span>
  <div id="app" class="app-layout">
    <main class="stage-area">
      <div id="viewport" class="viewport"></div>
      <div id="photo-stage" class="photo-stage is-hidden">
        <button type="button" class="photo-nav-btn photo-nav-prev" id="btn-photo-prev" title="Photo précédente">‹</button>
        <img id="photo-stage-img" class="photo-stage-img" src="" alt="Aperçu photo" />
        <button type="button" class="photo-nav-btn photo-nav-next" id="btn-photo-next" title="Photo suivante">›</button>
        <div class="photo-stage-bar">
          <span id="photo-stage-counter" class="photo-stage-counter">1 / 1</span>
          <button type="button" class="btn-secondary btn-sm" id="btn-back-to-3d">Retour à la vue 3D →</button>
        </div>
      </div>
      <div id="loader" class="loader-overlay">
        <div class="spinner"></div>
        <span>Chargement du modèle 3D…</span>
      </div>
      <div class="cam-bar" id="cam-bar" role="toolbar" aria-label="Outils 3D"></div>
      <div class="orbit-hint" id="orbit-hint">Glisser pour pivoter • Molette pour zoomer</div>
    </main>
    <aside id="panel" class="config-panel"></aside>
  </div>
`;

// Initialize unified Dark/Light mode toggle & Portfolio -> liampiecourt.fr link replacement
initThemeAndPortfolioLinks();

// Always enhance any catalog cards present on the page (3D white-background models + float/rotate on hover + hide duplicates 5 & 7)
if (document.querySelector('.product-miniature')) {
  new CatalogCard3D();
}

const psHomeRoot = document.getElementById('sf3d-home-hero');
const psProductRoot = document.getElementById('sf3d-cubo2-root');

if (psHomeRoot && !psProductRoot) {
  document.body.classList.add('sf3d-home-page');
  if (!win.SF3D_ASSETS_BASE) {
    win.SF3D_ASSETS_BASE =
      psHomeRoot.getAttribute('data-assets-base') || 'https://renardpasmagique.github.io/cubo2-configurator/';
  }

  psHomeRoot.innerHTML = HOME_MARKUP;
  if (document.fonts) {
    document.fonts.load('400 64px "GothicPixels"').catch(() => {});
  }
  const cathedraleViewportEl = document.getElementById('cathedrale-viewport')!;
  new CathedraleHero(cathedraleViewportEl);

  document.getElementById('btn-enter-shop')?.addEventListener('click', (e) => {
    e.preventDefault();
    enterPrestaShopCatalog();
  });

  window.addEventListener(
    'scroll',
    () => {
      if (window.scrollY > 120 && !document.body.classList.contains('sf3d-shop-entered')) {
        document.body.classList.add('sf3d-shop-entered');
        syncHeaderHeight();
      }
    },
    { passive: true }
  );
} else if (psProductRoot || document.getElementById('app')) {
  const scrapedPhotos = collectPrestaShopProductPhotos();
  const scrapedPolicies = collectPrestaShopPolicyLinks();

  if (psProductRoot) {
    document.body.classList.add('sf3d-cubo2-page');
    win.SF3D_ASSETS_BASE =
      psProductRoot.getAttribute('data-assets-base') ||
      win.SF3D_ASSETS_BASE ||
      'https://renardpasmagique.github.io/cubo2-configurator/';
    win.SF3D_QUOTE_URL = psProductRoot.getAttribute('data-quote-url') || win.SF3D_QUOTE_URL || '';
    win.SF3D_SAVE_URL = psProductRoot.getAttribute('data-save-url') || win.SF3D_SAVE_URL || '';
    win.SF3D_CSRF_TOKEN = psProductRoot.getAttribute('data-token') || win.SF3D_CSRF_TOKEN || '';
    win.SF3D_ID_PRODUCT = parseInt(psProductRoot.getAttribute('data-id-product') || '0', 10);

    const wrapper = document.getElementById('wrapper');
    if (wrapper && psProductRoot.parentNode !== wrapper) {
      wrapper.insertBefore(psProductRoot, wrapper.firstChild);
    }

    syncHeaderHeight();
    window.addEventListener('load', syncHeaderHeight);
    window.addEventListener('resize', syncHeaderHeight);
    const headerEl = document.getElementById('header');
    if (headerEl && typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(syncHeaderHeight).observe(headerEl);
    }

    psProductRoot.innerHTML = HOME_MARKUP + APP_MARKUP;
    document.getElementById('home-screen')?.classList.add('is-hidden');
  }

  const hornProduct = detectHornProduct(win.SF3D_ID_PRODUCT || 0);
  const isRelica3 = isRelica3Product(win.SF3D_ID_PRODUCT || 0);

  if (isRelica3) {
    const viewportEl = document.getElementById('viewport')!;
    const panelEl = document.getElementById('panel')!;
    const loaderEl = document.getElementById('loader')!;
    const photoStageEl = document.getElementById('photo-stage')!;
    const photoImgEl = document.getElementById('photo-stage-img') as HTMLImageElement;
    const photoCounterEl = document.getElementById('photo-stage-counter')!;
    const camBarEl = document.getElementById('cam-bar')!;
    const orbitHintEl = document.getElementById('orbit-hint')!;

    let currentPhotoIdx = 0;

    const relicaViewer = new Relica3Viewer(
      viewportEl,
      () => {
        loaderEl.classList.add('is-hidden');
      },
      () => {
        loaderEl.innerHTML = '<span class="loader-err">Erreur de chargement du modèle 3D RELICA 3.</span>';
      }
    );
    injectProductSeoJsonLd(10, viewportEl);

    const setStageMode = (mode: '3d' | 'photos') => {
      if (mode === 'photos' && scrapedPhotos.length > 0) {
        photoStageEl.classList.remove('is-hidden');
        camBarEl.classList.add('is-hidden');
        orbitHintEl.classList.add('is-hidden');
        photoImgEl.src = scrapedPhotos[currentPhotoIdx] || scrapedPhotos[0];
        photoCounterEl.textContent = `Photo ${currentPhotoIdx + 1} / ${scrapedPhotos.length}`;
      } else {
        photoStageEl.classList.add('is-hidden');
        camBarEl.classList.remove('is-hidden');
        orbitHintEl.classList.remove('is-hidden');
        relicaViewer.handleResize();
      }
    };

    const relicaUI = new Relica3ProductUI(panelEl, scrapedPhotos, scrapedPolicies, {
      onCameraPreset: (preset) => {
        setStageMode('3d');
        document.querySelectorAll('[data-cam]').forEach((b) => {
          b.classList.toggle('active', (b as HTMLElement).dataset.cam === preset);
        });
        relicaViewer.setCameraPreset(preset);
      },
      onSelectViewMode: (mode) => {
        setStageMode(mode);
      },
      onSelectPhoto: (idx) => {
        currentPhotoIdx = idx;
        setStageMode('photos');
      },
    });

    document.getElementById('btn-photo-prev')?.addEventListener('click', () => {
      if (scrapedPhotos.length === 0) return;
      currentPhotoIdx = (currentPhotoIdx - 1 + scrapedPhotos.length) % scrapedPhotos.length;
      setStageMode('photos');
      relicaUI.setPhotoIndex(currentPhotoIdx);
    });

    document.getElementById('btn-photo-next')?.addEventListener('click', () => {
      if (scrapedPhotos.length === 0) return;
      currentPhotoIdx = (currentPhotoIdx + 1) % scrapedPhotos.length;
      setStageMode('photos');
      relicaUI.setPhotoIndex(currentPhotoIdx);
    });

    document.getElementById('btn-back-to-3d')?.addEventListener('click', () => {
      setStageMode('3d');
      relicaUI.setViewMode('3d');
    });

    document.querySelectorAll<HTMLButtonElement>('[data-cam]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-cam]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        relicaViewer.setCameraPreset(btn.dataset.cam as CameraPreset);
      });
    });

    let showRelicaDim = false;
    const relicaDimBtn = document.createElement('button');
    relicaDimBtn.type = 'button';
    relicaDimBtn.id = 'btn-toggle-dim';
    relicaDimBtn.className = 'cam-pill';
    relicaDimBtn.title = 'Afficher les dimensions de la carte (L × l × H)';
    relicaDimBtn.textContent = 'Cotation';
    camBarEl.appendChild(relicaDimBtn);
    relicaDimBtn.addEventListener('click', () => {
      showRelicaDim = !showRelicaDim;
      relicaDimBtn.classList.toggle('active', showRelicaDim);
      relicaViewer.setDimensionsVisible(showRelicaDim);
    });
  } else if (hornProduct) {
    const viewportEl = document.getElementById('viewport')!;
    const panelEl = document.getElementById('panel')!;
    const loaderEl = document.getElementById('loader')!;
    const photoStageEl = document.getElementById('photo-stage')!;
    const photoImgEl = document.getElementById('photo-stage-img') as HTMLImageElement;
    const photoCounterEl = document.getElementById('photo-stage-counter')!;
    const camBarEl = document.getElementById('cam-bar')!;
    const orbitHintEl = document.getElementById('orbit-hint')!;

    let currentPhotoIdx = 0;

    const hornViewer = new HornFileViewer(
      viewportEl,
      hornProduct.hornType,
      () => {
        loaderEl.classList.add('is-hidden');
      },
      () => {
        loaderEl.innerHTML = '<span class="loader-err">Erreur de chargement du modèle 3D.</span>';
      }
    );
    injectProductSeoJsonLd(FILE_PRODUCTS[hornProduct.hornType].digitalProductId, viewportEl);

    const setStageMode = (mode: '3d' | 'photos') => {
      if (mode === 'photos' && scrapedPhotos.length > 0) {
        photoStageEl.classList.remove('is-hidden');
        camBarEl.classList.add('is-hidden');
        orbitHintEl.classList.add('is-hidden');
        photoImgEl.src = scrapedPhotos[currentPhotoIdx] || scrapedPhotos[0];
        photoCounterEl.textContent = `Photo ${currentPhotoIdx + 1} / ${scrapedPhotos.length}`;
      } else {
        photoStageEl.classList.add('is-hidden');
        camBarEl.classList.remove('is-hidden');
        orbitHintEl.classList.remove('is-hidden');
        hornViewer.handleResize();
      }
    };

    const fileUI = new FileProductUI(
      panelEl,
      FILE_PRODUCTS[hornProduct.hornType],
      hornProduct.initialFormat,
      scrapedPhotos,
      scrapedPolicies,
      {
        onCameraPreset: (preset) => {
          setStageMode('3d');
          document.querySelectorAll('[data-cam]').forEach((b) => {
            b.classList.toggle('active', (b as HTMLElement).dataset.cam === preset);
          });
          hornViewer.setCameraPreset(preset);
        },
        onColorChange: (hex, translucent) => {
          setStageMode('3d');
          hornViewer.setPreviewColor(hex, translucent);
        },
        onSelectViewMode: (mode) => {
          setStageMode(mode);
        },
        onSelectPhoto: (idx) => {
          currentPhotoIdx = idx;
          setStageMode('photos');
        },
      }
    );

    document.getElementById('btn-photo-prev')?.addEventListener('click', () => {
      if (scrapedPhotos.length === 0) return;
      currentPhotoIdx = (currentPhotoIdx - 1 + scrapedPhotos.length) % scrapedPhotos.length;
      setStageMode('photos');
      fileUI.setPhotoIndex(currentPhotoIdx);
    });

    document.getElementById('btn-photo-next')?.addEventListener('click', () => {
      if (scrapedPhotos.length === 0) return;
      currentPhotoIdx = (currentPhotoIdx + 1) % scrapedPhotos.length;
      setStageMode('photos');
      fileUI.setPhotoIndex(currentPhotoIdx);
    });

    document.getElementById('btn-back-to-3d')?.addEventListener('click', () => {
      setStageMode('3d');
      fileUI.setViewMode('3d');
    });

    document.querySelectorAll<HTMLButtonElement>('[data-cam]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-cam]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        hornViewer.setCameraPreset(btn.dataset.cam as CameraPreset);
      });
    });

    let showHornDim = false;
    const hornDimBtn = document.createElement('button');
    hornDimBtn.type = 'button';
    hornDimBtn.id = 'btn-toggle-dim';
    hornDimBtn.className = 'cam-pill';
    hornDimBtn.title = 'Afficher les dimensions en direct (H × L × P)';
    hornDimBtn.textContent = 'Cotation';
    camBarEl.appendChild(hornDimBtn);
    hornDimBtn.addEventListener('click', () => {
      showHornDim = !showHornDim;
      hornDimBtn.classList.toggle('active', showHornDim);
      hornViewer.setDimensionsVisible(showHornDim);
    });
  } else {
    const viewportEl = document.getElementById('viewport')!;
    const panelEl = document.getElementById('panel')!;
    const loaderEl = document.getElementById('loader')!;
    const homeScreenEl = document.getElementById('home-screen');
    const cathedraleViewportEl = document.getElementById('cathedrale-viewport');
    let cathedraleHero: CathedraleHero | null = null;

    function openHomeScreen(): void {
      if (psProductRoot) {
        window.location.href = 'https://www.5426.fr/';
        return;
      }
      if (homeScreenEl && cathedraleViewportEl) {
        homeScreenEl.classList.remove('is-hidden');
        if (!cathedraleHero) {
          cathedraleHero = new CathedraleHero(cathedraleViewportEl);
        }
      }
    }

    function closeHomeScreen(): void {
      homeScreenEl?.classList.add('is-hidden');
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'home') {
      openHomeScreen();
    }

    document.getElementById('btn-open-configurator')?.addEventListener('click', () => {
      if (params.get('view') === 'home' && window.parent !== window) {
        window.top!.location.href = 'https://www.5426.fr/8-cubo-2.html';
        return;
      }
      closeHomeScreen();
    });

    document.getElementById('btn-enter-shop')?.addEventListener('click', (e) => {
      if (window.parent !== window) {
        e.preventDefault();
        window.parent.postMessage({ type: 'SF3D_SCROLL_TO_SHOP' }, '*');
      }
    });

    let currentConfig: Cubo2Config = createDefaultConfig();

    const viewer = new Cubo2Viewer(
      viewportEl,
      () => {
        viewer.applyConfig(currentConfig);
        loaderEl.classList.add('is-hidden');
        if (document.fonts) {
          Promise.all([
            document.fonts.load('400 72px "GothicPixels"'),
            document.fonts.load('700 48px "Source Sans 3"'),
          ])
            .then(() => {
              viewer.refreshPlaque(currentConfig);
            })
            .catch(() => {});
          document.fonts.ready.then(() => {
            viewer.refreshPlaque(currentConfig);
          });
        }
      },
      () => {
        loaderEl.innerHTML = '<span class="loader-err">Erreur de chargement du modèle 3D.</span>';
      }
    );

    let showDim = false;
    const camBarEl = document.getElementById('cam-bar');
    let dimBtn: HTMLButtonElement | null = null;
    let randBtn: HTMLButtonElement | null = null;
    if (camBarEl) {
      randBtn = document.createElement('button');
      randBtn.type = 'button';
      randBtn.id = 'btn-random-config';
      randBtn.className = 'cam-pill';
      randBtn.title = 'Générer une configuration aléatoire';
      randBtn.textContent = 'Aléatoire';
      camBarEl.appendChild(randBtn);

      dimBtn = document.createElement('button');
      dimBtn.type = 'button';
      dimBtn.id = 'btn-toggle-dim';
      dimBtn.className = 'cam-pill';
      dimBtn.title = 'Afficher les dimensions en direct (H × L × P)';
      dimBtn.textContent = 'Cotation';
      camBarEl.appendChild(dimBtn);
    }

    dimBtn?.addEventListener('click', () => {
      showDim = !showDim;
      dimBtn?.classList.toggle('active', showDim);
      viewer.setDimensionsVisible(showDim);
    });

    const ui = new ConfiguratorUI(
      panelEl,
      currentConfig,
      {
        onConfigChange: (cfg) => {
          currentConfig = cfg;
          viewer.applyConfig(cfg);
        },
        onCameraPreset: (preset) => {
          document.querySelectorAll('[data-cam]').forEach((b) => {
            b.classList.toggle('active', (b as HTMLElement).dataset.cam === preset);
          });
          viewer.setCameraPreset(preset);
        },
        onScreenshot: () => viewer.takeScreenshot(),
        onReset: () => {
          currentConfig = createDefaultConfig();
          ui.setConfig(currentConfig);
          viewer.applyConfig(currentConfig);
          viewer.setCameraPreset('three_quarter');
        },
        onOpenHome: () => {
          openHomeScreen();
        },
      },
      scrapedPhotos
    );
    injectProductSeoJsonLd(8, viewportEl);

    randBtn?.addEventListener('click', () => {
      currentConfig = createRandomConfig();
      ui.setConfig(currentConfig);
      viewer.applyConfig(currentConfig);
    });

    document.querySelectorAll<HTMLButtonElement>('[data-cam]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-cam]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        viewer.setCameraPreset(btn.dataset.cam as CameraPreset);
      });
    });
  }
}
