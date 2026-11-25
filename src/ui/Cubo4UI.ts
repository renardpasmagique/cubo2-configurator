import {
  Cubo4BodyType,
  Cubo4Config,
  METAL_FINISHES,
  MOUNT_OPTIONS,
  PAINT_COLORS,
  PETG_COLORS,
  PLAQUE_TEXT_COLORS,
} from '../config/cubo4Config';

export interface Cubo4UIHandlers {
  onConfigChange: (config: Cubo4Config) => void;
  onScreenshot: () => string;
  onReset: () => void;
  onRandomize: () => void;
}

export class Cubo4UI {
  private root: HTMLElement;
  private config: Cubo4Config;
  private handlers: Cubo4UIHandlers;
  private activeStep = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches ? 0 : 1;
  private showQuoteModal = false;
  private showDescriptionModal = false;
  private showGalleryModal = false;
  private lightboxIdx: number | null = null;
  private photos: string[] = [];
  private quoteScreenshot = '';
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

  constructor(root: HTMLElement, initialConfig: Cubo4Config, handlers: Cubo4UIHandlers, photos: string[] = []) {
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
            message: event.data.error || "Une erreur est survenue lors de l'envoi.",
          };
        }
        this.render();
      }
    });
    this.render();
  }

  public setConfig(config: Cubo4Config): void {
    this.config = config;
    this.render();
  }

  private emitChange(): void {
    this.handlers.onConfigChange(this.config);
    this.render();
  }

  private esc(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private isLightHex(hex: string): boolean {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return false;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 186;
  }

  private renderPetgPalette(selectedId: string, attrName: string): string {
    const classic = PETG_COLORS.filter((c) => !c.translucent);
    const translucent = PETG_COLORS.filter((c) => c.translucent);
    const renderBtn = (c: (typeof PETG_COLORS)[number]) => {
      const isActive = selectedId === c.id;
      return `
        <button
          type="button"
          class="swatch ${c.translucent ? 'is-translucent' : ''} ${isActive ? 'active' : ''}"
          style="background:${c.hex}"
          title="${this.esc(c.name)}"
          ${attrName}="${c.id}"
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

  private buildSummaryLines(): [string, string][] {
    const bodyLabel =
      this.config.bodyFinish.type === 'plywood'
        ? 'Contreplaqué'
        : this.config.bodyFinish.type === 'wood_veneer'
          ? 'Placage bois'
          : `Peinture ${this.config.bodyFinish.paintSheen === 'satine' ? 'Satiné' : 'Mat'} (${
              PAINT_COLORS.find((p) => p.id === this.config.bodyFinish.paintId)?.name || ''
            })`;

    const frontPetg = PETG_COLORS.find((c) => c.id === this.config.frontPetgId)?.name || '';
    const metalName = METAL_FINISHES.find((m) => m.id === this.config.frontPlate.finish)?.name || '';
    const screwLabel = this.config.screwColor === 'silver' ? 'Argent' : 'Noir';
    const frontLabel =
      this.config.frontMode === 'metal_plate'
        ? `Plaque métal ${metalName} · Évent (${frontPetg}) · Vis ${screwLabel}`
        : `${
            this.config.frontFaceColor.sameAsBody
              ? 'Façade assortie au corps'
              : `Façade ${PAINT_COLORS.find((p) => p.id === this.config.frontFaceColor.paintId)?.name || ''}`
          }${this.config.showHpCover ? ` · Contour HP (${frontPetg})` : ''} · Évent (${frontPetg}) · Vis ${screwLabel}`;

    const hornPetg = PETG_COLORS.find((c) => c.id === this.config.hornColorId)?.name || '';
    const mountLabel = MOUNT_OPTIONS.find((m) => m.id === this.config.mount)?.name || '';
    const leftHoldName = PETG_COLORS.find((c) => c.id === this.config.climbingHolds.leftColorId)?.name || '';
    const rightHoldName = PETG_COLORS.find((c) => c.id === this.config.climbingHolds.rightColorId)?.name || '';
    const holdsLabel = this.config.climbingHolds.enabled
      ? `Oui (Gauche: ${leftHoldName} / Droite: ${rightHoldName} — prises déclassées selon stock)`
      : 'Aucune';
    const platePetg = PETG_COLORS.find((c) => c.id === this.config.badge.plateColorId)?.name || '';
    const textCol = PLAQUE_TEXT_COLORS.find((t) => t.id === this.config.badge.textColorId)?.name || '';

    return [
      ['1. Caisson', bodyLabel],
      ['2. Façade & Évent', frontLabel],
      ['3. Pavillon', `Elliptique (Oval) · ${hornPetg}`],
      ['4. Piètement', mountLabel + (this.config.mount === 'feet' ? ' (Noir)' : '')],
      ['5. Poignées', holdsLabel],
      [
        '6. Plaque',
        `${platePetg}${this.config.badge.text.trim() ? ` · « ${this.config.badge.text.trim()} » (${textCol})` : ` · Texte ${textCol}`}`,
      ],
    ];
  }

  private buildPlainSummary(): string {
    return [
      'CONFIGURATION CUBO 4 — 5426 STUDIO',
      '-----------------------------------',
      ...this.buildSummaryLines().map(([k, v]) => `${k} : ${v}`),
    ].join('\n');
  }

  private renderStepContent(stepId: number): string {
    switch (stepId) {
      case 1: {
        const currentPaint = PAINT_COLORS.find((p) => p.id === this.config.bodyFinish.paintId) || PAINT_COLORS[0];
        return `
          <div class="control-group">
            <label class="control-label">Matériau &amp; Finition du caisson</label>
            <div class="option-list">
              <button type="button" class="option-row ${this.config.bodyFinish.type === 'wood_veneer' ? 'active' : ''}" data-body-type="wood_veneer">
                <div class="opt-col">
                  <span class="opt-name">Placage bois</span>
                  <span class="opt-sub">Veinage naturel marqué</span>
                </div>
              </button>
              <button type="button" class="option-row ${this.config.bodyFinish.type === 'plywood' ? 'active' : ''}" data-body-type="plywood">
                <div class="opt-col">
                  <span class="opt-name">Contreplaqué</span>
                  <span class="opt-sub">Bois brut verni</span>
                </div>
              </button>
              <button type="button" class="option-row ${this.config.bodyFinish.type === 'paint' ? 'active' : ''}" data-body-type="paint">
                <div class="opt-col">
                  <span class="opt-name">Peinture</span>
                  <span class="opt-sub">Teintes du catalogue</span>
                </div>
              </button>
            </div>
          </div>

          ${
            this.config.bodyFinish.type === 'paint'
              ? `
            <div class="control-group">
              <label class="control-label">Aspect</label>
              <div class="segmented-2">
                <button type="button" class="seg-btn ${this.config.bodyFinish.paintSheen === 'mat' ? 'active' : ''}" data-body-sheen="mat">Mat</button>
                <button type="button" class="seg-btn ${this.config.bodyFinish.paintSheen === 'satine' ? 'active' : ''}" data-body-sheen="satine">Satiné</button>
              </div>
            </div>
            <div class="control-group">
              <label class="control-label">Teinte — <strong>${this.esc(currentPaint.name)}</strong></label>
              <div class="swatch-grid">
                ${PAINT_COLORS.map(
                  (c) => `
                  <button
                    type="button"
                    class="swatch ${this.config.bodyFinish.paintId === c.id ? 'active' : ''}"
                    style="background:${c.hex}"
                    title="${this.esc(c.name)}"
                    data-body-paint="${c.id}"
                  ></button>
                `
                ).join('')}
              </div>
            </div>
          `
              : ''
          }
        `;
      }

      case 2: {
        const isMetal = this.config.frontMode === 'metal_plate';
        const facePaint = PAINT_COLORS.find((p) => p.id === this.config.frontFaceColor.paintId) || PAINT_COLORS[0];
        const frontPetg = PETG_COLORS.find((c) => c.id === this.config.frontPetgId) || PETG_COLORS[0];
        return `
          <div class="control-group">
            <label class="control-label">Habillage façade</label>
            <div class="option-list">
              <button type="button" class="option-row ${!isMetal ? 'active' : ''}" data-front-mode="wood_hp">
                <div class="opt-col">
                  <span class="opt-name">Façade bois + HP</span>
                  <span class="opt-sub">Contour HP &amp; évent standard</span>
                </div>
              </button>
              <button type="button" class="option-row ${isMetal ? 'active' : ''}" data-front-mode="metal_plate">
                <div class="opt-col">
                  <span class="opt-name">Plaque métal affleurante</span>
                  <span class="opt-sub">Évent spécial plaque métal</span>
                </div>
              </button>
            </div>
          </div>

          ${
            isMetal
              ? `
            <div class="control-group">
              <label class="control-label">Finition métal</label>
              <div class="option-list">
                ${METAL_FINISHES.map(
                  (mf) => `
                  <button type="button" class="option-row ${this.config.frontPlate.finish === mf.id ? 'active' : ''}" data-metal-finish="${mf.id}">
                    <div class="opt-col">
                      <span class="opt-name">${this.esc(mf.name)}</span>
                    </div>
                  </button>
                `
                ).join('')}
              </div>
            </div>
          `
              : `
            <div class="control-group">
              <label class="control-label">Couleur de la façade bois</label>
              <div class="segmented-2">
                <button type="button" class="seg-btn ${this.config.frontFaceColor.sameAsBody ? 'active' : ''}" data-face-same="true">Assortie au corps</button>
                <button type="button" class="seg-btn ${!this.config.frontFaceColor.sameAsBody ? 'active' : ''}" data-face-same="false">Façade colorée</button>
              </div>
            </div>
            ${
              !this.config.frontFaceColor.sameAsBody
                ? `
              <div class="control-group">
                <label class="control-label">Teinte façade — <strong>${this.esc(facePaint.name)}</strong></label>
                <div class="swatch-grid">
                  ${PAINT_COLORS.map(
                    (c) => `
                    <button
                      type="button"
                      class="swatch ${this.config.frontFaceColor.paintId === c.id ? 'active' : ''}"
                      style="background:${c.hex}"
                      title="${this.esc(c.name)}"
                      data-face-paint="${c.id}"
                    ></button>
                  `
                  ).join('')}
                </div>
              </div>
            `
                : ''
            }
            <div class="control-group">
              <label class="control-label">Contour haut-parleur 3D</label>
              <div class="segmented-2">
                <button type="button" class="seg-btn ${this.config.showHpCover ? 'active' : ''}" data-hp-cover="true">Avec contour HP</button>
                <button type="button" class="seg-btn ${!this.config.showHpCover ? 'active' : ''}" data-hp-cover="false">Sans contour HP</button>
              </div>
            </div>
          `
          }

          <div class="control-group">
            <label class="control-label">
              Couleur PETG (${isMetal ? 'évent plaque métal' : 'contour HP &amp; évent'}) — <strong>${this.esc(frontPetg.name)}</strong>
            </label>
            ${this.renderPetgPalette(this.config.frontPetgId, 'data-front-petg')}
          </div>

          <div class="control-group">
            <label class="control-label">Couleur des vis (façade, contour HP &amp; plaque métal)</label>
            <div class="segmented-2">
              <button type="button" class="seg-btn ${this.config.screwColor === 'silver' ? 'active' : ''}" data-screw-color="silver">Argent</button>
              <button type="button" class="seg-btn ${this.config.screwColor === 'black' ? 'active' : ''}" data-screw-color="black">Noir</button>
            </div>
          </div>
        `;
      }

      case 3: {
        const hornPetg = PETG_COLORS.find((c) => c.id === this.config.hornColorId) || PETG_COLORS[0];
        return `
          <div class="control-group">
            <label class="control-label">Modèle de pavillon</label>
            <div class="option-list">
              <div class="option-row active" style="cursor:default;">
                <div class="opt-col">
                  <span class="opt-name">Pavillon Acoustique Elliptique (Oval)</span>
                  <span class="opt-sub">Seul pavillon compatible avec CUBO 4</span>
                </div>
              </div>
            </div>
          </div>

          <div class="control-group">
            <label class="control-label">Couleur du pavillon (PETG) — <strong>${this.esc(hornPetg.name)}</strong></label>
            ${this.renderPetgPalette(this.config.hornColorId, 'data-horn-color')}
          </div>
        `;
      }

      case 4: {
        const leftHold = PETG_COLORS.find((c) => c.id === this.config.climbingHolds.leftColorId) || PETG_COLORS[0];
        const rightHold = PETG_COLORS.find((c) => c.id === this.config.climbingHolds.rightColorId) || PETG_COLORS[0];
        return `
          <div class="control-group">
            <label class="control-label">Piètement &amp; mobilité</label>
            <div class="option-list">
              ${MOUNT_OPTIONS.map(
                (m) => `
                <button type="button" class="option-row ${this.config.mount === m.id ? 'active' : ''}" data-mount="${m.id}">
                  <div class="opt-col">
                    <span class="opt-name">${this.esc(m.name)}${m.id === 'feet' ? ' (Noir)' : ''}</span>
                    <span class="opt-sub">${m.id === 'feet' ? 'Pieds TPU noirs uniquement' : this.esc(m.description)}</span>
                  </div>
                </button>
              `
              ).join('')}
            </div>
          </div>

          <div class="control-group">
            <label class="control-label">Poignées latérales (prises d'escalade)</label>
            <div class="segmented-2">
              <button type="button" class="seg-btn ${!this.config.climbingHolds.enabled ? 'active' : ''}" data-holds-enabled="false">Aucune</button>
              <button type="button" class="seg-btn ${this.config.climbingHolds.enabled ? 'active' : ''}" data-holds-enabled="true">Prises droite &amp; gauche</button>
            </div>
            <p class="hint-text" style="margin-top:6px;">
              5426 Studio travaille avec des prises d'escalade déclassées de seconde main : les formes et coloris exacts dépendent des stocks disponibles.
            </p>
          </div>

          ${
            this.config.climbingHolds.enabled
              ? `
            <div class="control-group">
              <label class="control-label">Couleur 1 (Prise gauche) — <strong>${this.esc(leftHold.name)}</strong></label>
              <div class="swatch-grid">
                ${PETG_COLORS.filter((c) => !c.translucent)
                  .map(
                    (c) => `
                  <button type="button" class="swatch ${this.config.climbingHolds.leftColorId === c.id ? 'active' : ''}" style="background:${c.hex}" title="${this.esc(c.name)}" data-hold-left="${c.id}"></button>
                `
                  )
                  .join('')}
              </div>
            </div>
            <div class="control-group">
              <label class="control-label">Couleur 2 (Prise droite) — <strong>${this.esc(rightHold.name)}</strong></label>
              <div class="swatch-grid">
                ${PETG_COLORS.filter((c) => !c.translucent)
                  .map(
                    (c) => `
                  <button type="button" class="swatch ${this.config.climbingHolds.rightColorId === c.id ? 'active' : ''}" style="background:${c.hex}" title="${this.esc(c.name)}" data-hold-right="${c.id}"></button>
                `
                  )
                  .join('')}
              </div>
            </div>
          `
              : ''
          }
        `;
      }

      case 5: {
        const platePetg = PETG_COLORS.find((c) => c.id === this.config.badge.plateColorId) || PETG_COLORS[0];
        const textCol = PLAQUE_TEXT_COLORS.find((t) => t.id === this.config.badge.textColorId) || PLAQUE_TEXT_COLORS[0];
        return `
          <div class="control-group">
            <label class="control-label">Couleur de la plaque (PETG) — <strong>${this.esc(platePetg.name)}</strong></label>
            ${this.renderPetgPalette(this.config.badge.plateColorId, 'data-plate-color')}
          </div>

          <div class="control-group">
            <label class="control-label">Couleur du texte — <strong>${this.esc(textCol.name)}</strong></label>
            <div class="swatch-grid">
              ${PLAQUE_TEXT_COLORS.map(
                (t) => `
                <button
                  type="button"
                  class="swatch ${this.config.badge.textColorId === t.id ? 'active' : ''}"
                  style="background:${t.hex}"
                  title="${this.esc(t.name)}"
                  data-text-color="${t.id}"
                ></button>
              `
              ).join('')}
            </div>
          </div>

          <div class="control-group">
            <label class="control-label" for="cubo4-badge-input">Texte personnalisé</label>
            <input
              id="cubo4-badge-input"
              class="text-input"
              type="text"
              maxlength="24"
              placeholder="Ex : STUDIO 01"
              value="${this.esc(this.config.badge.text)}"
            />
          </div>
        `;
      }

      default:
        return '';
    }
  }

  private renderDescriptionModal(isOpen: boolean): string {
    return `
      <div class="modal-backdrop ${isOpen ? '' : 'is-hidden'}" id="desc-modal-backdrop" aria-hidden="${!isOpen}">
        <div class="modal-card modal-wide desc-modal-card">
          <div class="modal-head">
            <h2>CUBO 4 — Descriptif &amp; Spécifications (5426 Studio)</h2>
            <button type="button" class="btn-icon" id="btn-close-desc-modal">✕</button>
          </div>
          <div class="desc-content">
            <p class="desc-lead">
              <strong>CUBO 4</strong> est une enceinte 2 voies compacte de <strong>200 W RMS sous 8 Ω</strong>. Elle associe un
              haut-parleur grave-médium de 6,5&quot; en charge bass-reflex et le <strong>pavillon elliptique</strong> imprimé en
              3D PETG avec moteur à compression 1&quot;.
            </p>
            <h3>Filtre passif : carte CROSS 2</h3>
            <p>
              La CUBO 4 intègre la carte crossover passif 2 voies <strong>CROSS 2</strong> (identique à la CUBO 2) :
              filtrage Linkwitz-Riley 2e ordre (12 dB/octave) à 2,4 kHz, condensateurs polypropylène MKP, pistes cuivre
              2 oz et finition ENIG.
              <a href="https://www.5426.fr/" target="_blank" rel="noopener noreferrer">Voir les détails sur 5426.fr →</a>
            </p>
            <h3>Options &amp; Finitions</h3>
            <ul>
              <li><strong>Caisson</strong> : placage bois, contreplaqué verni ou peinture (Mat / Satiné).</li>
              <li><strong>Façade</strong> : façade bois (assortie ou colorée) avec contour HP 3D, ou plaque métal affleurante (Aluminium Brut, Aluminium Brossé, Acier Gris Anthracite) avec évent dédié.</li>
              <li><strong>Pieds &amp; Poignées</strong> : pieds TPU noirs ou roulettes ; poignées latérales en prises d'escalade (5426 Studio travaille avec des prises déclassées de seconde main, selon les stocks disponibles).</li>
              <li><strong>Plaque bornier</strong> : plaque 60 × 100 mm personnalisable sur le dessus.</li>
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
    return `
      <div class="modal-backdrop ${isOpen ? '' : 'is-hidden'}" id="gallery-modal-backdrop" aria-hidden="${!isOpen}">
        <div class="modal-card modal-wide">
          <div class="modal-head">
            <h2>Galerie Photos — Enceinte CUBO 4 (5426 Studio)</h2>
            <button type="button" class="btn-icon" id="btn-close-gallery-modal">✕</button>
          </div>
          ${
            this.photos.length > 0
              ? `
            <div class="cubo-gallery-grid">
              ${this.photos
                .map(
                  (url, i) => `
                <button type="button" class="cubo-gallery-item cubo-gallery-btn" data-gallery-zoom="${i}" title="Agrandir la photo ${i + 1}">
                  <img src="${this.esc(url)}" alt="CUBO 4 photo ${i + 1}" loading="lazy" />
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
          <img class="lightbox-img" src="${this.esc(this.photos[this.lightboxIdx])}" alt="CUBO 4 — photo ${this.lightboxIdx + 1}" />
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

  private renderQuoteModal(): string {
    const rows = this.buildSummaryLines();
    return `
      <div class="modal-backdrop" id="modal-backdrop">
        <div class="modal-card modal-wide modal-quote">
          <div class="modal-head">
            <div>
              <h2>Demande de devis — CUBO 4</h2>
              <p class="quote-subtitle">Tarification sur devis · Livraison recalculée selon destination ou retrait à l'Atelier 21 (Orléans)</p>
            </div>
            <button type="button" class="btn-icon" id="btn-close-modal" title="Fermer">✕</button>
          </div>

          <form id="quote-contact-form" class="quote-contact-form">
            <div class="quote-layout-2col">
              <div class="quote-summary-col">
                ${
                  this.quoteScreenshot
                    ? `
                  <div class="quote-visual-box">
                    <img src="${this.quoteScreenshot}" alt="Aperçu 3D CUBO 4 configurée" class="quote-preview-img" />
                    <a class="quote-dl-link" href="${this.quoteScreenshot}" download="cubo4-configuration.png">
                      Télécharger l'aperçu (.png) ↓
                    </a>
                  </div>
                `
                    : ''
                }
                <div class="quote-section-title">Récapitulatif des 5 étapes</div>
                <dl class="quote-spec-list">
                  ${rows
                    .map(([k, v]) => `<div class="quote-spec-row"><dt>${k}</dt><dd>${this.esc(v)}</dd></div>`)
                    .join('')}
                </dl>
              </div>

              <div class="quote-fields-col">
                <div class="quote-section-title">Vos coordonnées</div>
                <div class="quote-fields-stack">
                  <div class="form-field">
                    <label for="quote-name">Nom &amp; Prénom *</label>
                    <input id="quote-name" class="text-input" type="text" required placeholder="Votre nom complet" value="${this.esc(this.customerForm.name)}" />
                  </div>
                  <div class="form-field">
                    <label for="quote-email">Adresse e-mail *</label>
                    <input id="quote-email" class="text-input" type="email" required placeholder="exemple@domaine.fr" value="${this.esc(this.customerForm.email)}" />
                  </div>
                  <div class="form-field">
                    <label for="quote-phone">Numéro de téléphone *</label>
                    <input id="quote-phone" class="text-input" type="tel" required placeholder="06 00 00 00 00" value="${this.esc(this.customerForm.phone)}" />
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
                      <input id="quote-location" class="text-input" type="text" placeholder="Ex : 45000, France" value="${this.esc(this.customerForm.location)}" />
                    </div>
                  </div>
                  <div class="form-field">
                    <label for="quote-msg">Précisions</label>
                    <textarea id="quote-msg" class="text-input" rows="3" placeholder="Remarques ou délais...">${this.esc(this.customerForm.message)}</textarea>
                  </div>
                </div>
              </div>
            </div>

            ${this.quoteStatus.type !== 'idle' ? `<div class="quote-status ${this.quoteStatus.type}">${this.esc(this.quoteStatus.message)}</div>` : ''}
            ${this.copyToast ? `<div class="copy-toast">${this.esc(this.copyToast)}</div>` : ''}

            <div class="modal-actions">
              <button type="button" class="btn-secondary" id="btn-copy-text">Copier la fiche</button>
              <button type="submit" class="btn-primary" id="btn-submit-quote" ${this.quoteStatus.type === 'sending' ? 'disabled' : ''}>
                ${this.quoteStatus.type === 'sending' ? 'Envoi en cours…' : 'Envoyer la demande de devis →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  public render(): void {
    const prevScrollEl = this.root.querySelector<HTMLElement>('.steps-scroll');
    const savedScrollTop = prevScrollEl ? prevScrollEl.scrollTop : 0;

    const steps = [
      { id: 1, title: 'Caisson & Finition' },
      { id: 2, title: 'Façade, HP & Évent' },
      { id: 3, title: 'Pavillon Elliptique' },
      { id: 4, title: 'Piètements & Poignées' },
      { id: 5, title: "Plaque d'identification" },
    ];

    this.root.innerHTML = `
      <div class="panel-header">
        <div class="brand-row">
          <h1 class="product-title">CUBO 4</h1>
          <div class="header-btns">
            ${this.photos.length > 0 ? '<button type="button" class="btn-icon" id="btn-gallery" title="Galerie photos">Photos</button>' : ''}
            <button type="button" class="btn-icon" id="btn-desc" title="Descriptif &amp; Spécifications">Descriptif</button>
          </div>
        </div>
      </div>

      <div class="steps-scroll">
        ${steps
          .map(
            (s) => `
          <section class="step-card ${this.activeStep === s.id ? 'is-open' : ''}">
            <button type="button" class="step-header" data-step="${s.id}">
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
        <div class="price-summary">
          <div class="price-row-main">
            <div>
              <div class="price-label">Tarification sur devis</div>
              <div class="price-base-note">Livraison non incluse (selon lieu) · Retrait possible Atelier 21 (Orléans)</div>
            </div>
            <div class="price-value" style="font-size:16px;">Sur devis</div>
          </div>
        </div>
        <div class="footer-actions">
          <button type="button" class="btn-secondary" id="btn-screenshot" title="Capturer un rendu PNG">Aperçu PNG</button>
          <button type="button" class="btn-primary" id="btn-quote">Demander un devis →</button>
        </div>
      </div>

      ${this.showQuoteModal ? this.renderQuoteModal() : ''}
      ${this.renderDescriptionModal(this.showDescriptionModal)}
      ${this.renderGalleryModal(this.showGalleryModal)}
    `;

    const nextScrollEl = this.root.querySelector<HTMLElement>('.steps-scroll');
    if (nextScrollEl && savedScrollTop > 0) {
      nextScrollEl.scrollTop = savedScrollTop;
    }

    this.bindEvents();
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLElement>('[data-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.step);
        this.activeStep = this.activeStep === id ? 0 : id;
        this.render();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-body-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.bodyFinish.type = btn.dataset.bodyType as Cubo4BodyType;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-body-sheen]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.bodyFinish.paintSheen = btn.dataset.bodySheen as 'mat' | 'satine';
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-body-paint]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.bodyFinish.paintId = btn.dataset.bodyPaint!;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-front-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.frontMode = btn.dataset.frontMode as 'wood_hp' | 'metal_plate';
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-metal-finish]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.frontPlate.finish = btn.dataset.metalFinish as 'raw_alu' | 'brushed_alu' | 'anthracite_steel';
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-face-same]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.frontFaceColor.sameAsBody = btn.dataset.faceSame === 'true';
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-face-paint]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.frontFaceColor.paintId = btn.dataset.facePaint!;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-hp-cover]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.showHpCover = btn.dataset.hpCover === 'true';
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-front-petg]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.frontPetgId = btn.dataset.frontPetg!;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-screw-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.screwColor = btn.dataset.screwColor as 'silver' | 'black';
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-horn-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.hornColorId = btn.dataset.hornColor!;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-mount]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.mount = btn.dataset.mount as Cubo4Config['mount'];
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-holds-enabled]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.climbingHolds.enabled = btn.dataset.holdsEnabled === 'true';
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-hold-left]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.climbingHolds.leftColorId = btn.dataset.holdLeft!;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-hold-right]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.climbingHolds.rightColorId = btn.dataset.holdRight!;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-plate-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.badge.plateColorId = btn.dataset.plateColor!;
        const petg = PETG_COLORS.find((c) => c.id === this.config.badge.plateColorId);
        if (petg) {
          this.config.badge.textColorId = this.isLightHex(petg.hex) ? 'txt-black' : 'txt-white';
        }
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLElement>('[data-text-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.badge.textColorId = btn.dataset.textColor!;
        this.emitChange();
      });
    });

    const badgeInput = this.root.querySelector<HTMLInputElement>('#cubo4-badge-input');
    if (badgeInput) {
      badgeInput.addEventListener('input', () => {
        this.config.badge.text = badgeInput.value.slice(0, 24);
        this.handlers.onConfigChange(this.config);
      });
    }

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

    this.root.querySelector('#btn-screenshot')?.addEventListener('click', () => {
      const dataUrl = this.handlers.onScreenshot();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = '5426-cubo4-config.png';
      a.click();
    });

    this.root.querySelector('#btn-quote')?.addEventListener('click', () => {
      this.quoteScreenshot = this.handlers.onScreenshot();
      this.quoteStatus = { type: 'idle', message: '' };
      this.showQuoteModal = true;
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

    this.root.querySelector('#btn-copy-text')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(this.buildPlainSummary()).then(() => {
        this.copyToast = 'Fiche copiée dans le presse-papier.';
        this.render();
        setTimeout(() => {
          this.copyToast = '';
          this.render();
        }, 2500);
      });
    });

    const quoteForm = this.root.querySelector<HTMLFormElement>('#quote-contact-form');
    if (quoteForm) {
      quoteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.customerForm = {
          name: (this.root.querySelector<HTMLInputElement>('#quote-name')?.value || '').trim(),
          email: (this.root.querySelector<HTMLInputElement>('#quote-email')?.value || '').trim(),
          phone: (this.root.querySelector<HTMLInputElement>('#quote-phone')?.value || '').trim(),
          quantity: this.root.querySelector<HTMLSelectElement>('#quote-qty')?.value || '1 paire (2 enceintes)',
          location: (this.root.querySelector<HTMLInputElement>('#quote-location')?.value || '').trim(),
          message: (this.root.querySelector<HTMLTextAreaElement>('#quote-msg')?.value || '').trim(),
        };
        this.quoteStatus = { type: 'sending', message: 'Envoi en cours…' };
        this.render();

        const payload = {
          type: 'CUBO2_QUOTE_SUBMIT',
          product: 'CUBO 4',
          config: this.config,
          summary: this.buildPlainSummary(),
          totalPrice: 0,
          screenshot: this.quoteScreenshot,
          customer: this.customerForm,
        };
        window.postMessage(payload, '*');
        if (window.parent !== window) {
          window.parent.postMessage(payload, '*');
        }
      });
    }
  }
}
