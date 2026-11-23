import filamentsCatalog from '../data/filaments_anycubic_petg.json';

export type EdgeType = 'raw' | 'rounded';
export type BodyFinishType = 'plywood' | 'solid';
export type SurfaceFinish = 'matte' | 'satin';
export type FrontFaceMode = 'match_body' | 'custom';
export type FrontPlateMode = 'none' | 'wood' | 'metal';
export type ScrewColor = 'silver' | 'black';
export type MetalFinishId = 'raw_alu' | 'brushed_alu' | 'anthracite_steel';
export type HornType = '2x5' | '3x4' | 'oval';
export type MountType = 'none' | 'feet' | 'castors';

export const PETG_SHADER_PRESETS = filamentsCatalog.shaderPresets;

export interface Cubo2Config {
  basePrice: number;
  edges: EdgeType;
  bodyFinish: {
    type: BodyFinishType;
    surface: SurfaceFinish;
    color: string | null;
    colorName: string;
    priceDelta: number;
  };
  frontFaceColor: {
    mode: FrontFaceMode;
    color: string | null;
    colorName: string;
    priceDelta: number;
  };
  frontPlate: {
    mode: FrontPlateMode;
    metalFinish: MetalFinishId;
    priceDelta: number;
  };
  screwColor: ScrewColor;
  hornModel: {
    type: HornType;
    skuFilament: string;
    color: string;
    colorName: string;
    gamme: string;
    translucent: boolean;
    priceDelta: number;
  };
  mount: {
    type: MountType;
    priceDelta: number;
  };
  badge: {
    enabled: boolean;
    text: string;
    plateSkuFilament: string;
    plateColor: string;
    plateColorName: string;
    plateTranslucent: boolean;
    textColor: string;
    textColorName: string;
    priceDelta: number;
  };
}

export interface ColorOption {
  id: string;
  sku_filament?: string;
  nom_commercial?: string;
  gamme?: string;
  name: string;
  hex: string;
  translucent?: boolean;
  group?: string;
}

export interface MetalFinishOption {
  id: MetalFinishId;
  name: string;
  hex: string;
  metalness: number;
  roughness: number;
  priceDelta: number;
}

export interface HornOption {
  id: HornType;
  name: string;
  subtitle: string;
  architecture: string;
  dispersion: string;
  throat: string;
  dimensions: string;
  usage: string;
  url: string;
  priceDelta: number;
}

export interface MountOption {
  id: MountType;
  name: string;
  description: string;
  heightOffsetM: number;
  priceDelta: number;
}

export const SHOW_PRICING = false;

export const BASE_PRICE = 1500;

export const EDGE_PRICES: Record<EdgeType, number> = {
  raw: 0,
  rounded: 65,
};

export const WOOD_PLATE_PRICE = 75;

