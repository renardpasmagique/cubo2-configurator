import { HornType, PETG_COLORS } from '../config/pricing';
import { renderSimilarProductsModal } from '../data/catalogLinks';
import { CameraPreset } from '../scene/Cubo2Viewer';

export type HornPurchaseFormat = 'digital' | 'printed';

export interface FileProductSpec {
  hornType: HornType;
  digitalProductId: number;
  printedProductId: number | null;
  title: string;
  subtitle: string;
  digitalPriceText: string;
  printedPriceText: string | null;
  lead: string;
  architecture: string;
  dispersion: string;
  cutoffFreq: string;
  throat: string;
  dimensions: string;
  printBedNote: string;
  filesIncluded: string[];
  printSettings: string[];
  printedSpecs: string[];
  usage: string;
}

export const FILE_PRODUCTS: Record<HornType, FileProductSpec> = {
  '3x4': {
    hornType: '3x4',
    digitalProductId: 1,
    printedProductId: 5,
    title: '5426 Multicell Horn 3×4',
    subtitle: 'Pavillon Multicellulaire 12 Cellules • Fichiers 3D ou Impression sur mesure',
    digitalPriceText: '35,00 € TTC',
    printedPriceText: '222,00 € TTC',
    lead:
      'Pavillon multicellulaire exponentiel 5426 Studio 3×4 (12 cellules). Conçu pour offrir une couverture verticale étendue (85° H × 65° V) et une projection homogène des hautes fréquences. Disponible en téléchargement numérique (.STL / .STEP) ou imprimé en 3D sur commande dans notre atelier.',
    architecture: 'Pavillon multicellulaire exponentiel (matrice 3×4 — 12 cellules)',
    dispersion: '85° Horizontal × 65° Vertical',
    cutoffFreq: '~750 Hz (coupure acoustique recommandée : ≥ 1,2 kHz)',
    throat: 'Gorge 1" standard (filetage 1 3/8"-18 TPI ou bride 2/3 points)',
    dimensions: '350 × 320 × 300 mm',
    printBedNote: 'Imprimable sur plateau standard dès 250 × 250 mm grâce à la découpe modulaire en 2 parties.',
    filesIncluded: [
      'Fichiers .STL haute résolution (version monobloc + version modulaire en 2 parties avec gorges d\'alignement)',
      'Fichier CAO .STEP pour adaptation de bride ou personnalisation',
      'Notice d\'assemblage et d\'orientation sur plateau',
    ],
    printSettings: [
      'Matériau recommandé : PETG (Classique ou Translucent), ABS ou ASA',
      'Hauteur de couche : 0,16 mm à 0,20 mm',
      'Périmètres (parois) : 4 à 6 boucles pour une rigidité acoustique optimale',
      'Remplissage : 25 % à 40 % (Gyroid ou Cubic) pour éliminer toute résonance',
    ],
    printedSpecs: [
      'Fabrication à la demande dans l\'atelier 5426 Studio (France)',
      'Impression 3D PETG haute densité à parois épaisses anti-résonance',
      'Finition vérifiée, prêt à monter sur moteur à compression 1"',
      'Vendu à l\'unité — délai de fabrication : 1 à 2 semaines',
    ],
    usage: 'Enceintes haute fidélité, systèmes 2 voies type CUBO 2, écoute studio et sonorisation sur mesure.',
  },
  '2x5': {
    hornType: '2x5',
    digitalProductId: 2,
    printedProductId: 7,
    title: '5426 Multicell Horn 2×5',
    subtitle: 'Pavillon Multicellulaire 10 Cellules • Fichiers 3D ou Impression sur mesure',
    digitalPriceText: '30,00 € TTC',
    printedPriceText: '198,00 € TTC',
    lead:
      'Pavillon multicellulaire exponentiel 5426 Studio 2×5 (10 cellules). Sa géométrie privilégie une dispersion horizontale très large (100° H × 45° V) tout en contrôlant les réflexions au sol et au plafond. Disponible en téléchargement (.STL / .STEP) ou imprimé en 3D sur commande.',
    architecture: 'Pavillon multicellulaire exponentiel (matrice 2×5 — 10 cellules)',
    dispersion: '100° Horizontal × 45° Vertical',
    cutoffFreq: '~850 Hz (coupure acoustique recommandée : ≥ 1,4 kHz)',
    throat: 'Gorge 1" standard (filetage 1 3/8"-18 TPI — moteurs bobine 1" à 1,75")',
    dimensions: '347 × 271 × 157 mm',
    printBedNote: 'Version monobloc et version scindée optimisée pour plateaux standards.',
    filesIncluded: [
      'Fichiers .STL haute résolution prêts pour le tranchage (Slicer)',
      'Fichier CAO .STEP inclus pour adaptation mécanique',
      'Guide d\'impression et de montage sur moteur à compression 1"',
    ],
    printSettings: [
      'Matériau recommandé : PETG (Classique ou Translucent), PLA+ haute densité ou ASA',
      'Hauteur de couche : 0,16 mm à 0,20 mm',
      'Périmètres (parois) : 4 à 5 boucles minimum',
      'Remplissage : 25 % à 35 % (Gyroid)',
    ],
    printedSpecs: [
      'Fabrication à la demande dans l\'atelier 5426 Studio (France)',
      'Impression 3D PETG haute densité à parois épaisses anti-résonance',
      'Finition vérifiée, prêt à monter sur moteur à compression 1"',
      'Vendu à l\'unité — délai de fabrication : 1 à 2 semaines',
    ],
    usage: 'Écoute large horizontale, enceinte CUBO 2, monitoring de salon et systèmes audio sur mesure.',
  },
  oval: {
    hornType: 'oval',
    digitalProductId: 3,
    printedProductId: null,
    title: 'Pavillon Acoustique Elliptique 5426 Studio',
    subtitle: 'Fichiers d\'impression 3D (.STL / .STEP) • Profil Elliptique',
    digitalPriceText: '30,00 € TTC',
    printedPriceText: null,
    lead:
      'Modèle 3D numérique prêt à imprimer du pavillon acoustique elliptique 5426 Studio. Son profil à expansion continue sans diffraction interne assure une directivité douce, naturelle et un encombrement compact.',
    architecture: 'Pavillon elliptique à expansion continue (non multicellulaire)',
    dispersion: '90° Horizontal × 55° Vertical',
    cutoffFreq: '~900 Hz (coupure acoustique recommandée : ≥ 1,5 kHz)',
    throat: 'Gorge 1" (filetage 1 3/8"-18 TPI — moteurs à compression 1" à 1,75")',
    dimensions: '254 × 228 × 186 mm (bouche utile 253 × 160 mm)',
    printBedNote: 'Imprimable en une seule pièce sur la majorité des imprimantes 3D (plateau 256 × 256 mm).',
    filesIncluded: [
      'Fichier .STL haute définition (maillage fin sans facettes visibles)',
      'Fichier .STEP natif inclus',
      'Recommandations de paramètres Slicer pour état de surface acoustique lisse',
    ],
    printSettings: [
      'Matériau recommandé : PETG (Classique ou Translucent), ABS ou PLA+',
      'Hauteur de couche : 0,16 mm (hauteur variable recommandée sur le galbe)',
      'Périmètres (parois) : 4 à 6 boucles',
      'Remplissage : 25 % à 35 % (Gyroid)',
    ],
    printedSpecs: [],
    usage: 'Systèmes compacts haute fidélité, enceinte CUBO 2, studio et projets DIY audiophiles.',
  },
};

