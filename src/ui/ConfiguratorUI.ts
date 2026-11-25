import {
  buildOrderTextSummary,
  calculateTotalPrice,
  Cubo2Config,
  CUSTOM_FACE_COLOR_PRICE,
  EDGE_PRICES,
  formatEuro,
  FrontPlateMode,
  getPriceBreakdown,
  HORN_MODELS,
  METAL_FINISHES,
  MOUNT_OPTIONS,
  PAINT_COLORS,
  PETG_COLORS,
  PLAQUE_TEXT_COLORS,
  ScrewColor,
  SHOW_PRICING,
  WOOD_PLATE_PRICE,
} from '../config/pricing';
import { renderSimilarProductsModal } from '../data/catalogLinks';
import { CameraPreset } from '../scene/Cubo2Viewer';

export interface UIHandlers {
  onConfigChange: (config: Cubo2Config) => void;
  onCameraPreset: (preset: CameraPreset) => void;
  onScreenshot: () => string;
  onReset: () => void;
  onOpenHome?: () => void;
}

export class ConfiguratorUI {
  private root: HTMLElement;
  private config: Cubo2Config;
  private handlers: UIHandlers;
  private activeStep = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches ? 0 : 1;
  private showQuoteModal = false;
  private showDescriptionModal = false;
  private showGalleryModal = false;
  private lightboxIdx: number | null = null;
  private showSimilarModal = false;
  private photos: string[] = [];
  private quoteScreenshot = '';
  private showHornInfoModal: string | null = null;
  private copyToast = '';
  private quoteStatus: { type: 'idle' | 'sending' | 'success' | 'error'; message: string } = {
    type: 'idle',
    message: '',
  };
  private customerForm = {
    name: '',
    email: '',
    phone: '',
    quantity: '1 paire (2 enceintes)',
    location: '',
    message: '',
  };

