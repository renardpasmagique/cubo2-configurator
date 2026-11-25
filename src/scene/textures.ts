import * as THREE from 'three';

export interface PlywoodTextureSet {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

/**
 * Generates realistic Baltic birch plywood albedo, roughness, and bump textures
 * with subtle wood grain, growth rings, and warm varnished tones.
 */
export function createPlywoodTextures(): PlywoodTextureSet {
  const size = 512;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Base warm birch tone
  cCtx.fillStyle = '#d4b48a';
  cCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Subtle wood grain & cathedral rings
  for (let y = 0; y < size; y++) {
    const wave = Math.sin(y * 0.045) * 8 + Math.sin(y * 0.017) * 14;
    const band = Math.sin((y + wave) * 0.14);
    const tone = Math.floor(band * 10);

    const r = Math.min(255, Math.max(0, 210 + tone));
    const g = Math.min(255, Math.max(0, 176 + Math.floor(tone * 0.85)));
    const b = Math.min(255, Math.max(0, 132 + Math.floor(tone * 0.7)));
    cCtx.fillStyle = `rgba(${r},${g},${b},0.35)`;
    cCtx.fillRect(0, y, size, 1);

    const bv = Math.min(255, Math.max(0, 128 + tone * 2));
    bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    bCtx.fillRect(0, y, size, 1);
  }

  // Fine longitudinal wood pores / fibers
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 18 + Math.random() * 55;
    const alpha = 0.04 + Math.random() * 0.07;
    cCtx.fillStyle = Math.random() > 0.4 ? `rgba(120, 82, 42, ${alpha})` : `rgba(245, 226, 195, ${alpha})`;
    cCtx.fillRect(x, y, len, 1);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, roughnessMap: bumpMap, bumpMap };
}

/**
 * Generates expressive wood veneer ("placage bois") textures with warm honey-oak
 * base and bold dark cathedral wood grain matching the CUBO 4 prototype photos.
 */
export function createWoodVeneerTextures(): PlywoodTextureSet {
  const size = 512;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Warm honey-oak base
  cCtx.fillStyle = '#c89b60';
  cCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Bold dark cathedral grain rings (ash/zebrawood veneer look)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x += 2) {
      const nx = x / size;
      const ny = y / size;
      const dist = Math.hypot((nx - 0.45) * 1.4, (ny - 0.52) * 0.75);
      const warp = Math.sin(ny * 14.0 + Math.cos(nx * 8.0) * 1.6) * 0.11;
      const ring = Math.sin((dist + warp) * 54.0);
      if (ring > 0.42) {
        const strength = Math.min(1, (ring - 0.42) * 2.2);
        cCtx.fillStyle = `rgba(38, 30, 22, ${0.42 + strength * 0.42})`;
        cCtx.fillRect(x, y, 2, 1);
        const bv = Math.max(0, Math.floor(128 - strength * 52));
        bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
        bCtx.fillRect(x, y, 2, 1);
      }
    }
  }

  // Fine longitudinal wood pores
  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 14 + Math.random() * 48;
    const alpha = 0.08 + Math.random() * 0.14;
    cCtx.fillStyle = Math.random() > 0.3 ? `rgba(42, 31, 20, ${alpha})` : `rgba(230, 194, 138, ${alpha})`;
    cCtx.fillRect(x, y, len, 1);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, roughnessMap: bumpMap, bumpMap };
}

/**
 * Generates fine directional brushed metal bump/roughness texture.
 */
export function createBrushedMetalTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1800; i++) {
    const y = Math.random() * size;
    const x = Math.random() * size;
    const w = 30 + Math.random() * 140;
    const v = Math.floor(105 + Math.random() * 55);
    ctx.fillStyle = `rgba(${v},${v},${v},0.35)`;
    ctx.fillRect(x, y, w, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

/**
 * Generates subtle horizontal 3D-printing layer lines for the multicell horn.
 */
export function create3DPrintLayerTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  for (let y = 0; y < size; y++) {
    const v = y % 2 === 0 ? 142 : 114;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, size, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

/**
 * Generates the custom 100x150mm identification & terminal plaque texture
 * matching screenshop cotation.png & IMG_20261012_183149208.jpg.
 */
export function createPlaqueTexture(
  plateColor: string,
  textColor: string,
  customText: string,
  modelLabel = 'cubo 2'
): THREE.CanvasTexture {
  const w = 512;
  const h = 768;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Base plate color
  ctx.fillStyle = plateColor;
  ctx.fillRect(0, 0, w, h);

  // Subtle diagonal 3D-print surface texture
  ctx.strokeStyle = 'rgba(128, 128, 128, 0.08)';
  ctx.lineWidth = 1;
  for (let i = -h; i < w + h; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }

  // 4 corner mounting screws
  ctx.fillStyle = '#2a2b2e';
  for (const [sx, sy] of [
    [34, 34],
    [w - 34, 34],
    [34, h - 34],
    [w - 34, h - 34],
  ]) {
    ctx.beginPath();
    ctx.arc(sx, sy, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = textColor;
  ctx.textBaseline = 'middle';

  // Top "input" + symmetric 50mm polarity markers
  ctx.textAlign = 'center';
  ctx.font = '700 28px "Source Sans 3", sans-serif';
  ctx.fillText('input', w / 2, 42);
  ctx.font = '700 30px "Source Sans 3", sans-serif';
  ctx.fillText('+', 84, 114);
  ctx.fillText('−', w - 84, 114);

  // "5426 studio" in authentic GothicPixels font, spanning wide across the 100mm plaque
  ctx.textAlign = 'center';
  ctx.font = '400 72px "GothicPixels", serif';
  ctx.fillText('5426 studio', w / 2, 286, w - 36);

  // Model label and custom line left-aligned underneath (matching screenshop cotation.png)
  ctx.textAlign = 'left';
  ctx.font = '700 48px "Source Sans 3", sans-serif';
  ctx.fillText(modelLabel, 102, 388);

  const trimmed = customText.trim();
  const displaySubText = trimmed ? trimmed.slice(0, 24) : 'CUSTOM TEXT';
  ctx.font = '600 38px "Source Sans 3", sans-serif';
  if (!trimmed) ctx.globalAlpha = 0.72;
  ctx.fillText(displaySubText, 102, 444, w - 128);
  ctx.globalAlpha = 1.0;

  // Bottom "HF output" + symmetric 50mm polarity markers
  ctx.textAlign = 'center';
  ctx.font = '700 28px "Source Sans 3", sans-serif';
  ctx.fillText('HF output', w / 2, h - 42);
  ctx.font = '700 30px "Source Sans 3", sans-serif';
  ctx.fillText('+', 84, h - 114);
  ctx.fillText('−', w - 84, h - 114);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.anisotropy = 8;
  return tex;
}