export const PAINT_COLORS: ColorOption[] = [
  // Blancs, Beiges & Nudes
  { id: 'blanc_craie', name: 'Blanc Craie', hex: '#f2efe9' },
  { id: 'paper_1', name: 'Paper 1', hex: '#eae4d8' },
  { id: 'lin', name: 'Lin', hex: '#dcd2c0' },
  { id: 'sable', name: 'Sable Doux', hex: '#cbbba0' },
  { id: 'cachemire', name: 'Cachemire', hex: '#b8a99a' },
  // Gris & Noirs
  { id: 'galet', name: 'Galet', hex: '#b8b9b6' },
  { id: 'loft', name: 'Gris Loft', hex: '#888a8c' },
  { id: 'taupe', name: 'Taupe', hex: '#7a7067' },
  { id: 'ardoise', name: 'Ardoise', hex: '#4f5459' },
  { id: 'anthracite', name: 'Anthracite', hex: '#34373b' },
  { id: 'noir_intense', name: 'Noir Intense', hex: '#1a1b1e' },
  // Verts
  { id: 'celadon', name: 'Céladon', hex: '#a4b5ab' },
  { id: 'sauge', name: 'Vert Sauge', hex: '#7d8e7a' },
  { id: 'olive', name: 'Vert Olive', hex: '#596348' },
  { id: 'canopee', name: 'Canopée', hex: '#385243' },
  { id: 'sapin', name: 'Vert Sapin', hex: '#1f362b' },
  // Bleus
  { id: 'glacier', name: 'Bleu Glacier', hex: '#9fb4bf' },
  { id: 'orage', name: 'Bleu Orage', hex: '#4e6778' },
  { id: 'petrole', name: 'Bleu Pétrole', hex: '#1e4654' },
  { id: 'paon', name: 'Bleu Paon', hex: '#1a5a63' },
  { id: 'nuit', name: 'Bleu Nuit', hex: '#1b263b' },
  // Terracottas, Ocres & Épices
  { id: 'miel', name: 'Miel', hex: '#d4a348' },
  { id: 'curry', name: 'Curry', hex: '#b88228' },
  { id: 'cannelle', name: 'Cannelle', hex: '#a86544' },
  { id: 'terracotta', name: 'Terracotta', hex: '#a14b36' },
  { id: 'argile', name: 'Argile', hex: '#8c4435' },
  { id: 'rouille', name: 'Rouille', hex: '#753425' },
  // Roses, Rouges & Prunes
  { id: 'vieux_rose', name: 'Vieux Rose', hex: '#c2928c' },
  { id: 'brique', name: 'Rouge Brique', hex: '#8f302b' },
  { id: 'carmin', name: 'Carmin', hex: '#731e24' },
  { id: 'aubergine', name: 'Aubergine', hex: '#472836' },
  { id: 'terre_ombre', name: 'Terre d\'Ombre', hex: '#4a382e' },
];

export const METAL_FINISHES: MetalFinishOption[] = [
  {
    id: 'raw_alu',
    name: 'Aluminium Brut',
    hex: '#d8dce0',
    metalness: 0.92,
    roughness: 0.22,
    priceDelta: 110,
  },
  {
    id: 'brushed_alu',
    name: 'Aluminium Brossé',
    hex: '#c9cdd1',
    metalness: 0.88,
    roughness: 0.34,
    priceDelta: 120,
  },
  {
    id: 'anthracite_steel',
    name: 'Acier Gris Anthracite',
    hex: '#3a3d42',
    metalness: 0.78,
    roughness: 0.42,
    priceDelta: 135,
  },
];

export const HORN_MODELS: HornOption[] = [
  {
    id: '2x5',
    name: '5426 Multicell Horn 2×5',
    subtitle: 'Matrice 2×5 cellules • Dispersion large',
    architecture: 'Pavillon multicellulaire (matrice 2×5 — 10 cellules)',
    dispersion: '100° H × 45° V',
    throat: 'Gorge 1" (filetage 1 3/8"-18 TPI ou bride 2/3 points)',
    dimensions: '347 × 271 × 157 mm',
    usage: 'Écoute large horizontale, studio & sonorisation (PA) sur mesure',
    url: 'https://www.5426.fr/7-5426-multicell-horn-2x5.html',
    priceDelta: 0,
  },
  {
    id: '3x4',
    name: '5426 Multicell Horn 3×4',
    subtitle: 'Matrice 3×4 cellules • Dispersion verticale étendue',
    architecture: 'Pavillon multicellulaire (matrice 3×4 — 12 cellules)',
    dispersion: '85° H × 65° V',
    throat: 'Gorge 1" (filetage 1 3/8"-18 TPI ou bride 2/3 points)',
    dimensions: '349 × 344 × 292 mm',
    usage: 'Couverture verticale étendue, écoute debout / grande salle',
    url: 'https://www.5426.fr/5-5426-multicell-horn-3x4.html',
    priceDelta: 45,
  },
  {
    id: 'oval',
    name: 'Pavillon Acoustique Elliptique 5426 Studio',
    subtitle: 'Profil elliptique à transition fluide',
    architecture: 'Pavillon elliptique à expansion continue (non multicellulaire)',
    dispersion: '90° H × 55° V',
    throat: 'Moteurs à compression à bobine 1" à 1,75"',
    dimensions: '254 × 228 × 186 mm',
    usage: 'Encombrement compact, directivité douce et homogène',
    url: 'https://www.5426.fr/3-pavillon-acoustique-elliptique-5426-studio.html',
    priceDelta: 30,
  },
];