export interface PolicyLink {
  label: string;
  url: string;
}

const DEFAULT_POLICIES: PolicyLink[] = [
  { label: 'Security policy', url: 'https://www.5426.fr/content/6-security-policy' },
  { label: 'Delivery policy', url: 'https://www.5426.fr/content/1-livraison' },
  { label: 'Return policy', url: 'https://www.5426.fr/content/7-return-policy' },
  { label: 'Licence', url: 'https://www.5426.fr/content/9-licence' },
];

export interface FileProductUIHandlers {
  onCameraPreset: (preset: CameraPreset) => void;
  onColorChange: (hex: string, translucent: boolean) => void;
  onSelectViewMode: (mode: '3d' | 'photos') => void;
  onSelectPhoto: (index: number) => void;
}

export class FileProductUI {
  private root: HTMLElement;
  private spec: FileProductSpec;
  private photos: string[];
  private policies: PolicyLink[];
  private handlers: FileProductUIHandlers;
  private format: HornPurchaseFormat = 'digital';
  private activeStep = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches ? 0 : 1;
  private viewMode: '3d' | 'photos' = '3d';
  private activePhotoIdx = 0;
  private activeColor = PETG_COLORS[0];
  private qty = 1;
  private showSimilarModal = false;
  private cartStatus: { type: 'idle' | 'adding' | 'added' | 'error'; message: string } = {
    type: 'idle',
    message: '',
  };

