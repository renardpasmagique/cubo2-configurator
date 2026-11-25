import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HornType, METAL_FINISHES, PAINT_COLORS, PETG_COLORS } from '../config/pricing';
import { applyPetgMaterial } from './petgMaterial';
import { applyRelica3Materials } from './Relica3Viewer';
import { createPlywoodTextures, createWoodVeneerTextures } from './textures';
import { getSf3dTheme } from '../theme';

type CardKind = 'cubo2' | 'cubo4' | 'horn_3x4' | 'horn_2x5' | 'horn_oval' | 'relica3';

interface CardSlot {
  card: HTMLElement;
  kind: CardKind;
  canvasEl: HTMLCanvasElement;
  ctx2d: CanvasRenderingContext2D;
  object: THREE.Object3D;
  camDist: number;
  camYRatio: number;
  hovered: boolean;
  angleY: number;
  floatPhase: number;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Renders interactive white-background 3D thumbnails on the homepage/catalog
 * for CUBO 2, Horns (3x4, 2x5, Oval), and Relica 3.
 * - Bounding-box auto-framing (~65-72% height, zero cropped edges on rotation)
 * - Randomized appearance on every page load (Section 3.3)
 * - Smooth Y-axis rotation + subtle float on hover, smooth stop on mouseleave
 */
export class CatalogCard3D {
  private slots: CardSlot[] = [];
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private pivot = new THREE.Group();
  private floatGroup = new THREE.Group();
  private animFrameId = 0;
  private lastTime = 0;

  constructor() {
    this.initCards();
  }

  private initCards(): void {
    // Hide duplicate printed horn cards (ID 5 = 3x4 printed, ID 7 = 2x5 printed)
    document
      .querySelectorAll<HTMLElement>(
        '.product-miniature[data-id-product="5"], .product-miniature[data-id-product="7"]'
      )
      .forEach((dupCard) => {
        dupCard.style.display = 'none';
      });

    const cardConfigs: Array<{ id: number; kind: CardKind; title?: string; priceLabel?: string }> = [
      { id: 8, kind: 'cubo2', title: 'CUBO 2 Configurateur', priceLabel: 'À partir de 1 650,00 €' },
      { id: 11, kind: 'cubo4', title: 'CUBO 4 Configurateur', priceLabel: 'Sur devis' },
      {
        id: 1,
        kind: 'horn_3x4',
        title: '5426 Multicell Horn 3×4',
        priceLabel: '35,00 € (Fichiers 3D) • 222,00 € (Imprimé)',
      },
      {
        id: 2,
        kind: 'horn_2x5',
        title: '5426 Multicell Horn 2×5',
        priceLabel: '30,00 € (Fichiers 3D) • 198,00 € (Imprimé)',
      },
      {
        id: 3,
        kind: 'horn_oval',
        title: 'Pavillon Acoustique Elliptique 5426 Studio',
        priceLabel: '30,00 € (Fichiers 3D)',
      },
      { id: 10, kind: 'relica3' },
    ];

    const foundCards: Array<{ card: HTMLElement; kind: CardKind; imgEl: HTMLImageElement }> = [];

    for (const cfg of cardConfigs) {
      document
        .querySelectorAll<HTMLElement>(`.product-miniature[data-id-product="${cfg.id}"]`)
        .forEach((card) => {
          if (cfg.title) {
            const titleEl = card.querySelector<HTMLElement>('.product-miniature__title');
            if (titleEl) titleEl.textContent = cfg.title;
          }
          if (cfg.priceLabel) {
            const priceEl = card.querySelector<HTMLElement>('.product-miniature__price');
            if (priceEl) priceEl.textContent = cfg.priceLabel;
          }

          const imgEl = card.querySelector<HTMLImageElement>('.product-miniature__image');
          if (imgEl) {
            foundCards.push({ card, kind: cfg.kind, imgEl });
          }
        });
    }

    if (foundCards.length === 0) return;
    this.setupRendererAndLoad(foundCards);
  }

  private setupRendererAndLoad(
    cards: Array<{ card: HTMLElement; kind: CardKind; imgEl: HTMLImageElement }>
  ): void {
    const assetsBase =
      (window as unknown as { SF3D_ASSETS_BASE?: string }).SF3D_ASSETS_BASE ||
      'https://renardpasmagique.github.io/cubo2-configurator/';

    const size = 400;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(size, size);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.scene = new THREE.Scene();
    const isDark = getSf3dTheme() === 'dark';
    this.scene.background = null;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(roomEnv, 0.03).texture;
    this.scene.environmentIntensity = isDark ? 1.05 : 0.78;
    roomEnv.dispose();
    pmrem.dispose();

    window.addEventListener('sf3d-theme-change', (ev: Event) => {
      const dark = Boolean((ev as CustomEvent).detail?.isDark);
      if (this.scene) {
        this.scene.environmentIntensity = dark ? 1.05 : 0.78;
      }
      for (const s of this.slots) {
        this.renderSlotFrame(s);
      }
    });

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.02, 20);