export const PETG_COLORS: ColorOption[] = filamentsCatalog.filaments.map((f) => ({
  id: f.id,
  sku_filament: f.sku_filament,
  nom_commercial: f.nom_commercial,
  gamme: f.gamme,
  name: f.nom_commercial,
  hex: f.code_hex,
  translucent: f.translucent,
}));

export const PLAQUE_TEXT_COLORS: ColorOption[] = [
  { id: 'black', name: 'Noir', hex: '#151515' },
  { id: 'white', name: 'Blanc', hex: '#f5f5f3' },
  { id: 'gold', name: 'Or / Laiton', hex: '#c9a65b' },
  { id: 'silver', name: 'Argent', hex: '#c2c6cc' },
  { id: 'red', name: 'Rouge', hex: '#b83227' },
  { id: 'orange', name: 'Orange', hex: '#d96b27' },
  { id: 'petrol', name: 'Bleu Pétrole', hex: '#1e3f4f' },
  { id: 'cobalt', name: 'Bleu Cobalt', hex: '#234c8a' },
  { id: 'green', name: 'Vert', hex: '#2a7846' },
  { id: 'ochre', name: 'Ocre Jaune', hex: '#d49b27' },
];

export const MOUNT_OPTIONS: MountOption[] = [
  {
    id: 'none',
    name: 'Aucun (Base standard)',
    description: 'Pose directe au sol ou sur support studio',
    heightOffsetM: 0,
    priceDelta: 0,
  },
  {
    id: 'feet',
    name: 'Pieds sur mesure',
    description: '4 pieds usinés isolants (hauteur +42 mm)',
    heightOffsetM: 0.042,
    priceDelta: 85,
  },
  {
    id: 'castors',
    name: 'Jeu de roulettes',
    description: '4 roulettes pivotantes charge lourde (+78 mm)',
    heightOffsetM: 0.078,
    priceDelta: 95,
  },
];

export function createDefaultConfig(): Cubo2Config {
  return {
    basePrice: BASE_PRICE,
    edges: 'raw',
    bodyFinish: {
      type: 'plywood',
      surface: 'satin',
      color: null,
      colorName: 'Contreplaqué',
      priceDelta: 0,
    },
    frontFaceColor: {
      mode: 'match_body',
      color: null,
      colorName: 'Identique au caisson',
      priceDelta: 0,
    },
    frontPlate: {
      mode: 'none',
      metalFinish: 'brushed_alu',
      priceDelta: 0,
    },
    screwColor: 'silver',
    hornModel: {
      type: '2x5',
      skuFilament: 'ANY-PETG-TRL-CLR',
      color: '#eef2f5',
      colorName: 'Anycubic PETG Translucent - Transparent',
      gamme: 'Anycubic PETG Translucent',
      translucent: true,
      priceDelta: 0,
    },
    mount: {
      type: 'none',
      priceDelta: 0,
    },
    badge: {
      enabled: true,
      text: '',
      plateSkuFilament: 'ANY-PETG-TRL-CLR',
      plateColor: '#eef2f5',
      plateColorName: 'Anycubic PETG Translucent - Transparent',
      plateTranslucent: true,
      textColor: '#151515',
      textColorName: 'Noir',
      priceDelta: 0,
    },
  };
}