  constructor(
    root: HTMLElement,
    spec: FileProductSpec,
    initialFormat: HornPurchaseFormat,
    photos: string[],
    policies: PolicyLink[],
    handlers: FileProductUIHandlers
  ) {
    this.root = root;
    this.spec = spec;
    this.format = spec.printedProductId ? initialFormat : 'digital';
    this.photos = photos;
    this.policies = policies.length > 0 ? policies : DEFAULT_POLICIES;
    this.handlers = handlers;

    this.render();
  }

  public setPhotoIndex(index: number): void {
    this.activePhotoIdx = index;
    this.viewMode = 'photos';
    this.render();
  }

  public setViewMode(mode: '3d' | 'photos'): void {
    this.viewMode = mode;
    this.render();
  }

  private getCurrentTargetProductId(): number {
    if (this.format === 'printed' && this.spec.printedProductId) {
      return this.spec.printedProductId;
    }
    return this.spec.digitalProductId;
  }

  private getCurrentPriceText(): string {
    if (this.format === 'printed' && this.spec.printedPriceText) {
      return this.spec.printedPriceText;
    }
    return this.spec.digitalPriceText;
  }

  private render(): void {
    const prevScrollEl = this.root.querySelector<HTMLElement>('.steps-scroll');
    const savedScrollTop = prevScrollEl ? prevScrollEl.scrollTop : 0;

    const hasPrintedOption = Boolean(this.spec.printedProductId && this.spec.printedPriceText);

    const showColorMenu = !hasPrintedOption || this.format === 'printed';

    const steps = [
      ...(showColorMenu
        ? [
            {
              id: 4,
              title: 'Couleur du filament PETG',
              badge: this.activeColor.name,
            },
          ]
        : []),
      {
        id: 1,
        title: 'Aperçu 3D & Galerie Photos',
        badge:
          this.viewMode === '3d'
            ? 'Modèle 3D'
            : `Photo ${this.activePhotoIdx + 1}/${Math.max(1, this.photos.length)}`,
      },
      { id: 2, title: 'Caractéristiques Acoustiques', badge: this.spec.dispersion.split(' ')[0] },
      {
        id: 3,
        title:
          this.format === 'printed'
            ? 'Fabrication Atelier & Impression 3D'
            : 'Fichiers (.STL / .STEP) & Impression 3D',
        badge: this.format === 'printed' ? 'Sur mesure' : 'STL + STEP',
      },
    ];

    this.root.innerHTML = `
      <div class="panel-header">
        <div class="brand-row">
          <h1 class="product-title" style="font-size:21px;line-height:1.2">
            ${this.spec.title}
          </h1>
        </div>
      </div>

      <div class="steps-scroll">
        ${steps
          .map((s) => {
            const open = this.activeStep === s.id;
            return `
              <section class="step-card ${open ? 'is-open' : ''}">
                <button class="step-header" data-step="${s.id}">
                  <span class="step-title">${s.title}</span>
                  <span class="step-val">${s.badge}</span>
                  <span class="step-chevron">${open ? '−' : '+'}</span>
                </button>
                ${open ? `<div class="step-body">${this.renderStepBody(s.id)}</div>` : ''}
              </section>
            `;
          })
          .join('')}
        <div class="policy-bar" aria-label="Politiques et Licence 5426 Studio">
          ${this.policies
            .map(
              (p) =>
                `<a class="policy-pill" href="${p.url}" target="_blank" rel="noopener noreferrer">${p.label}</a>`
            )
            .join('')}
        </div>
      </div>

      <div class="panel-footer">
        ${
          hasPrintedOption
            ? `
          <div class="segmented-2 format-segmented" role="group" aria-label="Format d'achat">
            <button type="button" class="seg-btn ${this.format === 'printed' ? 'active' : ''}" data-purchase-format="printed">
              <span>Pièce Imprimée 3D</span>
              <span class="delta">${this.spec.printedPriceText}</span>
            </button>
            <button type="button" class="seg-btn ${this.format === 'digital' ? 'active' : ''}" data-purchase-format="digital">
              <span>Fichier Numérique (STL)</span>
              <span class="delta">${this.spec.digitalPriceText}</span>
            </button>
          </div>
        `
            : ''
        }
        <div class="price-row-main">
          <div>
            <div class="price-label">${
              this.format === 'printed'
                ? 'Pavillon Imprimé 3D (Vendu à l\'unité)'
                : 'Fichiers 3D (.STL & .STEP)'
            }</div>
            <div class="price-base-note">${
              this.format === 'printed'
                ? `${this.activeColor.nom_commercial || this.activeColor.name} (${this.activeColor.sku_filament || ''})`
                : 'Téléchargement immédiat — Licence 5426 Studio'
            }</div>
          </div>
          <div class="price-value">${this.getCurrentPriceText()}</div>
        </div>
        ${
          showColorMenu
            ? `
          <button type="button" class="active-color-bar" id="btn-open-color-menu">
            <span class="active-color-dot" style="background:${this.activeColor.hex}"></span>
            <span class="active-color-text">Couleur : <strong>${this.activeColor.nom_commercial || this.activeColor.name}</strong></span>
            <span class="active-color-cta">Choisir →</span>
          </button>
        `
            : ''
        }

        ${
          this.cartStatus.type !== 'idle'
            ? `<div class="quote-status quote-status--${this.cartStatus.type === 'added' ? 'success' : this.cartStatus.type === 'error' ? 'error' : 'sending'}">${this.cartStatus.message}</div>`
            : ''
        }

        <div class="file-cart-actions">
          <div class="qty-stepper" aria-label="Quantité">
            <button type="button" class="qty-btn" id="btn-qty-minus">−</button>
            <input type="number" id="input-file-qty" class="qty-input" min="1" value="${this.qty}" />
            <button type="button" class="qty-btn" id="btn-qty-plus">+</button>
          </div>
          <button type="button" class="btn-primary" id="btn-add-to-cart" ${this.cartStatus.type === 'adding' ? 'disabled' : ''}>
            ${this.cartStatus.type === 'adding' ? 'Ajout au panier…' : 'Ajouter au panier →'}
          </button>
        </div>
      </div>

      ${renderSimilarProductsModal(this.spec.digitalProductId, this.showSimilarModal)}
    `;

    const nextScrollEl = this.root.querySelector<HTMLElement>('.steps-scroll');
    if (nextScrollEl && savedScrollTop > 0) {
      nextScrollEl.scrollTop = savedScrollTop;
    }

    this.bindEvents();
  }

