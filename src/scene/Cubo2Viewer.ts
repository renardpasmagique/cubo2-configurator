import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Cubo2Config,
  METAL_FINISHES,
  MOUNT_OPTIONS,
} from '../config/pricing';
import {
  create3DPrintLayerTexture,
  createBrushedMetalTexture,
  createPlaqueTexture,
  createPlywoodTextures,
} from './textures';
import { applyPetgMaterial } from './petgMaterial';
import { getSf3dTheme } from '../theme';

export type CameraPreset = 'three_quarter' | 'front' | 'profile' | 'top';

const CAMERA_PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  three_quarter: { pos: [1.32, 0.86, 1.74], target: [0, 0.46, 0] },
  front: { pos: [0, 0.48, 1.98], target: [0, 0.46, 0] },
  profile: { pos: [1.92, 0.52, 0.05], target: [0, 0.46, 0] },
  top: { pos: [0.02, 2.02, 0.50], target: [0, 0.46, 0] },
};

export class Cubo2Viewer {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private speakerGroup = new THREE.Group();
  private upperAssembly = new THREE.Group(); // cabinet + woofer + horn + plate (shifts up with feet/castors)
  private mountGroup = new THREE.Group(); // feet / castors (stays on Y=0)
  private dimGroup = new THREE.Group();
  private dimensionsVisible = false;
  private meshes = new Map<string, THREE.Mesh>();

  private plywoodTex = createPlywoodTextures();
  private brushedTex = createBrushedMetalTexture();
  private printTex = create3DPrintLayerTexture();

  private animFrameId = 0;
  private camAnim: {
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    progress: number;
  } | null = null;

  private bodyMat: THREE.MeshPhysicalMaterial;
  private baffleMat: THREE.MeshPhysicalMaterial;
  private plateMat: THREE.MeshStandardMaterial;
  private plaqueMat: THREE.MeshStandardMaterial;
  private plaqueTex: THREE.CanvasTexture | null = null;
  private lastPlaqueKey = '';
  private hornMat: THREE.MeshPhysicalMaterial;
  private hornEdgeMat: THREE.LineBasicMaterial;
  private wooferFrameMat: THREE.MeshStandardMaterial;
  private wooferConeMat: THREE.MeshStandardMaterial;
  private wooferSurroundMat: THREE.MeshStandardMaterial;
  private wooferDustcapMat: THREE.MeshStandardMaterial;
  private screwMat: THREE.MeshStandardMaterial;
  private driverMat: THREE.MeshStandardMaterial;
  private driverSteelMat: THREE.MeshStandardMaterial;
  private goldMat: THREE.MeshStandardMaterial;
  private feetMat: THREE.MeshStandardMaterial;
  private castorBracketMat: THREE.MeshStandardMaterial;
  private castorWheelMat: THREE.MeshStandardMaterial;

  constructor(container: HTMLElement, onLoaded?: () => void, onError?: (err: unknown) => void) {
    this.container = container;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);

    // Transparent scene ("PNG sans fond") over CSS background (#f4f2ee / #151515)
    const isDark = getSf3dTheme() === 'dark';
    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = null;

    // Studio HDRI environment via RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
    this.scene.environmentIntensity = isDark ? 0.95 : 0.6;
    roomEnv.dispose();
    pmrem.dispose();

    window.addEventListener('sf3d-theme-change', (ev: Event) => {
      const dark = Boolean((ev as CustomEvent).detail?.isDark);
      this.scene.environmentIntensity = dark ? 0.95 : 0.6;
      if (this.dimensionsVisible) {
        this.rebuildDimensionsHelper();
      }
    });