export function createRandomConfig(): Cubo2Config {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const edges: EdgeType = pick(['raw', 'rounded']);
  const isPlywood = Math.random() < 0.45;
  const paint = pick(PAINT_COLORS);
  const surface: SurfaceFinish = pick(['matte', 'satin']);
  const customFace = Math.random() < 0.28;
  const facePaint = pick(PAINT_COLORS);
  const plateMode: FrontPlateMode = pick(['none', 'wood', 'metal']);
  const mf = pick(METAL_FINISHES);
  const hornOpt = pick(HORN_MODELS);
  const hornPetg = pick(PETG_COLORS);
  const mountOpt = pick(MOUNT_OPTIONS);
  const badgePetg = pick(PETG_COLORS);
  const badgeText = pick(PLAQUE_TEXT_COLORS);

  return {
    basePrice: BASE_PRICE,
    edges,
    bodyFinish: {
      type: isPlywood ? 'plywood' : 'solid',
      surface,
      color: isPlywood ? null : paint.hex,
      colorName: isPlywood ? 'Contreplaqué Bouleau' : paint.name,
      priceDelta: isPlywood ? 0 : 90,
    },
    frontFaceColor: {
      mode: customFace ? 'custom' : 'match_body',
      color: customFace ? facePaint.hex : null,
      colorName: customFace ? facePaint.name : 'Identique au corps',
      priceDelta: customFace ? 55 : 0,
    },
    frontPlate: {
      mode: plateMode,
      metalFinish: mf.id,
      priceDelta: plateMode === 'wood' ? WOOD_PLATE_PRICE : plateMode === 'metal' ? mf.priceDelta : 0,
    },
    screwColor: pick(['silver', 'black']),
    hornModel: {
      type: hornOpt.id,
      skuFilament: hornPetg.sku_filament || '',
      color: hornPetg.hex,
      colorName: hornPetg.nom_commercial || hornPetg.name,
      gamme: hornPetg.gamme || '',
      translucent: Boolean(hornPetg.translucent),
      priceDelta: hornOpt.priceDelta,
    },
    mount: {
      type: mountOpt.id,
      priceDelta: mountOpt.priceDelta,
    },
    badge: {
      enabled: true,
      text: '',
      plateSkuFilament: badgePetg.sku_filament || '',
      plateColor: badgePetg.hex,
      plateColorName: badgePetg.nom_commercial || badgePetg.name,
      plateTranslucent: Boolean(badgePetg.translucent),
      textColor: badgeText.hex,
      textColorName: badgeText.name,
      priceDelta: 0,
    },
  };
}

export function calculateTotalPrice(config: Cubo2Config): number {
  const edgeDelta = EDGE_PRICES[config.edges];
  return (
    config.basePrice +
    edgeDelta +
    config.bodyFinish.priceDelta +
    config.frontFaceColor.priceDelta +
    config.frontPlate.priceDelta +
    config.hornModel.priceDelta +
    config.mount.priceDelta +
    config.badge.priceDelta
  );
}