  private renderStepBody(stepId: number): string {
    switch (stepId) {
      case 1:
        return `
          <div class="control-group">
            <label class="control-label">Affichage</label>
            <div class="segmented-2">
              <button type="button" class="seg-btn ${this.viewMode === '3d' ? 'active' : ''}" data-view-mode="3d">
                <span>Modèle 3D</span>
                <span class="delta">Interactif 360°</span>
              </button>
              <button type="button" class="seg-btn ${this.viewMode === 'photos' ? 'active' : ''}" data-view-mode="photos">
                <span>Galerie Photos</span>
                <span class="delta">${this.photos.length} photos</span>
              </button>
            </div>
          </div>

          ${
            this.photos.length > 0
              ? `
            <div class="control-group">
              <label class="control-label">Photos du pavillon</label>
              <div class="photo-thumb-grid">
                ${this.photos
                  .map(
                    (url, idx) => `
                  <button
                    type="button"
                    class="photo-thumb-btn ${this.viewMode === 'photos' && this.activePhotoIdx === idx ? 'active' : ''}"
                    data-photo-idx="${idx}"
                    title="Photo ${idx + 1}"
                  >
                    <img src="${url}" alt="${this.spec.title} — Photo ${idx + 1}" loading="lazy" />
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>
          `
              : ''
          }
        `;

      case 4:
        return `
          <div class="control-group">
            <label class="control-label">Filament — <strong>${this.activeColor.nom_commercial || this.activeColor.name}</strong></label>
            <div class="sub-label">Classique</div>
            <div class="swatch-grid">
              ${PETG_COLORS.filter((c) => !c.translucent)
                .map(
                  (c) => `
                <button
                  type="button"
                  class="swatch ${this.activeColor.id === c.id ? 'active' : ''}"
                  style="background:${c.hex}"
                  title="${c.nom_commercial || c.name} (${c.sku_filament || ''})"
                  data-sim-color="${c.id}"
                ></button>
              `
                )
                .join('')}
            </div>
            <div class="sub-label" style="margin-top:6px">Translucent</div>
            <div class="swatch-grid">
              ${PETG_COLORS.filter((c) => c.translucent)
                .map(
                  (c) => `
                <button
                  type="button"
                  class="swatch is-translucent ${this.activeColor.id === c.id ? 'active' : ''}"
                  style="background:${c.hex}"
                  title="${c.nom_commercial || c.name} (${c.sku_filament || ''})"
                  data-sim-color="${c.id}"
                ></button>
              `
                )
                .join('')}
            </div>
          </div>
        `;

      case 2:
        return `
          <p class="hint-text" style="color:var(--text);font-size:13px;margin-top:6px">${this.spec.lead}</p>
          <dl class="horn-spec-list" style="margin-top:6px">
            <dt>Architecture</dt><dd>${this.spec.architecture}</dd>
            <dt>Angle de dispersion</dt><dd>${this.spec.dispersion}</dd>
            <dt>Fréquence de coupure</dt><dd>${this.spec.cutoffFreq}</dd>
            <dt>Gorge &amp; Montage</dt><dd>${this.spec.throat}</dd>
            <dt>Dimensions hors-tout</dt><dd>${this.spec.dimensions}</dd>
            <dt>Applications</dt><dd>${this.spec.usage}</dd>
          </dl>
        `;

      case 3:
        if (this.format === 'printed' && this.spec.printedSpecs.length > 0) {
          return `
            <div class="control-group">
              <label class="control-label"><strong>Fabrication sur mesure 5426 Studio</strong></label>
              <ul class="uniform-list">
                ${this.spec.printedSpecs.map((item) => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          `;
        }
        return `
          <div class="control-group">
            <label class="control-label"><strong>Fichiers inclus dans l'archive</strong></label>
            <ul class="uniform-list">
              ${this.spec.filesIncluded.map((item) => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          <div class="control-group">
            <label class="control-label"><strong>Paramètres d'impression 3D recommandés</strong></label>
            <ul class="uniform-list">
              ${this.spec.printSettings.map((item) => `<li>${item}</li>`).join('')}
            </ul>
            <p class="hint-text">${this.spec.printBedNote}</p>
          </div>
        `;

      default:
        return '';
    }
  }


  private bindEvents(): void {
    this.root.querySelectorAll<HTMLElement>('[data-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.step);
        this.activeStep = this.activeStep === id ? 0 : id;
        this.render();
      });
    });

    this.root.querySelector('#btn-open-color-menu')?.addEventListener('click', () => {
      this.activeStep = 4;
      this.render();
      this.root.querySelector('[data-step="4"]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    this.root.querySelectorAll<HTMLElement>('[data-purchase-format]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.format = btn.dataset.purchaseFormat as HornPurchaseFormat;
        this.cartStatus = { type: 'idle', message: '' };
        this.render();
      });
    });




    this.root.querySelector('#btn-similar')?.addEventListener('click', () => {
      this.showSimilarModal = true;
      this.render();
    });
    this.root.querySelector('#btn-close-similar')?.addEventListener('click', () => {
      this.showSimilarModal = false;
      this.render();
    });
    this.root.querySelector('#similar-modal-backdrop')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'similar-modal-backdrop') {
        this.showSimilarModal = false;
        this.render();
      }
    });

    this.root.querySelectorAll<HTMLElement>('[data-view-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.viewMode as '3d' | 'photos';
        this.viewMode = mode;
        this.handlers.onSelectViewMode(mode);
        this.render();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-photo-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.photoIdx);
        this.activePhotoIdx = idx;
        this.viewMode = 'photos';
        this.handlers.onSelectPhoto(idx);
        this.render();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-sim-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const found = PETG_COLORS.find((c) => c.id === btn.dataset.simColor);
        if (found) {
          this.activeColor = found;
          this.viewMode = '3d';
          this.handlers.onSelectViewMode('3d');
          this.handlers.onColorChange(found.hex, Boolean(found.translucent));
          this.render();
        }
      });
    });

    this.root.querySelector('#btn-qty-minus')?.addEventListener('click', () => {
      this.qty = Math.max(1, this.qty - 1);
      this.render();
    });

    this.root.querySelector('#btn-qty-plus')?.addEventListener('click', () => {
      this.qty += 1;
      this.render();
    });

    const qtyInput = this.root.querySelector<HTMLInputElement>('#input-file-qty');
    qtyInput?.addEventListener('change', () => {
      this.qty = Math.max(1, parseInt(qtyInput.value || '1', 10));
      this.render();
    });

    this.root.querySelector('#btn-add-to-cart')?.addEventListener('click', () => {
      this.triggerPrestaShopAddToCart();
    });
  }

  private async triggerPrestaShopAddToCart(): Promise<void> {
    const targetProductId = this.getCurrentTargetProductId();
    const filamentLabel = `${this.spec.title} — Filament : ${this.activeColor.nom_commercial || this.activeColor.name} [${this.activeColor.sku_filament || ''} / ${this.activeColor.hex}]`;

    // Persist filament metadata in PrestaShop customization or module save endpoint if available
    const win = window as unknown as {
      SF3D_SAVE_URL?: string;
      SF3D_CSRF_TOKEN?: string;
    };
    const nativeForm = document.querySelector<HTMLFormElement>('#add-to-cart-or-refresh');
    const nativeProductInput = document.querySelector<HTMLInputElement>('#product_page_product_id');
    const nativeQty = document.querySelector<HTMLInputElement>('#quantity_wanted');
    const nativeCustId = document.querySelector<HTMLInputElement>('#product_customization_id');
    const nativeBtn = document.querySelector<HTMLButtonElement>(
      '#add-to-cart-or-refresh [data-button-action="add-to-cart"]'
    );

    let savedCustomizationId = 0;
    if (this.format === 'printed' && win.SF3D_SAVE_URL) {
      try {
        const saveRes = await fetch(win.SF3D_SAVE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: win.SF3D_CSRF_TOKEN || '',
            id_product: targetProductId,
            qty: this.qty,
            config: {
              hornType: this.spec.hornType,
              format: this.format,
              filament: {
                sku_filament: this.activeColor.sku_filament || '',
                nom_commercial: this.activeColor.nom_commercial || this.activeColor.name,
                gamme: this.activeColor.gamme || '',
                code_hex: this.activeColor.hex,
                translucent: Boolean(this.activeColor.translucent),
              },
              summary: filamentLabel,
            },
          }),
        });
        const saveJson = await saveRes.json().catch(() => null);
        if (saveJson && saveJson.id_customization) {
          savedCustomizationId = Number(saveJson.id_customization);
          if (nativeCustId) {
            nativeCustId.value = String(savedCustomizationId);
          } else if (nativeForm) {
            const hiddenCust = document.createElement('input');
            hiddenCust.type = 'hidden';
            hiddenCust.name = 'id_customization';
            hiddenCust.id = 'product_customization_id';
            hiddenCust.value = String(savedCustomizationId);
            nativeForm.appendChild(hiddenCust);
          }
        }
      } catch {
        // Non-blocking: continue adding to cart
      }
    }

    if (nativeProductInput) {
      nativeProductInput.value = String(targetProductId);
    }
    if (nativeQty) {
      nativeQty.value = String(this.qty);
    }

    if (nativeBtn && !nativeBtn.disabled && targetProductId === Number(nativeProductInput?.value || targetProductId)) {
      this.cartStatus = { type: 'adding', message: 'Ajout au panier en cours…' };
      this.render();
      nativeBtn.click();
      setTimeout(() => {
        this.cartStatus = {
          type: 'added',
          message:
            this.format === 'printed'
              ? `Pavillon imprimé 3D ajouté (${this.activeColor.nom_commercial || this.activeColor.name}) !`
              : 'Fichier 3D ajouté à votre panier !',
        };
        this.render();
      }, 650);
      return;
    }

    if (nativeForm) {
      this.cartStatus = { type: 'adding', message: 'Ajout au panier en cours…' };
      this.render();
      try {
        const formData = new FormData(nativeForm);
        formData.set('id_product', String(targetProductId));
        formData.set('qty', String(this.qty));
        formData.set('add', '1');
        formData.set('action', 'update');
        if (savedCustomizationId > 0) {
          formData.set('id_customization', String(savedCustomizationId));
        }
        formData.set('sf3d_filament_sku', this.activeColor.sku_filament || '');
        formData.set('sf3d_filament_name', this.activeColor.nom_commercial || this.activeColor.name);
        formData.set('sf3d_filament_gamme', this.activeColor.gamme || '');
        formData.set('sf3d_filament_hex', this.activeColor.hex);
        const res = await fetch(nativeForm.action, {
          method: 'POST',
          body: formData,
          headers: { Accept: 'application/json, text/javascript, */*; q=0.01' },
        });
        if (res.ok) {
          this.cartStatus = {
            type: 'added',
            message:
              this.format === 'printed'
                ? `Ajouté au panier : ${filamentLabel}`
                : 'Produit ajouté au panier ! Retrouvez-le dans votre Panier en haut à droite.',
          };
          this.render();
          window.location.reload();
          return;
        }
      } catch {
        // Fallback below
      }
    }

    this.cartStatus = {
      type: 'error',
      message: 'Impossible d\'ajouter automatiquement au panier. Veuillez réessayer.',
    };
    this.render();
  }
}