    // Camera
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(36, aspect, 0.05, 20);
    this.camera.position.set(...CAMERA_PRESETS.three_quarter.pos);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(...CAMERA_PRESETS.three_quarter.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 0.65;
    this.controls.maxDistance = 3.2;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.minPolarAngle = 0.1;
    this.controls.enablePan = false;

    this.setupLighting();

    // Init materials
    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      map: this.plywoodTex.map,
      bumpMap: this.plywoodTex.bumpMap,
      bumpScale: 0.0015,
      roughness: 0.45,
      metalness: 0.02,
      clearcoat: 0.25,
      clearcoatRoughness: 0.35,
    });

    this.baffleMat = this.bodyMat.clone();

    this.plateMat = new THREE.MeshStandardMaterial({
      color: '#c9cdd1',
      metalness: 0.88,
      roughness: 0.34,
      bumpMap: this.brushedTex,
      bumpScale: 0.0006,
    });

    this.plaqueMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.45,
      metalness: 0.12,
    });

    this.hornMat = new THREE.MeshPhysicalMaterial({
      color: '#e8e9eb',
      roughness: 0.36,
      metalness: 0.02,
      clearcoat: 0.35,
      clearcoatRoughness: 0.22,
      bumpMap: this.printTex,
      bumpScale: 0.0006,
      side: THREE.DoubleSide,
    });

    this.hornEdgeMat = new THREE.LineBasicMaterial({
      color: '#222428',
      transparent: true,
      opacity: 0.16,
    });

    this.wooferFrameMat = new THREE.MeshStandardMaterial({
      color: '#18191c',
      roughness: 0.36,
      metalness: 0.55,
    });
    this.wooferConeMat = new THREE.MeshStandardMaterial({
      color: '#1b1c1f',
      roughness: 0.85,
      metalness: 0.02,
    });
    this.wooferSurroundMat = new THREE.MeshStandardMaterial({
      color: '#141517',
      roughness: 0.65,
      metalness: 0.05,
    });
    this.wooferDustcapMat = new THREE.MeshStandardMaterial({
      color: '#191a1d',
      roughness: 0.72,
      metalness: 0.04,
    });
    this.screwMat = new THREE.MeshStandardMaterial({
      color: '#d8dce0',
      roughness: 0.22,
      metalness: 0.92,
    });
    this.driverMat = new THREE.MeshStandardMaterial({
      color: '#1b1c1f',
      roughness: 0.52,
      metalness: 0.12,
    });
    this.driverSteelMat = new THREE.MeshStandardMaterial({
      color: '#c9cdd2',
      roughness: 0.24,
      metalness: 0.9,
    });
    this.goldMat = new THREE.MeshStandardMaterial({
      color: '#d4af37',
      roughness: 0.2,
      metalness: 0.95,
    });
    this.feetMat = new THREE.MeshStandardMaterial({
      color: '#1c1d20',
      roughness: 0.45,
      metalness: 0.65,
    });
    this.castorBracketMat = new THREE.MeshStandardMaterial({
      color: '#aeb4bc',
      roughness: 0.28,
      metalness: 0.88,
    });
    this.castorWheelMat = new THREE.MeshStandardMaterial({
      color: '#202226',
      roughness: 0.75,
      metalness: 0.05,
    });

    this.speakerGroup.add(this.upperAssembly);
    this.speakerGroup.add(this.mountGroup);
    this.scene.add(this.speakerGroup);
    this.dimGroup.visible = false;
    this.scene.add(this.dimGroup);

    this.loadModel(onLoaded, onError);
    window.addEventListener('resize', this.handleResize);
    this.animate();
  }

  private setupLighting(): void {
    const keyLight = new THREE.DirectionalLight('#fff8ee', 2.45);
    keyLight.position.set(2.0, 2.8, 2.0);
    keyLight.castShadow = false;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#dbe8ff', 0.65);
    fillLight.position.set(-2.4, 1.3, 1.2);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight('#ffffff', 1.4);
    rimLight.position.set(-0.6, 2.1, -2.3);
    this.scene.add(rimLight);
  }

  private loadModel(onLoaded?: () => void, onError?: (err: unknown) => void): void {
    const assetsBase = (window as unknown as { SF3D_ASSETS_BASE?: string }).SF3D_ASSETS_BASE || './';
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(assetsBase);

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      `${assetsBase}cubo2.glb`,
      (gltf) => {
        const root = gltf.scene;
        const mountNames = new Set(['mount_feet', 'castors_bracket', 'castors_wheel']);

        const collected: THREE.Mesh[] = [];
        root.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            collected.push(obj as THREE.Mesh);
          }
        });

        for (const mesh of collected) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.meshes.set(mesh.name, mesh);

          // Add subtle crease lines on horns and un-mirror X so normals/orientation match real horn
          if (mesh.name === 'horn_2x5' || mesh.name === 'horn_3x4' || mesh.name === 'horn_oval') {
            mesh.scale.x = -1;
            const edges = new THREE.EdgesGeometry(mesh.geometry, 26);
            const lines = new THREE.LineSegments(edges, this.hornEdgeMat);
            lines.raycast = () => {};
            mesh.add(lines);
          }

          if (mountNames.has(mesh.name)) {
            this.mountGroup.add(mesh);
          } else {
            this.upperAssembly.add(mesh);
          }
        }

        this.assignMaterials();
        const badge = this.meshes.get('badge_anchor');
        if (badge) badge.visible = false;

        onLoaded?.();
      },
      undefined,
      (err) => {
        console.error('Failed to load cubo2.glb:', err);
        onError?.(err);
      }
    );
  }

  private assignMaterials(): void {
    const setMat = (name: string, mat: THREE.Material) => {
      const m = this.meshes.get(name);
      if (m) m.material = mat;
    };

    setMat('cabinet_raw_body', this.bodyMat);
    setMat('cabinet_rounded_body', this.bodyMat);
    setMat('cabinet_raw_baffle', this.baffleMat);
    setMat('cabinet_rounded_baffle', this.baffleMat);
    setMat('front_metal_plate', this.plateMat);
    setMat('front_wood_plate', this.baffleMat);
    setMat('horn_2x5', this.hornMat);
    setMat('horn_3x4', this.hornMat);
    setMat('horn_oval', this.hornMat);
    setMat('woofer_frame', this.wooferFrameMat);
    setMat('woofer_screws', this.screwMat);
    setMat('woofer_surround', this.wooferSurroundMat);
    setMat('woofer_cone', this.wooferConeMat);
    setMat('woofer_dustcap', this.wooferDustcapMat);
    setMat('driver_2x5', this.driverMat);
    setMat('driver_2x5_metal', this.driverSteelMat);
    setMat('driver_3x4', this.driverMat);
    setMat('driver_3x4_metal', this.driverSteelMat);
    setMat('driver_oval', this.driverMat);
    setMat('driver_oval_metal', this.driverSteelMat);
    setMat('terminal_plate', this.plaqueMat);
    setMat('binding_posts', this.goldMat);
    setMat('binding_posts_red', new THREE.MeshStandardMaterial({ color: '#c42424', roughness: 0.35, metalness: 0.15 }));
    setMat('binding_posts_black', new THREE.MeshStandardMaterial({ color: '#18191c', roughness: 0.4, metalness: 0.15 }));
    setMat('mount_feet', this.feetMat);
    setMat('castors_bracket', this.castorBracketMat);
    setMat('castors_wheel', this.castorWheelMat);
  }

  public applyConfig(config: Cubo2Config): void {
    const setVis = (name: string, visible: boolean) => {
      const m = this.meshes.get(name);
      if (m) m.visible = visible;
    };

    // 1. Cabinet edges (raw vs rounded)
    const isRaw = config.edges === 'raw';
    setVis('cabinet_raw_body', isRaw);
    setVis('cabinet_raw_baffle', isRaw);
    setVis('cabinet_rounded_body', !isRaw);
    setVis('cabinet_rounded_baffle', !isRaw);

    // 2. Body finish (plywood vs solid RAL)
    if (config.bodyFinish.type === 'plywood') {
      this.bodyMat.color.set('#ffffff');
      this.bodyMat.map = this.plywoodTex.map;
      this.bodyMat.bumpMap = this.plywoodTex.bumpMap;
      this.bodyMat.bumpScale = 0.0015;
      this.bodyMat.roughness = 0.45;
      this.bodyMat.clearcoat = 0.25;
      this.bodyMat.clearcoatRoughness = 0.35;
    } else {
      this.bodyMat.color.set(config.bodyFinish.color ?? '#1c1d20');
      this.bodyMat.map = null;
      this.bodyMat.bumpMap = null;
      const isMatte = config.bodyFinish.surface === 'matte';
      this.bodyMat.roughness = isMatte ? 0.72 : 0.35;
      this.bodyMat.clearcoat = isMatte ? 0.02 : 0.35;
      this.bodyMat.clearcoatRoughness = isMatte ? 0.7 : 0.25;
    }
    this.bodyMat.needsUpdate = true;

    // 3. Front baffle finish (match body or custom color)
    if (config.frontFaceColor.mode === 'match_body') {
      this.baffleMat.color.copy(this.bodyMat.color);
      this.baffleMat.map = this.bodyMat.map;
      this.baffleMat.bumpMap = this.bodyMat.bumpMap;
      this.baffleMat.bumpScale = this.bodyMat.bumpScale;
      this.baffleMat.roughness = this.bodyMat.roughness;
      this.baffleMat.clearcoat = this.bodyMat.clearcoat;
      this.baffleMat.clearcoatRoughness = this.bodyMat.clearcoatRoughness;
    } else {
      this.baffleMat.color.set(config.frontFaceColor.color ?? '#1c1d20');
      this.baffleMat.map = null;
      this.baffleMat.bumpMap = null;
      this.baffleMat.roughness = 0.48;
      this.baffleMat.clearcoat = 0.15;
    }
    this.baffleMat.needsUpdate = true;

    // 4. Flush front plate (none / wood / metal) & woofer screw color
    setVis('front_wood_plate', config.frontPlate.mode === 'wood');
    setVis('front_metal_plate', config.frontPlate.mode === 'metal');
    const mf = METAL_FINISHES.find((f) => f.id === config.frontPlate.metalFinish) ?? METAL_FINISHES[0];
    this.plateMat.color.set(mf.hex);
    this.plateMat.metalness = mf.metalness;
    this.plateMat.roughness = mf.roughness;
    this.plateMat.bumpMap = mf.id === 'brushed_alu' ? this.brushedTex : null;
    this.plateMat.needsUpdate = true;

    if (config.screwColor === 'silver') {
      this.screwMat.color.set('#d8dce0');
      this.screwMat.metalness = 0.92;
      this.screwMat.roughness = 0.22;
    } else {
      this.screwMat.color.set('#1a1b1e');
      this.screwMat.metalness = 0.65;
      this.screwMat.roughness = 0.42;
    }
    this.screwMat.needsUpdate = true;

    // 5. Horns / Diffusers & compression drivers (Anycubic PETG Classic vs Translucent)
    const hType = config.hornModel.type;
    setVis('horn_2x5', hType === '2x5');
    setVis('driver_2x5', hType === '2x5');
    setVis('driver_2x5_metal', hType === '2x5');
    setVis('horn_3x4', hType === '3x4');
    setVis('driver_3x4', hType === '3x4');
    setVis('driver_3x4_metal', hType === '3x4');
    setVis('horn_oval', hType === 'oval');
    setVis('driver_oval', hType === 'oval');
    setVis('driver_oval_metal', hType === 'oval');
    applyPetgMaterial(this.hornMat, config.hornModel.color, config.hornModel.translucent);

    const hornLuminance = new THREE.Color(config.hornModel.color).getHSL({ h: 0, s: 0, l: 0 }).l;
    this.hornEdgeMat.color.set(hornLuminance < 0.25 ? '#ffffff' : '#222428');
    this.hornEdgeMat.opacity = hornLuminance < 0.25 ? 0.18 : 0.16;

    // 7. Mounts & vertical offset
    const mountOpt = MOUNT_OPTIONS.find((m) => m.id === config.mount.type) ?? MOUNT_OPTIONS[0];
    setVis('mount_feet', config.mount.type === 'feet');
    setVis('castors_bracket', config.mount.type === 'castors');
    setVis('castors_wheel', config.mount.type === 'castors');
    this.upperAssembly.position.y = mountOpt.heightOffsetM;

    // 8. Custom identification & terminal plaque
    const plaqueKey = `${config.badge.plateColor}|${config.badge.plateTranslucent}|${config.badge.textColor}|${config.badge.text}`;
    if (plaqueKey !== this.lastPlaqueKey) {
      this.lastPlaqueKey = plaqueKey;
      this.plaqueTex?.dispose();
      this.plaqueTex = createPlaqueTexture(
        config.badge.plateColor,
        config.badge.textColor,
        config.badge.text
      );
      this.plaqueMat.map = this.plaqueTex;
      this.plaqueMat.transparent = config.badge.plateTranslucent;
      this.plaqueMat.opacity = config.badge.plateTranslucent ? 0.82 : 1.0;
      this.plaqueMat.roughness = config.badge.plateTranslucent ? 0.28 : 0.45;
      this.plaqueMat.needsUpdate = true;
    }

    if (this.dimensionsVisible) {
      this.rebuildDimensionsHelper();
    }
  }

  private computeVisibleBounds(): THREE.Box3 {
    this.speakerGroup.updateMatrixWorld(true);
    const box = new THREE.Box3();
    this.speakerGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj.visible) {
        let p: THREE.Object3D | null = obj;
        let allVis = true;
        while (p) {
          if (!p.visible) {
            allVis = false;
            break;
          }
          p = p.parent;
        }
        if (allVis) {
          box.expandByObject(obj);
        }
      }
    });
    return box;
  }

  public getDimensionsCm(): { widthCm: number; heightCm: number; depthCm: number } {
    const box = this.computeVisibleBounds();
    if (box.isEmpty()) {
      return { widthCm: 0, heightCm: 0, depthCm: 0 };
    }
    const size = new THREE.Vector3();
    box.getSize(size);
    return {
      widthCm: Math.round(size.x * 1000) / 10,
      heightCm: Math.round(size.y * 1000) / 10,
      depthCm: Math.round(size.z * 1000) / 10,
    };
  }

  public setDimensionsVisible(visible: boolean): void {
    this.dimensionsVisible = visible;
    this.dimGroup.visible = visible;
    if (visible) {
      this.rebuildDimensionsHelper();
    }
  }

  private rebuildDimensionsHelper(): void {
    while (this.dimGroup.children.length > 0) {
      const child = this.dimGroup.children[0];
      this.dimGroup.remove(child);
      if ((child as THREE.Line).geometry) {
        (child as THREE.Line).geometry.dispose();
      }
    }

    const box = this.computeVisibleBounds();
    if (box.isEmpty()) return;

    const { min, max } = box;
    const isDark = getSf3dTheme() === 'dark';
    const lineMat = new THREE.LineBasicMaterial({
      color: isDark ? '#f4f2ee' : '#151515',
      transparent: true,
      opacity: 0.85,
    });

    const off = 0.055;
    const tick = 0.018;
    const addDimLine = (a: THREE.Vector3, b: THREE.Vector3, tickDir: THREE.Vector3) => {
      const pts = [
        a,
        b,
        a.clone().addScaledVector(tickDir, -tick),
        a.clone().addScaledVector(tickDir, tick),
        b.clone().addScaledVector(tickDir, -tick),
        b.clone().addScaledVector(tickDir, tick),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const segs = new THREE.LineSegments(geo, lineMat);
      this.dimGroup.add(segs);
    };

    // Largeur (X) along front bottom
    addDimLine(
      new THREE.Vector3(min.x, min.y + 0.005, max.z + off),
      new THREE.Vector3(max.x, min.y + 0.005, max.z + off),
      new THREE.Vector3(0, 0, 1)
    );
    // Hauteur (Y) along front-right vertical edge
    addDimLine(
      new THREE.Vector3(max.x + off, min.y, max.z + off * 0.5),
      new THREE.Vector3(max.x + off, max.y, max.z + off * 0.5),
      new THREE.Vector3(1, 0, 0)
    );
    // Profondeur (Z) along right bottom edge
    addDimLine(
      new THREE.Vector3(max.x + off, min.y + 0.005, min.z),
      new THREE.Vector3(max.x + off, min.y + 0.005, max.z),
      new THREE.Vector3(1, 0, 0)
    );
  }

  public refreshPlaque(config: Cubo2Config): void {
    this.lastPlaqueKey = '';
    this.applyConfig(config);
  }

  public setCameraPreset(preset: CameraPreset): void {
    const p = CAMERA_PRESETS[preset];
    this.camAnim = {
      startPos: this.camera.position.clone(),
      endPos: new THREE.Vector3(...p.pos),
      startTarget: this.controls.target.clone(),
      endTarget: new THREE.Vector3(...p.target),
      progress: 0,
    };
  }

  public takeScreenshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  private handleResize = (): void => {
    const w = this.container.clientWidth;
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);

    if (this.camAnim) {
      this.camAnim.progress = Math.min(1, this.camAnim.progress + 0.06);
      const ease = 1 - Math.pow(1 - this.camAnim.progress, 3);
      this.camera.position.lerpVectors(this.camAnim.startPos, this.camAnim.endPos, ease);
      this.controls.target.lerpVectors(this.camAnim.startTarget, this.camAnim.endTarget, ease);
      if (this.camAnim.progress >= 1) {
        this.camAnim = null;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.handleResize);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
