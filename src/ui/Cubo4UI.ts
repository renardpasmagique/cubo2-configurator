import {
  Cubo4BodyType,
  Cubo4Config,
  METAL_FINISHES,
  MOUNT_OPTIONS,
  PAINT_COLORS,
  PETG_COLORS,
  PLAQUE_TEXT_COLORS,
} from '../config/cubo4Config';
import { renderSimilarProductsModal } from '../data/catalogLinks';

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
  private showSimilarModal = false;
  private photos: string[] = [];
  private quoteScreenshot = '';
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
            message: event.data.error || 'Une erreur est survenue lors de l\'envoi.',
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

  private buildSummaryLines(): { label: string; value: string }[] {
    const bodyLabel =
      this.config.bodyFinish.type === 'plywood'
        ? 'Contreplaqué'
        : this.config.bodyFinish.type === 'wood_veneer'
          ? 'Placage bois'
          : `Peinture ${this.config.bodyFinish.paintSheen === 'satine' ? 'Satinée' : 'Mat'} — ${
              PAINT_COLORS.find((p) => p.id === this.config.bodyFinish.paintId)?.name || ''
            }`;

    const frontPetg = PETG_COLORS.find((c) => c.id === this.config.frontPetgId)?.name || '';
    const metalName = METAL_FINISHES.find((m) => m.id === this.config.frontPlate.finish)?.name || '';
    const frontLabel =
      this.config.frontMode === 'metal_plate'
        ? `Plaque métal ${metalName} + Évent spécial (${frontPetg})`
        : `${
            this.config.frontFaceColor.sameAsBody
              ? 'Façade assortie au corps'
              : `Façade peinture ${
                  PAINT_COLORS.find((p) => p.id === this.config.frontFaceColor.paintId)?.name || ''
                }`
          }${this.config.showHpCover ? ` + Contour HP (${frontPetg})` : ''} + Évent (${frontPetg})`;

    const hornPetg = PETG_COLORS.find((c) => c.id === this.config.hornColorId)?.name || '';
    const mountLabel = MOUNT_OPTIONS.find((m) => m.id === this.config.mount)?.name || '';
    const platePetg = PETG_COLORS.find((c) => c.id === this.config.badge.plateColorId)?.name || '';
    const textCol = PLAQUE_TEXT_COLORS.find((t) => t.id === this.config.badge.textColorId)?.name || '';

    return [
      { label: 'Caisson', value: bodyLabel },
      { label: 'Façade & Évent', value: frontLabel },
      { label: 'Pavillon', value: `Elliptique (Oval) — ${hornPetg}` },
      { label: 'Piétement', value: mountLabel },
      {
        label: 'Plaque ID',
        value: `${platePetg} / Texte ${textCol}${this.config.badge.text ? ` — « ${this.config.badge.text} »` : ''}`,
      },
    ];
  }

  private buildPlainSummary(): string {
    return [
      'CONFIGURATION CUBO 4 — 5426 STUDIO',
      '-----------------------------------',
      ...this.buildSummaryLines().map((l) => `${l.label} : ${l.value}`),
    ].join('\n');
  }

  private renderStep1Body(): string {
    const typeOpts: { id: Cubo4BodyType; label: string; desc: string }[] = [
      { id: 'plywood', label: 'Contreplaqué', desc: 'Bois apparent verni' },
      { id: 'wood_veneer', label: 'Placage bois', desc: 'Veinage naturel marqué' },
      { id: 'paint', label: 'Peinture', desc: 'Teintes studio' },
    ];

    const isPaint = this.config.bodyFinish.type === 'paint';
    return `
      <div class="option-group">
        <div class="pill-grid">
          ${typeOpts
            .map(
              (o) => `
            <button type="button" class="pill-btn ${this.config.bodyFinish.type === o.id ? 'active' : ''}" data-body-type="${o.id}">
              <strong>${o.label}</strong>
              <span>${o.desc}</span>
            </button>`
            )
            .join('')}
        </div>
      </div>
      ${
        isPaint
          ? `
        <div class="option-group">
          <div class="sub-label">Aspect</div>
          <div class="pill-grid two-col">
            <button type="button" class="pill-btn ${this.config.bodyFinish.paintSheen === 'mat' ? 'active' : ''}" data-body-sheen="mat"><strong>Mat</strong></button>
            <button type="button" class="pill-btn ${this.config.bodyFinish.paintSheen === 'satine' ? 'active' : ''}" data-body-sheen="satine"><strong>Satiné</strong></button>
          </div>
        </div>
        <div class="option-group">
          <div class="sub-label">Couleur du caisson</div>
          <div class="swatch-grid">
            ${PAINT_COLORS.map(
              (p) => `
              <button type="button" class="swatch-item ${this.config.bodyFinish.paintId === p.id ? 'active' : ''}" data-body-paint="${p.id}" title="${this.esc(p.name)}">
                <span class="swatch-dot" style="background:${p.hex}"></span>
                <span class="swatch-name">${this.esc(p.name)}</span>
              </button>`
            ).join('')}
          </div>
        </div>`
          : ''
      }
    `;
  }

  private renderStep2Body(): string {
    const isMetal = this.config.frontMode === 'metal_plate';
    return `
      <div class="option-group">
        <div class="sub-label">Type de façade</div>
        <div class="pill-grid two-col">
          <button type="button" class="pill-btn ${!isMetal ? 'active' : ''}" data-front-mode="wood_hp">
            <strong>Façade bois + HP</strong>
            <span>Évent standard</span>
          </button>
          <button type="button" class="pill-btn ${isMetal ? 'active' : ''}" data-front-mode="metal_plate">
            <strong>Plaque métal</strong>
            <span>Évent plaque métal</span>
          </button>
        </div>
      </div>

      ${
        isMetal
          ? `
        <div class="option-group">
          <div class="sub-label">Finition plaque métal</div>
          <div class="pill-grid">
            ${METAL_FINISHES.map(
              (mf) => `
              <button type="button" class="pill-btn ${this.config.frontPlate.finish === mf.id ? 'active' : ''}" data-metal-finish="${mf.id}">
                <strong>${this.esc(mf.name)}</strong>
              </button>`
            ).join('')}
          </div>
        </div>`
          : `
        <div class="option-group">
          <div class="sub-label">Couleur de façade</div>
          <div class="pill-grid two-col">
            <button type="button" class="pill-btn ${this.config.frontFaceColor.sameAsBody ? 'active' : ''}" data-face-same="true">
              <strong>Assortie au corps</strong>
            </button>
            <button type="button" class="pill-btn ${!this.config.frontFaceColor.sameAsBody ? 'active' : ''}" data-face-same="false">
              <strong>Façade colorée</strong>
            </button>
          </div>
        </div>
        ${
          !this.config.frontFaceColor.sameAsBody
            ? `
          <div class="option-group">
            <div class="swatch-grid">
              ${PAINT_COLORS.map(
                (p) => `
                <button type="button" class="swatch-item ${this.config.frontFaceColor.paintId === p.id ? 'active' : ''}" data-face-paint="${p.id}" title="${this.esc(p.name)}">
                  <span class="swatch-dot" style="background:${p.hex}"></span>
                  <span class="swatch-name">${this.esc(p.name)}</span>
                </button>`
              ).join('')}
            </div>
          </div>`
            : ''
        }
        <div class="option-group">
          <div class="sub-label">Contour haut-parleur 3D</div>
          <div class="pill-grid two-col">
            <button type="button" class="pill-btn ${this.config.showHpCover ? 'active' : ''}" data-hp-cover="true"><strong>Avec contour HP</strong></button>
            <button type="button" class="pill-btn ${!this.config.showHpCover ? 'active' : ''}" data-hp-cover="false"><strong>Sans contour HP</strong></button>
          </div>
        </div>`
      }

      <div class="option-group">
        <div class="sub-label">Couleur PETG — ${isMetal ? 'Évent plaque métal' : 'Contour HP & Évent'}</div>
        <div class="swatch-grid">
          ${PETG_COLORS.map(
            (c) => `
            <button type="button" class="swatch-item ${this.config.frontPetgId === c.id ? 'active' : ''}" data-front-petg="${c.id}" title="${this.esc(c.name)}">
              <span class="swatch-dot ${c.translucent ? 'translucent' : ''}" style="background:${c.hex}"></span>
              <span class="swatch-name">${this.esc(c.name)}</span>
            </button>`
          ).join('')}
        </div>
      </div>
    `;
  }

  private renderStep3Body(): string {
    return `
      <div class="option-group">
        <div class="pill-btn active" style="cursor:default;text-align:left;">
          <strong>Pavillon Elliptique (Oval)</strong>
          <span>Seul pavillon compatible avec le format compact CUBO 4</span>
        </div>
      </div>
      <div class="option-group">
        <div class="sub-label">Couleur du pavillon (PETG)</div>
        <div class="swatch-grid">
          ${PETG_COLORS.map(
            (c) => `
            <button type="button" class="swatch-item ${this.config.hornColorId === c.id ? 'active' : ''}" data-horn-color="${c.id}" title="${this.esc(c.name)}">
              <span class="swatch-dot ${c.translucent ? 'translucent' : ''}" style="background:${c.hex}"></span>
              <span class="swatch-name">${this.esc(c.name)}</span>
            </button>`
          ).join('')}
        </div>
      </div>
    `;
  }

  private renderStep4Body(): string {
    return `
      <div class="option-group">
        <div class="pill-grid">
          ${MOUNT_OPTIONS.map(
            (m) => `
            <button type="button" class="pill-btn ${this.config.mount === m.id ? 'active' : ''}" data-mount="${m.id}">
              <strong>${this.esc(m.name)}</strong>
            </button>`
          ).join('')}
        </div>
      </div>
    `;
  }

  private renderStep5Body(): string {
    return `
      <div class="option-group">
        <div class="sub-label">Couleur de la plaque (PETG)</div>
        <div class="swatch-grid">
          ${PETG_COLORS.map(
            (c) => `
            <button type="button" class="swatch-item ${this.config.badge.plateColorId === c.id ? 'active' : ''}" data-plate-color="${c.id}" title="${this.esc(c.name)}">
              <span class="swatch-dot ${c.translucent ? 'translucent' : ''}" style="background:${c.hex}"></span>
              <span class="swatch-name">${this.esc(c.name)}</span>
            </button>`
          ).join('')}
        </div>
      </div>
      <div class="option-group">
        <div class="sub-label">Couleur du texte</div>
        <div class="swatch-grid">
          ${PLAQUE_TEXT_COLORS.map(
            (t) => `
            <button type="button" class="swatch-item ${this.config.badge.textColorId === t.id ? 'active' : ''}" data-text-color="${t.id}" title="${this.esc(t.name)}">
              <span class="swatch-dot" style="background:${t.hex}"></span>
              <span class="swatch-name">${this.esc(t.name)}</span>
            </button>`
          ).join('')}
        </div>
      </div>
      <div class="option-group">
        <div class="sub-label">Texte personnalisé</div>
        <input
          type="text"
          id="cubo4-badge-input"
          class="text-input"
          maxlength="24"
          placeholder="Ex : STUDIO 01"
          value="${this.esc(this.config.badge.text)}"
        />
      </div>
    `;
  }

  private renderGalleryModal(): string {
    if (!this.showGalleryModal) return '';
    return `
      <div class="quote-modal-backdrop" id="cubo4-gallery-backdrop">
        <div class="quote-modal" style="max-width:780px;">
          <div class="quote-modal-header">
            <h3>Photos CUBO 4</h3>
            <button type="button" class="icon-btn" id="cubo4-gallery-close">✕</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;padding:12px 0;">
            ${this.photos
              .map(
                (src, idx) => `
              <button type="button" class="gallery-thumb-btn" data-lightbox-idx="${idx}" style="border:1px solid var(--sf-border,#d8d4cc);background:transparent;padding:0;cursor:pointer;aspect-ratio:1/1;overflow:hidden;">
                <img src="${this.esc(src)}" alt="CUBO 4 photo ${idx + 1}" style="width:100%;height:100%;object-fit:cover;display:block;" />
              </button>`
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  private renderLightbox(): string {
    if (this.lightboxIdx === null || !this.photos[this.lightboxIdx]) return '';
    const src = this.photos[this.lightboxIdx];
    return `
      <div class="quote-modal-backdrop" id="cubo4-lightbox-backdrop" style="z-index:12000;background:rgba(0,0,0,0.92);">
        <div style="position:relative;max-width:92vw;max-height:90vh;display:flex;align-items:center;justify-content:center;">
          <button type="button" class="icon-btn" id="cubo4-lightbox-close" style="position:fixed;top:18px;right:18px;z-index:12010;background:#fff;color:#111;">✕</button>
          <img src="${this.esc(src)}" alt="CUBO 4" style="max-width:90vw;max-height:86vh;object-fit:contain;" />
        </div>
      </div>
    `;
  }

  private renderDescriptionModal(): string {
    if (!this.showDescriptionModal) return '';
    return `
      <div class="quote-modal-backdrop" id="cubo4-desc-backdrop">
        <div class="quote-modal" style="max-width:620px;">
          <div class="quote-modal-header">
            <h3>Descriptif technique — CUBO 4</h3>
            <button type="button" class="icon-btn" id="cubo4-desc-close">✕</button>
          </div>
          <div style="font-size:13.5px;line-height:1.55;">
            <p><strong>CUBO 4</strong> est l'enceinte studio compacte 2 voies de 5426 Studio, associant un haut-parleur grave-médium 6,5&quot; en charge bass-reflex accordée et le <strong>pavillon acoustique elliptique</strong> imprimé en 3D PETG.</p>
            <ul style="padding-left:18px;margin:10px 0;">
              <li><strong>Caisson</strong> : Contreplaqué brut verni, placage bois naturel ou peinture studio (Mat / Satiné).</li>
              <li><strong>Façade</strong> : Façade bois (assortie ou colorée) avec contour HP 3D, ou plaque métal affleurante (Aluminium brut, brossé, Acier gris anthracite) avec évent dédié.</li>
              <li><strong>Pavillon</strong> : Pavillon elliptique (Oval) équipé d'un moteur à compression 1&quot;.</li>
              <li><strong>Bornier</strong> : Plaque supérieure 60 × 100 mm personnalisable avec 4 fiches bananes dorées.</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  private renderQuoteModal(): string {
    if (!this.showQuoteModal) return '';
    const summaryRows = this.buildSummaryLines();
    return `
      <div class="quote-modal-backdrop" id="cubo4-quote-backdrop">
        <div class="quote-modal">
          <div class="quote-modal-header">
            <h3>Demande de devis — CUBO 4</h3>
            <button type="button" class="icon-btn" id="cubo4-quote-close">✕</button>
          </div>
          <div class="quote-modal-body">
            ${
              this.quoteScreenshot
                ? `<div class="quote-preview-box"><img src="${this.quoteScreenshot}" alt="Aperçu CUBO 4" /></div>`
                : ''
            }
            <div class="quote-summary-box">
              ${summaryRows
                .map(
                  (r) => `<div class="quote-summary-row"><span>${this.esc(r.label)}</span><strong>${this.esc(r.value)}</strong></div>`
                )
                .join('')}
            </div>
            <form id="cubo4-quote-form" class="quote-form">
              <div class="quote-form-grid">
                <label>Nom / Studio *<input type="text" required name="name" value="${this.esc(this.customerForm.name)}" /></label>
                <label>Email *<input type="email" required name="email" value="${this.esc(this.customerForm.email)}" /></label>
                <label>Téléphone<input type="text" name="phone" value="${this.esc(this.customerForm.phone)}" /></label>
                <label>Quantité<input type="text" name="quantity" value="${this.esc(this.customerForm.quantity)}" /></label>
              </div>
              <label>Ville / Pays<input type="text" name="location" value="${this.esc(this.customerForm.location)}" /></label>
              <label>Précisions<textarea name="message" rows="3">${this.esc(this.customerForm.message)}</textarea></label>
              ${
                this.quoteStatus.type !== 'idle'
                  ? `<div class="quote-status ${this.quoteStatus.type}">${this.esc(this.quoteStatus.message)}</div>`
                  : ''
              }
              <div class="quote-modal-actions">
                <button type="submit" class="btn-primary" ${this.quoteStatus.type === 'sending' ? 'disabled' : ''}>
                  ${this.quoteStatus.type === 'sending' ? 'Envoi...' : 'Envoyer la demande de devis →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  public render(): void {
    const steps = [
      { id: 1, title: 'Caisson & Finition', body: this.renderStep1Body() },
      { id: 2, title: 'Façade, HP & Évent', body: this.renderStep2Body() },
      { id: 3, title: 'Pavillon Elliptique', body: this.renderStep3Body() },
      { id: 4, title: 'Piétement & Mobilité', body: this.renderStep4Body() },
      { id: 5, title: 'Plaque Personnalisée', body: this.renderStep5Body() },
    ];

    this.root.innerHTML = `
      <div class="config-panel">
        <div class="panel-header">
          <div class="panel-title-row">
            <div>
              <h2>CUBO 4</h2>
              <p class="panel-subtitle">Enceinte studio compacte — Pavillon elliptique</p>
            </div>
            <button type="button" class="btn-secondary btn-sm" id="cubo4-reset-btn" title="Réinitialiser">↺</button>
          </div>
          <div class="panel-quick-actions">
            ${this.photos.length > 0 ? `<button type="button" class="btn-secondary btn-sm" id="cubo4-photos-btn">Photos (${this.photos.length})</button>` : ''}
            <button type="button" class="btn-secondary btn-sm" id="cubo4-desc-btn">Descriptif</button>
            <button type="button" class="btn-secondary btn-sm" id="cubo4-random-btn">Aléatoire</button>
            <button type="button" class="btn-secondary btn-sm" id="cubo4-similar-btn">Autres produits</button>
          </div>
        </div>

        <div class="steps-container">
          ${steps
            .map(
              (s) => `
            <div class="step-card ${this.activeStep === s.id ? 'open' : ''}">
              <button type="button" class="step-header" data-step="${s.id}">
                <span class="step-num">${s.id}</span>
                <span class="step-title">${s.title}</span>
                <span class="step-chevron">${this.activeStep === s.id ? '−' : '+'}</span>
              </button>
              ${this.activeStep === s.id ? `<div class="step-body">${s.body}</div>` : ''}
            </div>`
            )
            .join('')}
        </div>

        <div class="panel-footer">
          <div class="price-row">
            <div>
              <span class="price-label">Tarif sur devis</span>
              <div class="price-value" style="font-size:15px;">Configuration 3D prête</div>
            </div>
          </div>
          <div class="footer-actions">
            <button type="button" class="btn-secondary" id="cubo4-png-btn">Aperçu PNG</button>
            <button type="button" class="btn-primary" id="cubo4-quote-btn">Demander un devis →</button>
          </div>
        </div>
      </div>
      ${this.renderGalleryModal()}
      ${this.renderLightbox()}
      ${this.renderDescriptionModal()}
      ${this.renderQuoteModal()}
      ${renderSimilarProductsModal(11, this.showSimilarModal)}
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = Number(btn.dataset.step);
        this.activeStep = this.activeStep === s ? 0 : s;
        this.render();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-body-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.bodyFinish.type = btn.dataset.bodyType as Cubo4BodyType;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-body-sheen]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.bodyFinish.paintSheen = btn.dataset.bodySheen as 'mat' | 'satine';
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-body-paint]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.bodyFinish.paintId = btn.dataset.bodyPaint!;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-front-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.frontMode = btn.dataset.frontMode as 'wood_hp' | 'metal_plate';
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-metal-finish]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.frontPlate.finish = btn.dataset.metalFinish as 'raw_alu' | 'brushed_alu' | 'anthracite_steel';
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-face-same]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.frontFaceColor.sameAsBody = btn.dataset.faceSame === 'true';
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-face-paint]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.frontFaceColor.paintId = btn.dataset.facePaint!;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-hp-cover]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.showHpCover = btn.dataset.hpCover === 'true';
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-front-petg]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.frontPetgId = btn.dataset.frontPetg!;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-horn-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.hornColorId = btn.dataset.hornColor!;
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-mount]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.mount = btn.dataset.mount as Cubo4Config['mount'];
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-plate-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.badge.plateColorId = btn.dataset.plateColor!;
        const petg = PETG_COLORS.find((c) => c.id === this.config.badge.plateColorId);
        if (petg) {
          this.config.badge.textColorId = this.isLightHex(petg.hex) ? 'txt-black' : 'txt-white';
        }
        this.emitChange();
      });
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-text-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.config.badge.textColorId = btn.dataset.textColor!;
        this.emitChange();
      });
    });

    const badgeInput = document.getElementById('cubo4-badge-input') as HTMLInputElement | null;
    if (badgeInput) {
      badgeInput.addEventListener('input', () => {
        this.config.badge.text = badgeInput.value.slice(0, 24);
        this.handlers.onConfigChange(this.config);
      });
    }

    document.getElementById('cubo4-reset-btn')?.addEventListener('click', () => this.handlers.onReset());
    document.getElementById('cubo4-random-btn')?.addEventListener('click', () => this.handlers.onRandomize());
    document.getElementById('cubo4-desc-btn')?.addEventListener('click', () => {
      this.showDescriptionModal = true;
      this.render();
    });
    document.getElementById('cubo4-desc-close')?.addEventListener('click', () => {
      this.showDescriptionModal = false;
      this.render();
    });
    document.getElementById('cubo4-desc-backdrop')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'cubo4-desc-backdrop') {
        this.showDescriptionModal = false;
        this.render();
      }
    });

    document.getElementById('cubo4-photos-btn')?.addEventListener('click', () => {
      this.showGalleryModal = true;
      this.render();
    });
    document.getElementById('cubo4-gallery-close')?.addEventListener('click', () => {
      this.showGalleryModal = false;
      this.render();
    });
    document.getElementById('cubo4-gallery-backdrop')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'cubo4-gallery-backdrop') {
        this.showGalleryModal = false;
        this.render();
      }
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-lightbox-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.lightboxIdx = Number(btn.dataset.lightboxIdx);
        this.render();
      });
    });
    document.getElementById('cubo4-lightbox-close')?.addEventListener('click', () => {
      this.lightboxIdx = null;
      this.render();
    });
    document.getElementById('cubo4-lightbox-backdrop')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'cubo4-lightbox-backdrop') {
        this.lightboxIdx = null;
        this.render();
      }
    });

    document.getElementById('cubo4-similar-btn')?.addEventListener('click', () => {
      this.showSimilarModal = true;
      this.render();
    });
    document.getElementById('btn-close-similar')?.addEventListener('click', () => {
      this.showSimilarModal = false;
      this.render();
    });
    document.getElementById('similar-modal-backdrop')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'similar-modal-backdrop') {
        this.showSimilarModal = false;
        this.render();
      }
    });

    document.getElementById('cubo4-png-btn')?.addEventListener('click', () => {
      const dataUrl = this.handlers.onScreenshot();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = '5426-cubo4-config.png';
      a.click();
    });

    document.getElementById('cubo4-quote-btn')?.addEventListener('click', () => {
      this.quoteScreenshot = this.handlers.onScreenshot();
      this.quoteStatus = { type: 'idle', message: '' };
      this.showQuoteModal = true;
      this.render();
    });
    document.getElementById('cubo4-quote-close')?.addEventListener('click', () => {
      this.showQuoteModal = false;
      this.render();
    });
    document.getElementById('cubo4-quote-backdrop')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'cubo4-quote-backdrop') {
        this.showQuoteModal = false;
        this.render();
      }
    });

    const quoteForm = document.getElementById('cubo4-quote-form') as HTMLFormElement | null;
    if (quoteForm) {
      quoteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(quoteForm);
        this.customerForm = {
          name: String(fd.get('name') || ''),
          email: String(fd.get('email') || ''),
          phone: String(fd.get('phone') || ''),
          quantity: String(fd.get('quantity') || ''),
          location: String(fd.get('location') || ''),
          message: String(fd.get('message') || ''),
        };
        this.quoteStatus = { type: 'sending', message: 'Envoi en cours...' };
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
