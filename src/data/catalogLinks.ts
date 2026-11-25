export const INSTAGRAM_URL = 'https://www.instagram.com/5426_studio/';
export const PORTFOLIO_URL = 'https://liampiecourt.fr';

export interface CatalogProductLink {
  id: number;
  title: string;
  subtitle: string;
  price: string;
  url: string;
}

export const CATALOG_PRODUCTS: CatalogProductLink[] = [
  {
    id: 8,
    title: 'CUBO 2',
    subtitle: 'Enceinte 2 voies sur mesure • 15" + Pavillon 3D',
    price: '1 650,00 € / paire',
    url: 'https://www.5426.fr/8-cubo-2.html',
  },
  {
    id: 11,
    title: 'CUBO 4',
    subtitle: 'Enceinte studio compacte • 6,5" + Pavillon elliptique',
    price: 'À partir de 1 350,00 €',
    url: 'https://www.5426.fr/11-cubo-4.html',
  },
  {
    id: 1,
    title: '5426 Multicell Horn 3×4',
    subtitle: 'Pavillon 12 cellules • Fichiers 3D ou Imprimé 3D',
    price: '35,00 € — 222,00 €',
    url: 'https://www.5426.fr/1-5426-multicell-horn-3x4.html',
  },
  {
    id: 2,
    title: '5426 Multicell Horn 2×5',
    subtitle: 'Pavillon 10 cellules • Fichiers 3D ou Imprimé 3D',
    price: '30,00 € — 198,00 €',
    url: 'https://www.5426.fr/2-5426-multicell-horn-2x5-files.html',
  },
  {
    id: 3,
    title: 'Pavillon Acoustique Elliptique',
    subtitle: 'Profil elliptique • Fichiers 3D (.STL / .STEP)',
    price: '30,00 €',
    url: 'https://www.5426.fr/3-pavillon-acoustique-elliptique-5426-studio.html',
  },
  {
    id: 10,
    title: 'RELICA 3',
    subtitle: 'Carte filtre passif 3 voies (8 Ω / 150–200 W RMS)',
    price: '220,00 €',
    url: 'https://www.5426.fr/10-relica-3-carte-filtre-passif-3-voies-8-o.html',
  },
];

export function renderSimilarProductsModal(currentId: number, isOpen: boolean): string {
  const others = CATALOG_PRODUCTS.filter((p) => p.id !== currentId);
  return `
    <div class="modal-backdrop ${isOpen ? '' : 'is-hidden'}" id="similar-modal-backdrop" aria-hidden="${!isOpen}">
      <div class="modal-card modal-wide">
        <div class="modal-head">
          <h2>Autres produits 5426 Studio</h2>
          <button type="button" class="btn-icon" id="btn-close-similar">✕</button>
        </div>
        <div class="similar-grid">
          ${others
            .map(
              (p) => `
            <a class="similar-card" href="${p.url}">
              <div class="similar-card-title">${p.title}</div>
              <div class="similar-card-sub">${p.subtitle}</div>
              <div class="similar-card-foot">
                <span>${p.price}</span>
                <span>Découvrir →</span>
              </div>
            </a>
          `
            )
            .join('')}
        </div>
      </div>
    </div>
  `;
}