    const keyLight = new THREE.DirectionalLight('#fff8ef', 2.5);
    keyLight.position.set(1.8, 2.4, 2.0);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#dce8ff', 1.15);
    fillLight.position.set(-2.0, 1.1, 1.4);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight('#ffffff', 1.6);
    rimLight.position.set(0.0, 1.9, -2.0);
    this.scene.add(rimLight);

    this.pivot.add(this.floatGroup);
    this.scene.add(this.pivot);

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(assetsBase);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    const needCuboOrHorns = cards.some((c) => c.kind !== 'relica3' && c.kind !== 'cubo4');
    const needCubo4 = cards.some((c) => c.kind === 'cubo4');
    const needRelica3 = cards.some((c) => c.kind === 'relica3');

    if (needCubo4) {
      loader.load(`${assetsBase}cubo4.glb`, (gltf) => {
        for (const item of cards) {
          if (item.kind !== 'cubo4') continue;
          const root = gltf.scene.clone(true);
          const veneerTex = createWoodVeneerTextures();
          const hornFil = pickRandom(PETG_COLORS);
          const frontFil = pickRandom(PETG_COLORS);
          const veneerMat = new THREE.MeshPhysicalMaterial({
            map: veneerTex.map,
            bumpMap: veneerTex.bumpMap,
            bumpScale: 0.0014,
            roughness: 0.56,
            clearcoat: 0.2,
          });
          const hornMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', side: THREE.DoubleSide });
          applyPetgMaterial(hornMat, hornFil.hex, Boolean(hornFil.translucent));
          const frontPetgMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff' });
          applyPetgMaterial(frontPetgMat, frontFil.hex, Boolean(frontFil.translucent));
          const darkMat = new THREE.MeshStandardMaterial({ color: 0x1d1e22, roughness: 0.65 });
          const steelMat = new THREE.MeshStandardMaterial({ color: 0xb4b8be, roughness: 0.3, metalness: 0.85 });

          const upper = new THREE.Group();
          const lower = new THREE.Group();
          const allMeshes: THREE.Mesh[] = [];
          root.traverse((o) => {
            if ((o as THREE.Mesh).isMesh) allMeshes.push(o as THREE.Mesh);
          });
          for (const m of allMeshes) {
            if (['cabinet_metal_body', 'cabinet_metal_baffle', 'front_metal_plate', 'even_metal', 'castors_bracket', 'castors_wheel', 'hold_left', 'hold_right'].includes(m.name)) {
              m.visible = false;
              continue;
            }
            if (m.name === 'cabinet_std_body' || m.name === 'cabinet_std_baffle') {
              m.material = veneerMat;
            } else if (m.name === 'horn_oval') {
              m.material = hornMat;
            } else if (m.name === 'facade_avant_hp' || m.name === 'even_std') {
              m.material = frontPetgMat;
            } else if (m.name === 'driver_oval_metal') {
              m.material = steelMat;
            } else {
              m.material = darkMat;
            }
            if (m.name === 'mount_feet') {
              lower.add(m);
            } else {
              upper.add(m);
            }
          }
          upper.position.y = 0.0224;
          const assembly = new THREE.Group();
          assembly.add(upper);
          assembly.add(lower);
          const centered = this.centerObjectAtOrigin(assembly);
          this.attachCardSlot(item.card, item.imgEl, 'cubo4', centered, size, 0.36, -0.45);
        }
      });
    }

    if (needCuboOrHorns) {
      loader.load(`${assetsBase}cubo2.glb`, (gltf) => {
        for (const item of cards) {
          if (item.kind === 'cubo2') {
            const obj = this.buildRandomCubo2(gltf.scene);
            this.attachCardSlot(item.card, item.imgEl, item.kind, obj, size, 0.36, -0.45);
          } else if (item.kind === 'horn_3x4' || item.kind === 'horn_2x5' || item.kind === 'horn_oval') {
            const hType: HornType =
              item.kind === 'horn_3x4' ? '3x4' : item.kind === 'horn_2x5' ? '2x5' : 'oval';
            const obj = this.buildRandomHorn(gltf.scene, hType);
            if (obj) {
              this.attachCardSlot(item.card, item.imgEl, item.kind, obj, size, 0.34, -0.35);
            }
          }
        }
      });
    }