export function getPriceBreakdown(config: Cubo2Config): Array<{ label: string; amount: number }> {
  const items: Array<{ label: string; amount: number }> = [
    { label: 'Enceinte CUBO 2 (Base)', amount: config.basePrice },
  ];
  if (EDGE_PRICES[config.edges] > 0) {
    items.push({ label: 'Usinage arêtes arrondies', amount: EDGE_PRICES[config.edges] });
  }
  if (config.bodyFinish.priceDelta > 0) {
    items.push({ label: `Peinture (${config.bodyFinish.colorName})`, amount: config.bodyFinish.priceDelta });
  }
  if (config.frontFaceColor.mode === 'custom' && config.frontFaceColor.priceDelta > 0) {
    items.push({ label: `Couleur façade (${config.frontFaceColor.colorName})`, amount: config.frontFaceColor.priceDelta });
  }
  if (config.frontPlate.mode === 'wood') {
    items.push({ label: 'Façade bois affleurante', amount: config.frontPlate.priceDelta });
  } else if (config.frontPlate.mode === 'metal') {
    const mf = METAL_FINISHES.find((m) => m.id === config.frontPlate.metalFinish);
    items.push({
      label: `Plaque métal affleurante (${mf?.name ?? config.frontPlate.metalFinish})`,
      amount: config.frontPlate.priceDelta,
    });
  }
  if (config.hornModel.priceDelta > 0) {
    const h = HORN_MODELS.find((m) => m.id === config.hornModel.type);
    items.push({ label: h?.name ?? `Pavillon ${config.hornModel.type}`, amount: config.hornModel.priceDelta });
  }
  if (config.mount.priceDelta > 0) {
    const m = MOUNT_OPTIONS.find((o) => o.id === config.mount.type);
    items.push({ label: m?.name ?? 'Piétement', amount: config.mount.priceDelta });
  }
  if (config.badge.priceDelta > 0) {
    items.push({ label: `Plaque d'identification personnalisée`, amount: config.badge.priceDelta });
  }
  return items;
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function buildOrderTextSummary(config: Cubo2Config): string {
  const total = calculateTotalPrice(config);
  const mf = METAL_FINISHES.find((m) => m.id === config.frontPlate.metalFinish);
  const hornOpt = HORN_MODELS.find((h) => h.id === config.hornModel.type);
  const mountOpt = MOUNT_OPTIONS.find((m) => m.id === config.mount.type);

  const edgeDesc =
    config.edges === 'raw'
      ? 'Arêtes brutes (angles vifs / chanfrein minimal)'
      : 'Arêtes arrondies (quart-de-rond usiné sur le pourtour)';

  const bodyDesc =
    config.bodyFinish.type === 'plywood'
      ? 'Contreplaqué 18 mm verni satiné (veinage naturel apparent)'
      : `Peinture ${config.bodyFinish.colorName} — finition ${config.bodyFinish.surface === 'matte' ? 'Mate' : 'Satinée'}`;

  let plateDesc = 'Sans plaque (façade enfoncée, woofer 15" avec vis apparentes)';
  if (config.frontPlate.mode === 'wood') {
    plateDesc = 'Façade bois supplémentaire affleurante (20 mm, à ras des bords, vis masquées)';
  } else if (config.frontPlate.mode === 'metal') {
    plateDesc = `Plaque métal affleurante — ${mf?.name ?? config.frontPlate.metalFinish} (vis masquées)`;
  }

  const faceColorDesc =
    config.frontFaceColor.mode === 'match_body'
      ? 'Identique au caisson'
      : `${config.frontFaceColor.colorName}`;

  const customText = config.badge.text.trim();
  const plaqueTextDesc = customText ? `« ${customText} »` : '« CUSTOM TEXT » (standard / non personnalisé)';

  const lines = [
    '=== DEMANDE DE DEVIS — ENCEINTE CUBO 2 (5426 STUDIO) ===',
    '',
    '1. STRUCTURE DU CAISSON',
    `   • Arêtes : ${edgeDesc}`,
    `   • Finition corps : ${bodyDesc}`,
    '',
    '2. FAÇADE & HAUT-PARLEUR',
    `   • Habillage : ${plateDesc}`,
    `   • Couleur façade${config.frontPlate.mode === 'wood' ? ' & plaque bois' : ''} : ${faceColorDesc}`,
    `   • Haut-parleur 15" : Noir (origine)`,
    `   • Visserie woofer : ${config.screwColor === 'silver' ? 'Argentée' : 'Noire'}`,
    '',
    '3. PAVILLON / DIFFUSEUR',
    `   • Modèle : ${hornOpt?.name ?? config.hornModel.type} (${hornOpt?.dispersion ?? ''})`,
    `   • Filament : ${config.hornModel.colorName} [${config.hornModel.skuFilament} / ${config.hornModel.color}]`,
    '',
    '4. PIÉTEMENTS & MOBILITÉ',
    `   • Configuration basse : ${mountOpt?.name ?? config.mount.type} — ${mountOpt?.description ?? ''}`,
    '',
    '5. PLAQUE D\'IDENTIFICATION & BORNIER',
    `   • Filament plaque : ${config.badge.plateColorName} [${config.badge.plateSkuFilament} / ${config.badge.plateColor}]`,
    `   • Couleur texte : ${config.badge.textColorName}`,
    `   • Texte supplémentaire sous « cubo 2 » : ${plaqueTextDesc}`,
    ...(SHOW_PRICING
      ? ['', '-------------------------------------------', `TARIF ESTIMÉ : ${formatEuro(total)} TTC`]
      : []),
  ];
  return lines.join('\n');
}