  constructor(root: HTMLElement, initialConfig: Cubo2Config, handlers: UIHandlers, photos: string[] = []) {
    this.root = root;
    this.config = initialConfig;
    this.handlers = handlers;
    this.photos = photos;
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'CUBO2_QUOTE_RESULT') {
        if (event.data.ok) {
          this.quoteStatus = {
            type: 'success',
            message: 'Votre demande de devis a bien été envoyée ! Nous vous recontacterons très rapidement.',
          };
        } else {
          this.quoteStatus = {
            type: 'error',
            message: event.data.error || 'Une erreur est survenue lors de l\'envoi.',
          };
        }
        this.render();
      }
    });
    this.render();
  }

  public setConfig(config: Cubo2Config): void {
    this.config = config;
    this.render();
  }

  private emitChange(): void {
    this.handlers.onConfigChange(this.config);
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'CUBO2_CONFIG_UPDATE',
          config: this.config,
          totalPrice: calculateTotalPrice(this.config),
        },
        '*'
      );
    }
    this.render();
  }

  private render(): void {
    const prevScrollEl = this.root.querySelector<HTMLElement>('.steps-scroll');
    const savedScrollTop = prevScrollEl ? prevScrollEl.scrollTop : 0;

    const total = calculateTotalPrice(this.config);
    const breakdown = getPriceBreakdown(this.config);

    const mountBadgeMap: Record<string, string> = {
      none: 'Aucun',
      feet: 'Pieds',
      castors: 'Roulettes',
    };
    const plateBadgeMap: Record<FrontPlateMode, string> = {
      none: 'Enfoncée',
      wood: 'Plaque bois',
      metal: 'Plaque métal',
    };
    const hornBadgeMap: Record<string, string> = {
      '2x5': '2×5',
      '3x4': '3×4',
      oval: 'Oval',
    };

    const steps = [
      { id: 1, title: 'Structure du Caisson', badge: this.config.edges === 'raw' ? 'Brut' : 'Arrondi' },
      { id: 2, title: 'Façade', badge: plateBadgeMap[this.config.frontPlate.mode] },
      { id: 3, title: 'Pavillon & Diffuseur', badge: hornBadgeMap[this.config.hornModel.type] ?? this.config.hornModel.type },
      { id: 4, title: 'Piétements & Mobilité', badge: mountBadgeMap[this.config.mount.type] ?? '' },
      { id: 5, title: 'Plaque d\'identification', badge: this.config.badge.text.trim() ? 'Personnalisée' : 'Standard' },
    ];

    this.root.innerHTML = `
      <div class="panel-header">
        <div class="brand-row">
          <h1 class="product-title">CUBO 2</h1>
          <div class="header-btns">
            <button class="btn-icon" id="btn-gallery" title="Galerie photos">Photos</button>
            <button class="btn-icon" id="btn-desc" title="Descriptif &amp; Spécifications">Descriptif</button>
          </div>
        </div>
      </div>

      <div class="steps-scroll">
        ${steps
          .map(
            (s) => `
          <section class="step-card ${this.activeStep === s.id ? 'is-open' : ''}">
            <button class="step-header" data-step="${s.id}">
              <span class="step-title">${s.title}</span>
              <span class="step-chevron">${this.activeStep === s.id ? '−' : '+'}</span>
            </button>
            ${this.activeStep === s.id ? `<div class="step-body">${this.renderStepContent(s.id)}</div>` : ''}
          </section>
        `
          )
          .join('')}
      </div>

      <div class="panel-footer">
        ${
          SHOW_PRICING
            ? `
        <div class="price-summary">
          <div class="price-row-main">
            <div>
              <div class="price-label">Tarif estimé TTC (la paire)</div>
              <div class="price-base-note">À partir de ${formatEuro(this.config.basePrice)} TTC · Livraison non incluse (retrait Atelier 21 Orléans possible)</div>
            </div>
            <div class="price-value">${formatEuro(total)}</div>
          </div>
          <details class="price-details">
            <summary>Détail du chiffrage (${breakdown.length} lignes)</summary>
            <ul>
              ${breakdown.map((b) => `<li><span>${b.label}</span><span>${formatEuro(b.amount)}</span></li>`).join('')}
            </ul>
          </details>
        </div>
        `
            : ''
        }
        <div class="footer-actions">
          <button class="btn-secondary" id="btn-screenshot" title="Capturer un rendu PNG">Aperçu PNG</button>
          <button class="btn-primary" id="btn-quote">Demander un devis →</button>
        </div>
      </div>

      ${this.showQuoteModal ? this.renderQuoteModal(total) : ''}
      ${this.showHornInfoModal ? this.renderHornInfoModal() : ''}
      ${this.renderDescriptionModal(this.showDescriptionModal)}
      ${this.renderGalleryModal(this.showGalleryModal)}
      ${renderSimilarProductsModal(8, this.showSimilarModal)}
    `;

    const nextScrollEl = this.root.querySelector<HTMLElement>('.steps-scroll');
    if (nextScrollEl && savedScrollTop > 0) {
      nextScrollEl.scrollTop = savedScrollTop;
    }

    this.bindEvents();
  }

  private renderPetgPalette(
    selectedHex: string,
    selectedTranslucent: boolean,
    attrPrefix: 'horn' | 'plaque'
  ): string {
    const classic = PETG_COLORS.filter((c) => !c.translucent);
    const translucent = PETG_COLORS.filter((c) => c.translucent);
    const renderBtn = (c: (typeof PETG_COLORS)[number]) => {
      const isActive = selectedHex === c.hex && selectedTranslucent === Boolean(c.translucent);
      return `
        <button
          class="swatch ${c.translucent ? 'is-translucent' : ''} ${isActive ? 'active' : ''}"
          style="background:${c.hex}"
          title="${c.name}"
          data-${attrPrefix}-color="${c.hex}"
          data-${attrPrefix}-name="${c.name}"
          data-${attrPrefix}-tr="${c.translucent ? '1' : '0'}"
        ></button>
      `;
    };
    return `
      <div class="sub-label">Classique</div>
      <div class="swatch-grid">${classic.map(renderBtn).join('')}</div>
      <div class="sub-label" style="margin-top:6px">Translucent</div>
      <div class="swatch-grid">${translucent.map(renderBtn).join('')}</div>
    `;
  }

  private renderStepContent(stepId: number): string {
    switch (stepId) {
      case 1:
        return `
          <div class="control-group">
            <label class="control-label">Finition des arêtes</label>
            <div class="segmented-2">
              <button class="seg-btn ${this.config.edges === 'raw' ? 'active' : ''}" data-edge="raw">
                Arêtes brutes ${SHOW_PRICING ? '<span class="delta">Inclus</span>' : ''}
              </button>
              <button class="seg-btn ${this.config.edges === 'rounded' ? 'active' : ''}" data-edge="rounded">
                Arêtes arrondies ${SHOW_PRICING ? `<span class="delta">+${formatEuro(EDGE_PRICES.rounded)}</span>` : ''}
              </button>
            </div>
          </div>

          <div class="control-group">
            <label class="control-label">Matériau & Finition du corps</label>
            <div class="segmented-2">
              <button class="seg-btn ${this.config.bodyFinish.type === 'plywood' ? 'active' : ''}" data-body-type="plywood">
                Contreplaqué ${SHOW_PRICING ? '<span class="delta">Inclus</span>' : ''}
              </button>
              <button class="seg-btn ${this.config.bodyFinish.type === 'solid' ? 'active' : ''}" data-body-type="solid">
                Peinture ${SHOW_PRICING ? '<span class="delta">Inclus</span>' : ''}
              </button>
            </div>
          </div>

          ${
            this.config.bodyFinish.type === 'solid'
              ? `
            <div class="control-group">
              <label class="control-label">Aspect</label>
              <div class="segmented-2">
                <button class="seg-btn ${this.config.bodyFinish.surface === 'matte' ? 'active' : ''}" data-surface="matte">Mat</button>
                <button class="seg-btn ${this.config.bodyFinish.surface === 'satin' ? 'active' : ''}" data-surface="satin">Satiné</button>
              </div>
            </div>
            <div class="control-group">
              <label class="control-label">Teinte — <strong>${this.config.bodyFinish.colorName}</strong></label>
              <div class="swatch-grid">
                ${PAINT_COLORS.map(
                  (c) => `
                  <button
                    class="swatch ${this.config.bodyFinish.color === c.hex ? 'active' : ''}"
                    style="background:${c.hex}"
                    title="${c.name}"
                    data-body-color="${c.hex}"
                    data-body-name="${c.name}"
                  ></button>
                `
                ).join('')}
              </div>
            </div>
          `
              : ''
          }
        `;

      case 2:
        return `
          <div class="control-group">
            <label class="control-label">Habillage façade</label>
            <div class="option-list">
              <button class="option-row ${this.config.frontPlate.mode === 'none' ? 'active' : ''}" data-plate-mode="none">
                <div class="opt-col">
                  <span class="opt-name">Façade enfoncée</span>
                  <span class="opt-sub">Vis apparentes</span>
                </div>
                ${SHOW_PRICING ? '<span class="opt-price">Inclus</span>' : ''}
              </button>
              <button class="option-row ${this.config.frontPlate.mode === 'wood' ? 'active' : ''}" data-plate-mode="wood">
                <div class="opt-col">
                  <span class="opt-name">Façade bois affleurante</span>
                  <span class="opt-sub">20 mm, vis masquées</span>
                </div>
                ${SHOW_PRICING ? '<span class="opt-price">Inclus</span>' : ''}
              </button>
              <button class="option-row ${this.config.frontPlate.mode === 'metal' ? 'active' : ''}" data-plate-mode="metal">
                <div class="opt-col">
                  <span class="opt-name">Plaque métal affleurante</span>
                  <span class="opt-sub">Vis masquées</span>
                </div>
                ${SHOW_PRICING ? '<span class="opt-price">+100–150 €</span>' : ''}
              </button>
            </div>
          </div>

          <div class="control-group">
            <label class="control-label">Couleur des vis du haut-parleur</label>
            <div class="segmented-2">
              <button class="seg-btn ${this.config.screwColor === 'silver' ? 'active' : ''}" data-screw="silver">
                Argenté ${SHOW_PRICING ? '<span class="delta">Inclus</span>' : ''}
              </button>
              <button class="seg-btn ${this.config.screwColor === 'black' ? 'active' : ''}" data-screw="black">
                Noir ${SHOW_PRICING ? '<span class="delta">Inclus</span>' : ''}
              </button>
            </div>
          </div>

          ${
            this.config.frontPlate.mode === 'metal'
              ? `
            <div class="control-group">
              <label class="control-label">Finition de la plaque métal</label>
              <div class="option-list">
                ${METAL_FINISHES.map(
                  (mf) => `
                  <button class="option-row ${this.config.frontPlate.metalFinish === mf.id ? 'active' : ''}" data-plate-finish="${mf.id}">
                    <span class="dot" style="background:${mf.hex}"></span>
                    <span class="opt-name">${mf.name}</span>
                    ${SHOW_PRICING ? `<span class="opt-price">+${formatEuro(mf.priceDelta)}</span>` : ''}
                  </button>
                `
                ).join('')}
              </div>
            </div>
          `
              : ''
          }

          ${
            this.config.frontPlate.mode !== 'metal'
              ? `
          <div class="control-group">
            <label class="control-label">Couleur de la façade${this.config.frontPlate.mode === 'wood' ? ' & plaque bois' : ''}</label>
            <div class="segmented-2">
              <button class="seg-btn ${this.config.frontFaceColor.mode === 'match_body' ? 'active' : ''}" data-face-mode="match_body">
                Identique au corps ${SHOW_PRICING ? '<span class="delta">Inclus</span>' : ''}
              </button>
              <button class="seg-btn ${this.config.frontFaceColor.mode === 'custom' ? 'active' : ''}" data-face-mode="custom">
                Couleur différente ${SHOW_PRICING ? `<span class="delta">+${formatEuro(CUSTOM_FACE_COLOR_PRICE)}</span>` : ''}
              </button>
            </div>
            ${
              this.config.frontFaceColor.mode === 'custom'
                ? `
              <div class="swatch-grid" style="margin-top:8px">
                ${PAINT_COLORS.map(
                  (c) => `
                  <button
                    class="swatch ${this.config.frontFaceColor.color === c.hex ? 'active' : ''}"
                    style="background:${c.hex}"
                    title="${c.name}"
                    data-face-color="${c.hex}"
                    data-face-name="${c.name}"
                  ></button>
                `
                ).join('')}
              </div>
            `
                : ''
            }
          </div>
          `
              : ''
          }
        `;

      case 3:
        return `
          <div class="control-group">
            <div class="label-with-info">
              <label class="control-label">Modèle de pavillon / diffuseur</label>
              <button class="info-circle-btn" type="button" data-horn-info="all" title="Comparer les caractéristiques des diffuseurs">i</button>
            </div>
            <div class="option-list">
              ${HORN_MODELS.map(
                (h) => `
                <div class="option-row-wrap">
                  <button class="option-row ${this.config.hornModel.type === h.id ? 'active' : ''}" data-horn-type="${h.id}">
                    <div class="opt-col">
                      <span class="opt-name">${h.name}</span>
                      <span class="opt-sub">${h.subtitle} (${h.dispersion})</span>
                    </div>
                    ${SHOW_PRICING ? `<span class="opt-price">${h.priceDelta === 0 ? 'Inclus' : `+${formatEuro(h.priceDelta)}`}</span>` : ''}
                  </button>
                  <button class="info-circle-btn" type="button" data-horn-info="${h.id}" title="Caractéristiques de ${h.name}">i</button>
                </div>
              `
              ).join('')}
            </div>
          </div>

          <div class="control-group">
            <label class="control-label">Couleur PETG — <strong>${this.config.hornModel.colorName}</strong></label>
            ${this.renderPetgPalette(this.config.hornModel.color, this.config.hornModel.translucent, 'horn')}
          </div>
        `;

      case 4:
        return `
          <div class="control-group">
            <label class="control-label">Configuration basse</label>
            <div class="option-list">
              ${MOUNT_OPTIONS.map(
                (m) => `
                <button class="option-row ${this.config.mount.type === m.id ? 'active' : ''}" data-mount="${m.id}">
                  <div class="opt-col">
                    <span class="opt-name">${m.name}</span>
                    <span class="opt-sub">${m.description}</span>
                  </div>
                  ${SHOW_PRICING ? `<span class="opt-price">${m.priceDelta === 0 ? 'Inclus' : `+${formatEuro(m.priceDelta)}`}</span>` : ''}
                </button>
              `
              ).join('')}
            </div>
          </div>
        `;

      case 5:
        return `
          <div class="control-group">
            <label class="control-label" for="plaque-text-input">Texte supplémentaire sous « cubo 2 »</label>
            <div class="input-row">
              <input
                id="plaque-text-input"
                class="text-input"
                type="text"
                maxlength="24"
                placeholder="CUSTOM TEXT"
                value="${this.config.badge.text.replace(/"/g, '&quot;')}"
              />
              <button class="btn-secondary btn-sm" id="btn-focus-plaque" type="button" title="Zoomer sur la plaque">Voir</button>
            </div>
            <p class="hint-text">Gravé sous « 5426 studio / cubo 2 » sur la plaque supérieure (max 24 car.).</p>
          </div>

          <div class="control-group">
            <label class="control-label">Couleur de la plaque — <strong>${this.config.badge.plateColorName}</strong></label>
            ${this.renderPetgPalette(this.config.badge.plateColor, this.config.badge.plateTranslucent, 'plaque')}
          </div>

          <div class="control-group">
            <label class="control-label">Couleur du texte — <strong>${this.config.badge.textColorName}</strong></label>
            <div class="swatch-grid">
              ${PLAQUE_TEXT_COLORS.map(
                (c) => `
                <button
                  class="swatch ${this.config.badge.textColor === c.hex ? 'active' : ''}"
                  style="background:${c.hex}"
                  title="${c.name}"
                  data-plaque-tcolor="${c.hex}"
                  data-plaque-tname="${c.name}"
                ></button>
              `
              ).join('')}
            </div>
          </div>
        `;

      default:
        return '';
    }
  }

  private renderHornInfoModal(): string {
    return `
      <div class="modal-backdrop" id="horn-modal-backdrop">
        <div class="modal-card modal-wide">
          <div class="modal-head">
            <h2>Caractéristiques des Diffuseurs — 5426.fr</h2>
            <button class="btn-icon" id="btn-close-horn-modal">✕</button>
          </div>
          <div class="horn-compare-grid">
            ${HORN_MODELS.map(
              (h) => `
              <div class="horn-spec-card ${this.showHornInfoModal === h.id || this.config.hornModel.type === h.id ? 'is-highlighted' : ''}">
                <div class="horn-spec-head">
                  <strong>${h.name}</strong>
                  ${SHOW_PRICING ? `<span class="horn-spec-price">${h.priceDelta === 0 ? 'Inclus' : `+${formatEuro(h.priceDelta)}`}</span>` : ''}
                </div>
                <dl class="horn-spec-list">
                  <dt>Architecture</dt><dd>${h.architecture}</dd>
                  <dt>Dispersion</dt><dd>${h.dispersion}</dd>
                  <dt>Compatibilité</dt><dd>${h.throat}</dd>
                  <dt>Dimensions</dt><dd>${h.dimensions}</dd>
                  <dt>Matériau</dt><dd>Impression 3D PETG (Classique ou Translucent)</dd>
                  <dt>Usage conseillé</dt><dd>${h.usage}</dd>
                </dl>
                <a class="horn-spec-link" href="${h.url}" target="_blank" rel="noopener noreferrer">Voir la fiche sur 5426.fr →</a>
              </div>
            `
            ).join('')}
          </div>
        </div>
      </div>
    `;
  }

  private renderDescriptionModal(isOpen: boolean): string {
    return `
      <div class="modal-backdrop ${isOpen ? '' : 'is-hidden'}" id="desc-modal-backdrop" aria-hidden="${!isOpen}">
        <div class="modal-card modal-wide desc-modal-card">
          <div class="modal-head">
            <h2>CUBO 2 — Descriptif &amp; Spécifications (5426 Studio)</h2>
            <button class="btn-icon" id="btn-close-desc-modal">✕</button>
          </div>
          <div class="desc-content">
            <p class="desc-lead">
              L'ensemble <strong>CUBO 2</strong> est une paire d'enceintes 2 voies. Son caisson principal repose sur une
              architecture bass-reflex embarquant un haut-parleur de 15 pouces dédié aux basses fréquences. Le haut de
              l'enceinte est surmonté d'un diffuseur pour tweeter entièrement imprimé en 3D (PETG), spécifiquement
              modélisé pour s'adapter aux courbes acoustiques du moteur à compression monté à l'arrière. Le système
              complet délivre une puissance totale de <strong>800 W RMS</strong>.
            </p>

            <h3>Conception acoustique &amp; Haut-parleurs</h3>
            <p>
              L'enceinte passive CUBO 2 associe un haut-parleur 15 pouces et un moteur à compression monté sur un
              pavillon imprimé en 3D sur mesure :
            </p>
            <ul>
              <li><strong>5426 Multicell Horn 2×5</strong> : privilégie une dispersion horizontale très large (100° H × 45° V).</li>
              <li><strong>5426 Multicell Horn 3×4</strong> : offre une plus grande ouverture verticale avec un angle plus resserré en largeur (85° H × 65° V).</li>
              <li><strong>Pavillon Acoustique Elliptique 5426 Studio</strong> : profil elliptique compact à transition fluide (90° H × 55° V).</li>
            </ul>

            <h3>Filtre passif : CROSS 2 (5426 Studio)</h3>
            <p>
              CUBO 2 intègre le crossover passif 2 voies <strong>CROSS 2</strong>, calibré pour le haut-parleur 15&quot; et
              le moteur à compression :
            </p>
            <ul>
              <li><strong>Topologie Linkwitz-Riley 2e ordre (12 dB/octave)</strong> : coupure à 2,4 kHz (compatible 2,8 kHz).</li>
              <li><strong>Tenue en puissance 400 W RMS (800 W crête) sous 8 Ω</strong> : pistes de puissance 6,0 mm, cuivre 2 oz (70 µm) et atténuateur L-Pad 40 W.</li>
              <li><strong>Composants</strong> : condensateurs polypropylène MKP 250 V / 400 V, bobines faible résistance (Rdc &lt; 0,25 Ω) orientées à 90°.</li>
              <li><strong>Fabrication</strong> : PCB 220 × 150 mm Noir Mat, finition or ENIG, borniers 30 A.</li>
            </ul>

            <h3>Personnalisation &amp; Options</h3>
            <ul>
              <li><strong>Caisson &amp; Façade</strong> : contreplaqué verni ou peinture, arêtes brutes ou arrondies, façade enfoncée, façade bois affleurante ou plaque métal affleurante.</li>
              <li><strong>Plaque d'identification</strong> : couleur de la plaque PETG, couleur du texte et inscription personnalisable sous « cubo 2 ».</li>
              <li><strong>Piétements &amp; mobilité</strong> : pieds TPU ou roulettes pivotantes avec frein.</li>
            </ul>

            <h3>Livraison &amp; Retrait</h3>
            <p>
              La livraison n'est pas incluse dans le tarif : les frais sont recalculés en fonction du lieu de livraison.
              Il est également possible de venir récupérer votre commande sur place à l'<strong>Atelier 21 (Orléans)</strong>.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  private renderGalleryModal(isOpen: boolean): string {
    const imgs =
      this.photos.length > 0
        ? this.photos
        : [
            'https://www.5426.fr/8-cubo-2.html',
          ];
    return `
      <div class="modal-backdrop ${isOpen ? '' : 'is-hidden'}" id="gallery-modal-backdrop" aria-hidden="${!isOpen}">
        <div class="modal-card modal-wide">
          <div class="modal-head">
            <h2>Galerie Photos — Enceinte CUBO 2 (5426 Studio)</h2>
            <button class="btn-icon" id="btn-close-gallery-modal">✕</button>
          </div>
          ${
            this.photos.length > 0
              ? `
            <div class="cubo-gallery-grid">
              ${imgs
                .map(
                  (url, i) => `
                <button type="button" class="cubo-gallery-item cubo-gallery-btn" data-gallery-zoom="${i}" title="Agrandir la photo ${i + 1}">
                  <img src="${url}" alt="Enceinte CUBO 2 5426 Studio — finition bois, pavillon 3D PETG et filtre CROSS 2 (${i + 1})" loading="lazy" />
                </button>
              `
                )
                .join('')}
            </div>
          `
              : `<p class="hint-text">Aucune photo disponible.</p>`
          }
        </div>
      </div>
      ${
        isOpen && this.lightboxIdx !== null && this.photos[this.lightboxIdx]
          ? `
        <div class="lightbox-backdrop" id="gallery-lightbox">
          <button type="button" class="photo-nav-btn photo-nav-prev" id="btn-lb-prev" title="Photo précédente">‹</button>
          <img class="lightbox-img" src="${this.photos[this.lightboxIdx]}" alt="CUBO 2 — photo ${this.lightboxIdx + 1}" />
          <button type="button" class="photo-nav-btn photo-nav-next" id="btn-lb-next" title="Photo suivante">›</button>
          <div class="lightbox-bar">
            <span>${this.lightboxIdx + 1} / ${this.photos.length}</span>
            <button type="button" class="btn-icon" id="btn-lb-close">Fermer ✕</button>
          </div>
        </div>
      `
          : ''
      }
    `;
  }

  private renderQuoteModal(total: number): string {
    const mf = METAL_FINISHES.find((m) => m.id === this.config.frontPlate.metalFinish);
    const horn = HORN_MODELS.find((h) => h.id === this.config.hornModel.type);
    const mount = MOUNT_OPTIONS.find((m) => m.id === this.config.mount.type);

    const facadeLabel =
      this.config.frontPlate.mode === 'none'
        ? `Façade bois enfoncée · ${this.config.frontFaceColor.colorName}`
        : this.config.frontPlate.mode === 'wood'
          ? `Façade bois affleurante 20 mm · ${this.config.frontFaceColor.colorName}`
          : `Plaque métal (${mf?.name ?? this.config.frontPlate.metalFinish})`;

    const facadeDelta =
      this.config.frontPlate.mode === 'metal'
        ? this.config.frontPlate.priceDelta
        : this.config.frontFaceColor.mode === 'custom'
          ? CUSTOM_FACE_COLOR_PRICE
          : 0;

    const caissonLabel =
      this.config.bodyFinish.type === 'plywood'
        ? 'Contreplaqué verni satiné'
        : `Peinture ${this.config.bodyFinish.surface === 'matte' ? 'Mate' : 'Satinée'} — ${this.config.bodyFinish.colorName}`;

    const fmtDelta = (d: number) => (d > 0 ? `+${formatEuro(d)}` : '+0 €');

    const rows: Array<[string, string, string]> = [
      ['1. Arêtes', this.config.edges === 'raw' ? 'Brutes' : 'Arrondies', fmtDelta(EDGE_PRICES[this.config.edges])],
      ['2. Caisson', caissonLabel, '+0 €'],
      ['3. Façade', `${facadeLabel} · Vis ${this.config.screwColor === 'silver' ? 'argentées' : 'noires'}`, fmtDelta(facadeDelta)],
      [
        '4. Pavillon',
        `${horn?.name ?? this.config.hornModel.type} · ${this.config.hornModel.colorName}${this.config.hornModel.skuFilament ? ` (${this.config.hornModel.skuFilament})` : ''}`,
        '+0 €',
      ],
      ['5. Piètement', mount?.name ?? this.config.mount.type, fmtDelta(this.config.mount.priceDelta)],
      [
        '6. Plaque',
        `${this.config.badge.plateColorName}${this.config.badge.text.trim() ? ` · « ${this.config.badge.text.trim()} » (${this.config.badge.textColorName})` : ' · Standard'}`,
        '+0 €',
      ],
    ];

    return `
      <div class="modal-backdrop" id="modal-backdrop">
        <div class="modal-card modal-wide modal-quote">
          <div class="modal-head">
            <div>
              <h2>Demande de devis — CUBO 2</h2>
              <p class="quote-subtitle">Total estimé : <strong>${formatEuro(total)} TTC</strong> (la paire) · Livraison non incluse (recalculée selon destination) · Retrait possible Atelier 21 (Orléans)</p>
            </div>
            <button class="btn-icon" id="btn-close-modal" title="Fermer">✕</button>
          </div>

          <form id="quote-contact-form" class="quote-contact-form">
            <div class="quote-layout-2col">
              <div class="quote-summary-col">
                ${
                  this.quoteScreenshot
                    ? `
                  <div class="quote-visual-box">
                    <img src="${this.quoteScreenshot}" alt="Aperçu 3D CUBO 2 configurée" class="quote-preview-img" />
                    <a class="quote-dl-link" href="${this.quoteScreenshot}" download="cubo2-configuration.png">
                      Télécharger l'aperçu (.png) ↓
                    </a>
                  </div>
                `
                    : ''
                }
                <div class="quote-section-title">Détail des 6 étapes &amp; suppléments</div>
                <dl class="quote-spec-list">
                  ${rows
                    .map(
                      ([k, v, d]) =>
                        `<div class="quote-spec-row quote-spec-row--3col"><dt>${k}</dt><dd>${v}</dd><span class="quote-spec-delta">${d}</span></div>`
                    )
                    .join('')}
                  <div class="quote-spec-row quote-spec-row--total"><dt>Total estimé (la paire)</dt><dd></dd><span class="quote-spec-delta">${formatEuro(total)} TTC</span></div>
                </dl>
              </div>

              <div class="quote-fields-col">
                <div class="quote-section-title">Vos coordonnées &amp; livraison</div>
                <div class="quote-fields-stack">
                  <div class="form-field">
                    <label for="quote-name">Nom &amp; Prénom *</label>
                    <input
                      id="quote-name"
                      class="text-input"
                      type="text"
                      required
                      placeholder="Votre nom complet"
                      value="${this.customerForm.name.replace(/"/g, '&quot;')}"
                    />
                  </div>
                  <div class="form-field">
                    <label for="quote-email">Adresse e-mail *</label>
                    <input
                      id="quote-email"
                      class="text-input"
                      type="email"
                      required
                      placeholder="exemple@domaine.fr"
                      value="${this.customerForm.email.replace(/"/g, '&quot;')}"
                    />
                  </div>
                  <div class="form-field">
                    <label for="quote-phone">Numéro de téléphone *</label>
                    <input
                      id="quote-phone"
                      class="text-input"
                      type="tel"
                      required
                      placeholder="06 00 00 00 00"
                      value="${this.customerForm.phone.replace(/"/g, '&quot;')}"
                    />
                  </div>
                  <div class="quote-2fields">
                    <div class="form-field">
                      <label for="quote-qty">Quantité souhaitée</label>
                      <select id="quote-qty" class="text-input">
                        <option value="1 pièce" ${this.customerForm.quantity === '1 pièce' ? 'selected' : ''}>1 pièce</option>
                        <option value="1 paire (2 enceintes)" ${this.customerForm.quantity === '1 paire (2 enceintes)' ? 'selected' : ''}>1 paire (2 enceintes)</option>
                        <option value="Autre" ${this.customerForm.quantity === 'Autre' ? 'selected' : ''}>Autre (préciser)</option>
                      </select>
                    </div>
                    <div class="form-field">
                      <label for="quote-location">Code postal / Pays</label>
                      <input
                        id="quote-location"
                        class="text-input"
                        type="text"
                        placeholder="Ex : 45000, France"
                        value="${this.customerForm.location.replace(/"/g, '&quot;')}"
                      />
                    </div>
                  </div>
                  <div class="form-field">
                    <label for="quote-message">Remarques éventuelles</label>
                    <textarea
                      id="quote-message"
                      class="text-input quote-textarea"
                      rows="2"
                      placeholder="Délai souhaité, précision sur la plaque, question…"
                    >${this.customerForm.message.replace(/</g, '&lt;')}</textarea>
                  </div>
                </div>
              </div>
            </div>

            ${
              this.quoteStatus.type !== 'idle'
                ? `<div class="quote-status quote-status--${this.quoteStatus.type}">${this.quoteStatus.message}</div>`
                : ''
            }
            ${this.copyToast ? `<div class="copy-toast">${this.copyToast}</div>` : ''}

            <div class="modal-actions">
              <button type="button" class="btn-secondary" id="btn-copy-text">Copier la fiche</button>
              <button
                type="submit"
                class="btn-primary"
                id="btn-submit-quote"
                ${this.quoteStatus.type === 'sending' ? 'disabled' : ''}
              >
                ${this.quoteStatus.type === 'sending' ? 'Envoi en cours…' : 'Envoyer la demande de devis →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLElement>('[data-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.step);
        this.activeStep = this.activeStep === id ? 0 : id;
        this.render();
      });
    });

    this.root.querySelector('#btn-reset')?.addEventListener('click', () => {
      this.handlers.onReset();
    });

    this.root.querySelector('#btn-home')?.addEventListener('click', () => {
      this.handlers.onOpenHome?.();
    });

    this.root.querySelector('#btn-desc')?.addEventListener('click', () => {
      this.showDescriptionModal = true;
      this.render();
    });
    this.root.querySelector('#btn-close-desc-modal')?.addEventListener('click', () => {
      this.showDescriptionModal = false;
      this.render();
    });
    this.root.querySelector('#desc-modal-backdrop')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'desc-modal-backdrop') {
        this.showDescriptionModal = false;
        this.render();
      }
    });

    this.root.querySelector('#btn-gallery')?.addEventListener('click', () => {
      this.showGalleryModal = true;
      this.render();
    });
    this.root.querySelector('#btn-close-gallery-modal')?.addEventListener('click', () => {
      this.showGalleryModal = false;
      this.lightboxIdx = null;
      this.render();
    });
    this.root.querySelector('#gallery-modal-backdrop')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'gallery-modal-backdrop') {
        this.showGalleryModal = false;
        this.lightboxIdx = null;
        this.render();
      }
    });
    this.root.querySelectorAll<HTMLElement>('[data-gallery-zoom]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.lightboxIdx = Number(btn.dataset.galleryZoom);
        this.render();
      });
    });
    this.root.querySelector('#btn-lb-close')?.addEventListener('click', () => {
      this.lightboxIdx = null;
      this.render();
    });
    this.root.querySelector('#btn-lb-prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.lightboxIdx !== null && this.photos.length > 0) {
        this.lightboxIdx = (this.lightboxIdx - 1 + this.photos.length) % this.photos.length;
        this.render();
      }
    });
    this.root.querySelector('#btn-lb-next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.lightboxIdx !== null && this.photos.length > 0) {
        this.lightboxIdx = (this.lightboxIdx + 1) % this.photos.length;
        this.render();
      }
    });
    this.root.querySelector('#gallery-lightbox')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'gallery-lightbox') {
        this.lightboxIdx = null;
        this.render();
      }
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

    this.root.querySelector('#btn-screenshot')?.addEventListener('click', () => {
      const dataUrl = this.handlers.onScreenshot();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `cubo2-5426-studio.png`;
      a.click();
    });

    this.root.querySelectorAll<HTMLElement>('[data-edge]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.edges = btn.dataset.edge as 'raw' | 'rounded';
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-body-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.bodyType as 'plywood' | 'solid';
        this.config.bodyFinish.type = t;
        if (t === 'plywood') {
          this.config.bodyFinish.color = null;
          this.config.bodyFinish.colorName = 'Contreplaqué';
          this.config.bodyFinish.priceDelta = 0;
        } else {
          const def = PAINT_COLORS[10]; // Noir Intense
          this.config.bodyFinish.color = this.config.bodyFinish.color ?? def.hex;
          this.config.bodyFinish.colorName = this.config.bodyFinish.colorName === 'Contreplaqué' ? def.name : this.config.bodyFinish.colorName;
          this.config.bodyFinish.priceDelta = 0;
        }
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-surface]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.bodyFinish.surface = btn.dataset.surface as 'matte' | 'satin';
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-body-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.bodyFinish.color = btn.dataset.bodyColor!;
        this.config.bodyFinish.colorName = btn.dataset.bodyName!;
        this.emitChange();
      });
    });

    this.root.querySelector<HTMLInputElement>('#body-custom-color')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value;
      this.config.bodyFinish.color = val;
      this.config.bodyFinish.colorName = `Teinte Sur Mesure (${val.toUpperCase()})`;
      this.emitChange();
    });

    this.root.querySelectorAll<HTMLElement>('[data-plate-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.plateMode as FrontPlateMode;
        this.config.frontPlate.mode = mode;
        if (mode === 'none') {
          this.config.frontPlate.priceDelta = 0;
        } else if (mode === 'wood') {
          this.config.frontPlate.priceDelta = WOOD_PLATE_PRICE;
        } else {
          const mf = METAL_FINISHES.find((m) => m.id === this.config.frontPlate.metalFinish) ?? METAL_FINISHES[0];
          this.config.frontPlate.priceDelta = mf.priceDelta;
          this.config.frontFaceColor = {
            mode: 'match_body',
            color: null,
            colorName: 'Identique au caisson',
            priceDelta: 0,
          };
        }
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-screw]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.screwColor = btn.dataset.screw as ScrewColor;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-plate-finish]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.plateFinish as Cubo2Config['frontPlate']['metalFinish'];
        const mf = METAL_FINISHES.find((m) => m.id === id) ?? METAL_FINISHES[0];
        this.config.frontPlate.metalFinish = id;
        this.config.frontPlate.priceDelta = mf.priceDelta;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-face-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.faceMode as 'match_body' | 'custom';
        this.config.frontFaceColor.mode = mode;
        if (mode === 'match_body') {
          this.config.frontFaceColor.color = null;
          this.config.frontFaceColor.colorName = 'Identique au caisson';
          this.config.frontFaceColor.priceDelta = 0;
        } else {
          const def = PAINT_COLORS[10];
          this.config.frontFaceColor.color = this.config.frontFaceColor.color ?? def.hex;
          this.config.frontFaceColor.colorName = this.config.frontFaceColor.colorName === 'Identique au caisson' ? def.name : this.config.frontFaceColor.colorName;
          this.config.frontFaceColor.priceDelta = CUSTOM_FACE_COLOR_PRICE;
        }
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-face-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.frontFaceColor.color = btn.dataset.faceColor!;
        this.config.frontFaceColor.colorName = btn.dataset.faceName!;
        this.emitChange();
      });
    });

    this.root.querySelector<HTMLInputElement>('#face-custom-color')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value;
      this.config.frontFaceColor.color = val;
      this.config.frontFaceColor.colorName = `Teinte Sur Mesure (${val.toUpperCase()})`;
      this.emitChange();
    });

    this.root.querySelectorAll<HTMLElement>('[data-horn-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.hornType as Cubo2Config['hornModel']['type'];
        const h = HORN_MODELS.find((m) => m.id === id) ?? HORN_MODELS[0];
        this.config.hornModel.type = id;
        this.config.hornModel.priceDelta = h.priceDelta;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-horn-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const hex = btn.dataset.hornColor!;
        const tr = btn.dataset.hornTr === '1';
        const opt = PETG_COLORS.find((c) => c.hex === hex && Boolean(c.translucent) === tr);
        this.config.hornModel.color = hex;
        this.config.hornModel.colorName = opt?.name || btn.dataset.hornName!;
        this.config.hornModel.skuFilament = opt?.sku_filament || '';
        this.config.hornModel.gamme = opt?.gamme || '';
        this.config.hornModel.translucent = tr;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-mount]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.mount as 'none' | 'feet' | 'castors';
        const m = MOUNT_OPTIONS.find((o) => o.id === id) ?? MOUNT_OPTIONS[0];
        this.config.mount.type = id;
        this.config.mount.priceDelta = m.priceDelta;
        this.emitChange();
      });
    });

    const plaqueInput = this.root.querySelector<HTMLInputElement>('#plaque-text-input');
    plaqueInput?.addEventListener('input', () => {
      this.config.badge.text = plaqueInput.value;
      this.config.badge.priceDelta = 0;
      this.handlers.onConfigChange(this.config);
      const priceEl = this.root.querySelector('.price-value');
      if (priceEl) priceEl.textContent = formatEuro(calculateTotalPrice(this.config));
    });

    this.root.querySelector('#btn-focus-plaque')?.addEventListener('click', () => {
      this.handlers.onCameraPreset('top');
    });

    this.root.querySelectorAll<HTMLElement>('[data-plaque-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const hex = btn.dataset.plaqueColor!;
        const tr = btn.dataset.plaqueTr === '1';
        const opt = PETG_COLORS.find((c) => c.hex === hex && Boolean(c.translucent) === tr);
        this.config.badge.plateColor = hex;
        this.config.badge.plateColorName = opt?.name || btn.dataset.plaqueCname!;
        this.config.badge.plateSkuFilament = opt?.sku_filament || '';
        this.config.badge.plateTranslucent = tr;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-plaque-tcolor]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.badge.textColor = btn.dataset.plaqueTcolor!;
        this.config.badge.textColorName = btn.dataset.plaqueTname!;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-horn-info]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showHornInfoModal = btn.dataset.hornInfo ?? 'all';
        this.render();
      });
    });

    this.root.querySelector('#btn-close-horn-modal')?.addEventListener('click', () => {
      this.showHornInfoModal = null;
      this.render();
    });

    this.root.querySelector('#horn-modal-backdrop')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'horn-modal-backdrop') {
        this.showHornInfoModal = null;
        this.render();
      }
    });

    this.root.querySelector('#btn-quote')?.addEventListener('click', () => {
      this.quoteScreenshot = this.handlers.onScreenshot();
      this.showQuoteModal = true;
      this.copyToast = '';
      this.quoteStatus = { type: 'idle', message: '' };
      this.render();
    });
    this.root.querySelector('#btn-close-modal')?.addEventListener('click', () => {
      this.showQuoteModal = false;
      this.render();
    });
    this.root.querySelector('#modal-backdrop')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'modal-backdrop') {
        this.showQuoteModal = false;
        this.render();
      }
    });
    this.root.querySelector('#btn-copy-text')?.addEventListener('click', async () => {
      await navigator.clipboard.writeText(buildOrderTextSummary(this.config));
      this.copyToast = 'Récapitulatif copié dans le presse-papiers !';
      this.render();
    });

    // Live sync customer inputs
    const bindInput = (selector: string, key: keyof typeof this.customerForm) => {
      const el = this.root.querySelector<HTMLInputElement>(selector);
      el?.addEventListener('input', () => {
        this.customerForm[key] = el.value;
      });
    };
    bindInput('#quote-name', 'name');
    bindInput('#quote-email', 'email');
    bindInput('#quote-phone', 'phone');
    bindInput('#quote-location', 'location');
    bindInput('#quote-message', 'message');
    const qtyEl = this.root.querySelector<HTMLSelectElement>('#quote-qty');
    qtyEl?.addEventListener('change', () => {
      this.customerForm.quantity = qtyEl.value;
    });

    // Submit quote request
    this.root.querySelector<HTMLFormElement>('#quote-contact-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const summary = buildOrderTextSummary(this.config);
      const win = window as unknown as {
        SF3D_QUOTE_URL?: string;
        SF3D_CSRF_TOKEN?: string;
        SF3D_ID_PRODUCT?: number;
      };
      const payload = {
        token: win.SF3D_CSRF_TOKEN || '',
        id_product: win.SF3D_ID_PRODUCT || 8,
        customer: { ...this.customerForm },
        config: this.config,
        summary,
        screenshot: this.quoteScreenshot,
      };

      this.quoteStatus = { type: 'sending', message: 'Envoi de votre demande de devis en cours…' };
      this.render();

      // 1. If embedded in an iframe, also notify parent window
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'CUBO2_SUBMIT_QUOTE', ...payload }, '*');
      }

      // 2. Direct POST to PrestaShop quote endpoint (native DOM or standalone)
      const quoteUrl = win.SF3D_QUOTE_URL || 'https://www.5426.fr/module/sf3dperso/quote';
      try {
        const res = await fetch(quoteUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data && data.ok) {
          this.quoteStatus = {
            type: 'success',
            message: 'Votre demande de devis a bien été envoyée à 5426 Studio ! Nous vous recontacterons très rapidement.',
          };
          this.render();
          return;
        }
      } catch {
        // Fallback to mailto:contact@5426.fr when standalone offline
      }

      if (window.parent === window) {
        const subject = encodeURIComponent(`Demande de devis CUBO 2 — ${this.customerForm.name}`);
        const body = encodeURIComponent(
          `COORDONNÉES CLIENT\n` +
            `Nom : ${this.customerForm.name}\n` +
            `E-mail : ${this.customerForm.email}\n` +
            `Téléphone : ${this.customerForm.phone}\n` +
            `Message : ${this.customerForm.message || '—'}\n\n` +
            summary
        );
        window.location.href = `mailto:contact@5426.fr?subject=${subject}&body=${body}`;
        this.quoteStatus = {
          type: 'success',
          message:
            'Votre messagerie s\'est ouverte avec votre configuration complète et vos coordonnées prêtes à être envoyées à contact@5426.fr.',
        };
        this.render();
      }
    });
  }
}