    if (needRelica3) {
      loader.load(`${assetsBase}relica3.glb`, (gltf) => {
        for (const item of cards) {
          if (item.kind !== 'relica3') continue;
          const root = gltf.scene.clone(true);
          // Tilt slightly towards camera so the PCB silkscreen & components read clearly
          const wrapper = new THREE.Group();
          root.rotation.x = 0.25;
          wrapper.add(root);

          const slot = this.attachCardSlot(item.card, item.imgEl, 'relica3', wrapper, size, 0.62, -0.35);
          applyRelica3Materials(root, assetsBase, () => {
            if (slot) this.renderSlotFrame(slot);
          });
        }
      });
    }
  }

  private buildRandomHorn(gltfScene: THREE.Group, hType: HornType): THREE.Object3D | null {
    const targetName = hType === '3x4' ? 'horn_3x4' : hType === 'oval' ? 'horn_oval' : 'horn_2x5';
    let found: THREE.Mesh | null = null;
    gltfScene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.name === targetName) {
        found = o as THREE.Mesh;
      }
    });
    if (!found) return null;

    const filament = pickRandom(PETG_COLORS);
    const hornMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', side: THREE.DoubleSide });
    applyPetgMaterial(hornMat, filament.hex, Boolean(filament.translucent));

    const mesh = (found as THREE.Mesh).clone();
    mesh.material = hornMat;
    mesh.scale.x = -1;

    const lum = new THREE.Color(filament.hex).getHSL({ h: 0, s: 0, l: 0 }).l;
    const edgeMat = new THREE.LineBasicMaterial({
      color: lum < 0.25 ? '#ffffff' : '#151515',
      transparent: true,
      opacity: lum < 0.25 ? 0.22 : 0.16,
    });
    const edges = new THREE.EdgesGeometry(mesh.geometry, 24);
    mesh.add(new THREE.LineSegments(edges, edgeMat));

    return this.centerObjectAtOrigin(mesh);
  }

  private buildRandomCubo2(gltfScene: THREE.Group): THREE.Object3D {
    const root = gltfScene.clone(true);
    const isRaw = Math.random() < 0.5;
    const isPlywood = Math.random() < 0.4;
    const plateMode = pickRandom(['none', 'wood', 'metal'] as const);
    const hornType = pickRandom(['2x5', '3x4', 'oval'] as const);
    const mountType = pickRandom(['none', 'feet', 'castors'] as const);
    const filament = pickRandom(PETG_COLORS);
    const paintColor = pickRandom(PAINT_COLORS);

    const plywoodTex = createPlywoodTextures();
    const bodyMat = isPlywood
      ? new THREE.MeshPhysicalMaterial({
          color: '#ffffff',
          map: plywoodTex.map,
          bumpMap: plywoodTex.bumpMap,
          bumpScale: 0.0015,
          roughness: 0.45,
          clearcoat: 0.25,
        })
      : new THREE.MeshPhysicalMaterial({
          color: paintColor.hex,
          roughness: 0.42,
          clearcoat: 0.25,
        });

    const mf = pickRandom(METAL_FINISHES);
    const plateMat = new THREE.MeshStandardMaterial({
      color: mf.hex,
      metalness: mf.metalness,
      roughness: mf.roughness,
    });

    const hornMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', side: THREE.DoubleSide });
    applyPetgMaterial(hornMat, filament.hex, Boolean(filament.translucent));

    const darkMat = new THREE.MeshStandardMaterial({ color: '#1a1b1e', roughness: 0.6 });
    const steelMat = new THREE.MeshStandardMaterial({ color: '#c9cdd2', metalness: 0.9, roughness: 0.24 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 0.92, roughness: 0.2 });

    const heightOffset = mountType === 'feet' ? 0.042 : mountType === 'castors' ? 0.078 : 0;
    const upper = new THREE.Group();
    const lower = new THREE.Group();
    upper.position.y = heightOffset;

    const mountNames = new Set(['mount_feet', 'castors_bracket', 'castors_wheel']);
    const meshes: THREE.Mesh[] = [];
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
    });

    for (const m of meshes) {
      if (mountNames.has(m.name)) {
        lower.add(m);
      } else {
        upper.add(m);
      }

      if (m.name === 'cabinet_raw_body' || m.name === 'cabinet_raw_baffle') {
        m.visible = isRaw;
        m.material = bodyMat;
      } else if (m.name === 'cabinet_rounded_body' || m.name === 'cabinet_rounded_baffle') {
        m.visible = !isRaw;
        m.material = bodyMat;
      } else if (m.name === 'front_wood_plate') {
        m.visible = plateMode === 'wood';
        m.material = bodyMat;
      } else if (m.name === 'front_metal_plate') {
        m.visible = plateMode === 'metal';
        m.material = plateMat;
      } else if (m.name.startsWith('horn_')) {
        m.visible = m.name === `horn_${hornType}`;
        m.scale.x = -1;
        m.material = hornMat;
      } else if (m.name.startsWith('driver_')) {
        m.visible = m.name.startsWith(`driver_${hornType}`);
        m.material = m.name.endsWith('_metal') ? steelMat : darkMat;
      } else if (m.name === 'mount_feet') {
        m.visible = mountType === 'feet';
        m.material = darkMat;
      } else if (m.name === 'castors_bracket' || m.name === 'castors_wheel') {
        m.visible = mountType === 'castors';
        m.material = m.name === 'castors_bracket' ? steelMat : darkMat;
      } else if (m.name === 'badge_anchor') {
        m.visible = false;
      } else if (m.name === 'binding_posts') {
        m.material = goldMat;
      } else if (m.name === 'woofer_screws') {
        m.material = steelMat;
      } else {
        m.material = darkMat;
      }
    }

    const assembly = new THREE.Group();
    assembly.add(upper);
    assembly.add(lower);
    return this.centerObjectAtOrigin(assembly);
  }

  /**
   * Centers the visible bounding box of an object at (0, 0, 0) so rotation stays
   * perfectly centered and returns the object + bounding sphere radius.
   */
  private centerObjectAtOrigin(obj: THREE.Object3D): THREE.Group {
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3();
    obj.traverse((child) => {
      const m = child as THREE.Mesh;
      if (m.isMesh && m.visible) {
        box.expandByObject(m);
      }
    });
    const center = new THREE.Vector3();
    box.getCenter(center);

    const centered = new THREE.Group();
    obj.position.sub(center);
    centered.add(obj);
    return centered;
  }

  private attachCardSlot(
    card: HTMLElement,
    imgEl: HTMLImageElement,
    kind: CardKind,
    object: THREE.Object3D,
    size: number,
    camYRatio: number,
    initialAngleY: number
  ): CardSlot | null {
    const linkEl = imgEl.closest('.product-miniature__image-link') as HTMLElement | null;
    if (!linkEl || linkEl.querySelector('.sf3d-card-canvas')) return null;

    // Compute bounding sphere to guarantee ~65-72% height framing with zero edge cropping on 360° spin
    object.updateMatrixWorld(true);
    const box = new THREE.Box3();
    object.traverse((child) => {
      const m = child as THREE.Mesh;
      if (m.isMesh && m.visible) {
        box.expandByObject(m);
      }
    });
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const fovRad = THREE.MathUtils.degToRad(30);
    const camDist = (sphere.radius / Math.sin(fovRad / 2)) * 1.42;

    const canvas2d = document.createElement('canvas');
    canvas2d.width = size;
    canvas2d.height = size;
    canvas2d.className = 'sf3d-card-canvas';
    const ctx2d = canvas2d.getContext('2d')!;

    linkEl.style.position = 'relative';
    linkEl.style.display = 'block';
    linkEl.style.background = 'transparent';
    linkEl.querySelectorAll('picture, img').forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });
    linkEl.appendChild(canvas2d);

    const slot: CardSlot = {
      card,
      kind,
      canvasEl: canvas2d,
      ctx2d,
      object,
      camDist,
      camYRatio,
      hovered: false,
      angleY: initialAngleY,
      floatPhase: 0,
    };

    this.slots.push(slot);
    this.renderSlotFrame(slot);

    card.addEventListener('mouseenter', () => {
      slot.hovered = true;
      this.startHoverLoop();
    });
    card.addEventListener('mouseleave', () => {
      slot.hovered = false;
    });

    return slot;
  }

  private renderSlotFrame(slot: CardSlot): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.floatGroup.clear();
    this.floatGroup.add(slot.object);

    this.camera.position.set(0, slot.camDist * slot.camYRatio, slot.camDist);
    this.camera.lookAt(0, 0, 0);

    this.pivot.rotation.y = slot.angleY;
    const floatY = slot.hovered ? Math.sin(slot.floatPhase) * (slot.camDist * 0.015) : 0;
    this.floatGroup.position.y = floatY;

    this.renderer.render(this.scene, this.camera);
    slot.ctx2d.clearRect(0, 0, slot.canvasEl.width, slot.canvasEl.height);
    slot.ctx2d.drawImage(this.renderer.domElement, 0, 0, slot.canvasEl.width, slot.canvasEl.height);
  }

  private startHoverLoop(): void {
    if (this.animFrameId !== 0) return;
    this.lastTime = performance.now();
    this.tick(this.lastTime);
  }

  private tick = (now: number): void => {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    let anyHovered = false;
    for (const slot of this.slots) {
      if (slot.hovered) {
        anyHovered = true;
        slot.angleY += dt * 0.72;
        slot.floatPhase += dt * 2.2;
        this.renderSlotFrame(slot);
      }
    }

    if (anyHovered) {
      this.animFrameId = requestAnimationFrame(this.tick);
    } else {
      this.animFrameId = 0;
    }
  };
}
