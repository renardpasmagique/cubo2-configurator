import { CameraPreset } from '../scene/Cubo2Viewer';
import { renderSimilarProductsModal } from '../data/catalogLinks';
import { PolicyLink } from './FileProductUI';

const DEFAULT_POLICIES: PolicyLink[] = [
  { label: 'Security policy', url: 'https://www.5426.fr/content/6-security-policy' },
  { label: 'Delivery policy', url: 'https://www.5426.fr/content/1-livraison' },
  { label: 'Return policy', url: 'https://www.5426.fr/content/7-return-policy' },
  { label: 'Licence', url: 'https://www.5426.fr/content/9-licence' },
];

export interface Relica3UIHandlers {
  onCameraPreset: (preset: CameraPreset) => void;
  onSelectViewMode: (mode: '3d' | 'photos') => void;
  onSelectPhoto: (index: number) => void;
}

export class Relica3ProductUI {
  private root: HTMLElement;
  private photos: string[];
  private policies: PolicyLink[];
  private handlers: Relica3UIHandlers;
  private activeStep = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches ? 0 : 1;
  private viewMode: '3d' | 'photos' = '3d';
  private activePhotoIdx = 0;
  private qty = 1;
  private showSimilarModal = false;
  private cartStatus: { type: 'idle' | 'adding' | 'added' | 'error'; message: string } = {
    type: 'idle',
    message: '',
  };

  constructor(
    root: HTMLElement,
    photos: string[],
    policies: PolicyLink[],
    handlers: Relica3UIHandlers
  ) {
    this.root = root;
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

  private render(): void {
    const prevScrollEl = this.root.querySelector<HTMLElement>('.steps-scroll');
    const savedScrollTop = prevScrollEl ? prevScrollEl.scrollTop : 0;

    const steps = [
      {
        id: 1,
        title: 'Aperçu 3D & Galerie Photos',
        badge: this.viewMode === '3d' ? 'Modèle 3D' : `Photo ${this.activePhotoIdx + 1}/${Math.max(1, this.photos.length)}`,
      },
      { id: 2, title: 'Caractéristiques Techniques', badge: '3 Voies • 8 Ω' },
      { id: 3, title: 'Fabrication & Délais', badge: 'Atelier France' },
    ];

    this.root.innerHTML = `
      <div class="panel-header">
        <div class="brand-row">
          <h1 class="product-title" style="font-size:21px;line-height:1.2">
            RELICA 3
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
        <div class="price-row-main">
          <div>
            <div class="price-label">Carte assemblée &amp; testée (Vendue à l'unité)</div>
            <div class="price-base-note">Fabrication sur demande — délai 2 à 3 semaines</div>
          </div>
          <div class="price-value">220,00 € TTC</div>
        </div>

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

      ${renderSimilarProductsModal(10, this.showSimilarModal)}
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
              <label class="control-label">Photos de la carte RELICA 3</label>
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
                    <img src="${url}" alt="RELICA 3 — Photo ${idx + 1}" loading="lazy" />
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

      case 2:
        return `
          <dl class="horn-spec-list" style="margin-top:6px">
            <dt>Topologie</dt><dd>Filtre passif 3 voies Linkwitz-Riley 2e ordre (12 dB/octave)</dd>
            <dt>Fréquences de coupure</dt><dd>300 Hz (Grave / Médium) et 3 500 Hz (Médium / Aigu)</dd>
            <dt>Impédance &amp; Puissance</dt><dd>8 Ω — 150 à 200 W RMS</dd>
            <dt>Section Aigu</dt><dd>Réseau d'atténuation L-Pad intégré</dd>
            <dt>Conception PCB</dt><dd>Pistes de puissance élargies, cuivre 2 oz ENIG (or véritable), selfs orientées à 90° (zéro couplage magnétique)</dd>
            <dt>Dimensions</dt><dd>292 × 190 mm</dd>
          </dl>
        `;

      case 3:
        return `
          <ul class="uniform-list" style="margin-top:6px">
            <li>Assemblé en France dans les ateliers de <strong>5426 Studio</strong> (basés chez Atelier 21, Orléans).</li>
            <li>Fabrication sur demande uniquement — compter <strong>2 à 3 semaines</strong> entre la commande et la livraison.</li>
            <li>Vendu à l'unité (commander quantité 2 pour une paire d'enceintes stéréo).</li>
          </ul>
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
    const nativeForm = document.querySelector<HTMLFormElement>('#add-to-cart-or-refresh');
    const nativeQty = document.querySelector<HTMLInputElement>('#quantity_wanted');
    const nativeBtn = document.querySelector<HTMLButtonElement>(
      '#add-to-cart-or-refresh [data-button-action="add-to-cart"]'
    );

    if (nativeQty) {
      nativeQty.value = String(this.qty);
    }

    if (nativeBtn && !nativeBtn.disabled) {
      this.cartStatus = { type: 'adding', message: 'Ajout au panier en cours…' };
      this.render();
      nativeBtn.click();
      setTimeout(() => {
        this.cartStatus = {
          type: 'added',
          message: 'RELICA 3 ajoutée à votre panier !',
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
        formData.set('qty', String(this.qty));
        formData.set('add', '1');
        formData.set('action', 'update');
        const res = await fetch(nativeForm.action, {
          method: 'POST',
          body: formData,
          headers: { Accept: 'application/json, text/javascript, */*; q=0.01' },
        });
        if (res.ok) {
          this.cartStatus = {
            type: 'added',
            message: 'RELICA 3 ajoutée au panier !',
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
