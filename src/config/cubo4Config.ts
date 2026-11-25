import {
  ColorOption,
  formatEuro,
  METAL_FINISHES,
  MetalFinishId,
  MOUNT_OPTIONS,
  PAINT_COLORS,
  PETG_COLORS,
  PLAQUE_TEXT_COLORS,
  MountType,
  ScrewColor,
} from './pricing';

export const CUBO4_BASE_PRICE = 1350;
export const CUBO4_WOOD_VENEER_PRICE = 100;
export const CUBO4_FACE_COLOR_PRICE = 30;
export const CUBO4_HOLDS_PRICE = 50;
export const CUBO4_METAL_PRICES: Record<MetalFinishId, number> = {
  raw_alu: 150,
  brushed_alu: 150,
  anthracite_steel: 100,
};
export const CUBO4_MOUNT_PRICES: Record<MountType, number> = {
  none: 0,
  feet: 30,
  castors: 30,
};

export type Cubo4BodyType = 'plywood' | 'wood_veneer' | 'paint';
export type Cubo4FrontMode = 'wood_hp' | 'metal_plate';

export interface Cubo4Config {
  bodyFinish: {
    type: Cubo4BodyType;
    paintId: string;
    paintSheen: 'mat' | 'satine';
  };
  frontMode: Cubo4FrontMode;
  frontFaceColor: {
    sameAsBody: boolean;
    paintId: string;
    paintSheen: 'mat' | 'satine';
  };
  frontPlate: {
    finish: MetalFinishId;
  };
  showHpCover: boolean;
  frontPetgId: string;
  screwColor: ScrewColor;
  hornColorId: string;
  mount: MountType;
  climbingHolds: {
    enabled: boolean;
    leftColorId: string;
    rightColorId: string;
  };
  badge: {
    plateColorId: string;
    textColorId: string;
    text: string;
  };
}

export function createDefaultCubo4Config(): Cubo4Config {
  const defaultHorn = PETG_COLORS.find((c) => /translucent|transparent/i.test(c.name)) || PETG_COLORS[0];
  const defaultFrontPetg = PETG_COLORS.find((c) => /bleu|blue/i.test(c.name)) || PETG_COLORS[0];
  const defaultLeftHold = PETG_COLORS.find((c) => /rose|pink|rouge/i.test(c.name)) || PETG_COLORS[1];
  const defaultRightHold = PETG_COLORS.find((c) => /bleu|blue/i.test(c.name)) || PETG_COLORS[2];
  return {
    bodyFinish: {
      type: 'wood_veneer',
      paintId: PAINT_COLORS[0].id,
      paintSheen: 'mat',
    },
    frontMode: 'wood_hp',
    frontFaceColor: {
      sameAsBody: true,
      paintId: PAINT_COLORS[0].id,
      paintSheen: 'mat',
    },
    frontPlate: {
      finish: 'brushed_alu',
    },
    showHpCover: true,
    frontPetgId: defaultFrontPetg.id,
    screwColor: 'black',
    hornColorId: defaultHorn.id,
    mount: 'feet',
    climbingHolds: {
      enabled: true,
      leftColorId: defaultLeftHold.id,
      rightColorId: defaultRightHold.id,
    },
    badge: {
      plateColorId: defaultHorn.id,
      textColorId: PLAQUE_TEXT_COLORS[0].id,
      text: '',
    },
  };
}

export function createRandomCubo4Config(currentText = ''): Cubo4Config {
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const bodyTypes: Cubo4BodyType[] = ['plywood', 'wood_veneer', 'paint'];
  const bodyType = pick(bodyTypes);
  const bodyPaint = pick(PAINT_COLORS);
  const bodySheen = pick(['mat', 'satine'] as const);
  const frontMode: Cubo4FrontMode = Math.random() < 0.35 ? 'metal_plate' : 'wood_hp';
  const metalFinishes = ['raw_alu', 'brushed_alu', 'anthracite_steel'] as const;
  const mounts = MOUNT_OPTIONS.map((m) => m.id);
  const plateColor = pick(PETG_COLORS);
  const isPlateDark = parseInt(plateColor.hex.slice(1, 3), 16) * 0.299 +
    parseInt(plateColor.hex.slice(3, 5), 16) * 0.587 +
    parseInt(plateColor.hex.slice(5, 7), 16) * 0.114 < 128;

  return {
    bodyFinish: {
      type: bodyType,
      paintId: bodyPaint.id,
      paintSheen: bodySheen,
    },
    frontMode,
    frontFaceColor: {
      sameAsBody: Math.random() < 0.55,
      paintId: pick(PAINT_COLORS).id,
      paintSheen: pick(['mat', 'satine'] as const),
    },
    frontPlate: {
      finish: pick(metalFinishes),
    },
    showHpCover: frontMode === 'wood_hp' ? Math.random() < 0.78 : false,
    frontPetgId: pick(PETG_COLORS).id,
    screwColor: pick(['silver', 'black'] as const),
    hornColorId: pick(PETG_COLORS).id,
    mount: pick(mounts),
    climbingHolds: {
      enabled: Math.random() < 0.45,
      leftColorId: pick(PETG_COLORS).id,
      rightColorId: pick(PETG_COLORS).id,
    },
    badge: {
      plateColorId: plateColor.id,
      textColorId: isPlateDark ? 'txt-white' : 'txt-black',
      text: currentText,
    },
  };
}

export function getCubo4PriceBreakdown(config: Cubo4Config): Array<{ label: string; amount: number }> {
  const items: Array<{ label: string; amount: number }> = [
    { label: 'Enceinte CUBO 4 (Base)', amount: CUBO4_BASE_PRICE },
  ];
  if (config.bodyFinish.type === 'wood_veneer') {
    items.push({ label: 'Placage bois', amount: CUBO4_WOOD_VENEER_PRICE });
  }
  if (config.frontMode === 'metal_plate') {
    const mf = METAL_FINISHES.find((m) => m.id === config.frontPlate.finish);
    items.push({
      label: `Plaque métal (${mf?.name ?? config.frontPlate.finish})`,
      amount: CUBO4_METAL_PRICES[config.frontPlate.finish],
    });
  } else if (!config.frontFaceColor.sameAsBody) {
    const fp = PAINT_COLORS.find((p) => p.id === config.frontFaceColor.paintId);
    items.push({
      label: `Façade colorée (${fp?.name ?? ''})`,
      amount: CUBO4_FACE_COLOR_PRICE,
    });
  }
  const mountDelta = CUBO4_MOUNT_PRICES[config.mount];
  if (mountDelta > 0) {
    const mo = MOUNT_OPTIONS.find((m) => m.id === config.mount);
    items.push({ label: mo?.name ?? config.mount, amount: mountDelta });
  }
  if (config.climbingHolds.enabled) {
    items.push({ label: "Poignées prises d'escalade", amount: CUBO4_HOLDS_PRICE });
  }
  return items;
}

export function calculateCubo4Price(config: Cubo4Config): number {
  return getCubo4PriceBreakdown(config).reduce((sum, item) => sum + item.amount, 0);
}

export { formatEuro, METAL_FINISHES, MOUNT_OPTIONS, PAINT_COLORS, PETG_COLORS, PLAQUE_TEXT_COLORS };
export type { ColorOption, MetalFinishId };
