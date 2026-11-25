import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Cubo4Config,
  METAL_FINISHES,
  MOUNT_OPTIONS,
  PAINT_COLORS,
  PETG_COLORS,
  PLAQUE_TEXT_COLORS,
} from '../config/cubo4Config';
import {
  create3DPrintLayerTexture,
  createBrushedMetalTexture,
  createPlaqueTexture,
  createPlywoodTextures,
  createWoodVeneerTextures,
} from './textures';
import { applyPetgMaterial } from './petgMaterial';
import { getSf3dTheme } from '../theme';

export class Cubo4Viewer {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private speakerGroup = new THREE.Group();
  private upperAssembly = new THREE.Group();
  private mountGroup = new THREE.Group();
  private dimGroup = new THREE.Group();
  private dimensionsVisible = false;
  private meshes = new Map<string, THREE.Mesh>();

  private plywoodTex = createPlywoodTextures();
  private veneerTex = createWoodVeneerTextures();
  private brushedTex = createBrushedMetalTexture();
  private printTex = create3DPrintLayerTexture();

  private animFrameId = 0;

  private bodyMat: THREE.MeshPhysicalMaterial;
  private baffleMat: THREE.MeshPhysicalMaterial;
  private plateMat: THREE.MeshStandardMaterial;
  private plaqueMat: THREE.MeshStandardMaterial;
  private plaqueTex: THREE.CanvasTexture | null = null;
  private lastPlaqueKey = '';
  private hornMat: THREE.MeshPhysicalMaterial;
  private frontPetgMat: THREE.MeshPhysicalMaterial;
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

    const isDark = getSf3dTheme() === 'dark';
    this.scene = new THREE.Scene();

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTex;
    this.scene.environmentIntensity = isDark ? 0.65 : 0.72;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(
      34,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.05,
      30
    );
    this.camera.position.set(0.84, 0.54, 1.14);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.30, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 0.45;
    this.controls.maxDistance = 3.0;
    this.controls.maxPolarAngle = Math.PI * 0.52;
    this.controls.update();

    const keyLight = new THREE.DirectionalLight(0xfffaf2, 2.0);
    keyLight.position.set(2.4, 3.6, 2.6);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xeef3ff, 0.9);
    fillLight.position.set(-2.5, 2.0, 1.8);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.85);
    rimLight.position.set(0.4, 2.4, -2.8);
    this.scene.add(rimLight);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    // Materials
    this.bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.72, metalness: 0.0 });
    this.baffleMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.72, metalness: 0.0 });
    this.plateMat = new THREE.MeshStandardMaterial({ color: 0xbec2c7, metalness: 0.85, roughness: 0.32 });
    this.plaqueMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0.05 });

    this.hornMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.0,
      bumpMap: this.printTex,
      bumpScale: 0.00045,
      side: THREE.DoubleSide,
    });
    this.frontPetgMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e5cb3,
      roughness: 0.32,
      metalness: 0.0,
      bumpMap: this.printTex,
      bumpScale: 0.00045,
    });

    this.wooferFrameMat = new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.42, metalness: 0.55 });
    this.wooferConeMat = new THREE.MeshStandardMaterial({ color: 0x202226, roughness: 0.88, metalness: 0.0 });
    this.wooferSurroundMat = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.68, metalness: 0.0 });
    this.wooferDustcapMat = new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.78, metalness: 0.0 });
    this.screwMat = new THREE.MeshStandardMaterial({ color: 0x222326, roughness: 0.35, metalness: 0.8 });
    this.driverMat = new THREE.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.55, metalness: 0.25 });
    this.driverSteelMat = new THREE.MeshStandardMaterial({ color: 0xb4b8be, roughness: 0.28, metalness: 0.88 });
    this.goldMat = new THREE.MeshStandardMaterial({ color: 0xd9a84e, roughness: 0.22, metalness: 0.92 });
    this.feetMat = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.65, metalness: 0.05 });
    this.castorBracketMat = new THREE.MeshStandardMaterial({ color: 0xa2a6ad, roughness: 0.32, metalness: 0.85 });
    this.castorWheelMat = new THREE.MeshStandardMaterial({ color: 0x222327, roughness: 0.7, metalness: 0.05 });

    this.speakerGroup.add(this.upperAssembly);
    this.speakerGroup.add(this.mountGroup);
    this.scene.add(this.speakerGroup);

    this.dimGroup.visible = false;
    this.scene.add(this.dimGroup);

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('sf3d:themechange', this.handleThemeChange);

    this.loadModel(onLoaded, onError);
    this.animate();
  }

  private handleThemeChange = (): void => {
    const isDark = getSf3dTheme() === 'dark';
    this.scene.environmentIntensity = isDark ? 0.65 : 0.72;
    if (this.dimensionsVisible) {
      this.rebuildDimensionsHelper();
    }
  };

  private loadModel(onLoaded?: () => void, onError?: (err: unknown) => void): void {
    const base = (window as unknown as { SF3D_ASSETS_BASE?: string }).SF3D_ASSETS_BASE || './';
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath(base);
    loader.setDRACOLoader(draco);

    loader.load(
      `${base}cubo4.glb`,
      (gltf) => {
        gltf.scene.traverse((obj) => {
          if (!(obj as THREE.Mesh).isMesh) return;
          const mesh = obj as THREE.Mesh;
          const name = mesh.name;
          this.meshes.set(name, mesh);

          if (name.endsWith('_body')) {
            mesh.material = this.bodyMat;
          } else if (name.endsWith('_baffle')) {
            mesh.material = this.baffleMat;
          } else if (name === 'front_metal_plate') {
            mesh.material = this.plateMat;
          } else if (name === 'terminal_plate') {
            mesh.material = this.plaqueMat;
          } else if (name === 'horn_oval') {
            mesh.material = this.hornMat;
          } else if (name === 'facade_avant_hp' || name === 'even_std' || name === 'even_metal') {
            mesh.material = this.frontPetgMat;
          } else if (name === 'woofer_frame') {
            mesh.material = this.wooferFrameMat;
          } else if (name === 'woofer_screws') {
            mesh.material = this.screwMat;
          } else if (name === 'woofer_surround') {
            mesh.material = this.wooferSurroundMat;
          } else if (name === 'woofer_cone') {
            mesh.material = this.wooferConeMat;
          } else if (name === 'woofer_dustcap') {
            mesh.material = this.wooferDustcapMat;
          } else if (name === 'driver_oval') {
            mesh.material = this.driverMat;
          } else if (name === 'driver_oval_metal') {
            mesh.material = this.driverSteelMat;
          } else if (name === 'binding_posts') {
            mesh.material = this.goldMat;
          } else if (name === 'binding_posts_red') {
            mesh.material = new THREE.MeshStandardMaterial({ color: 0xcc2424, roughness: 0.45 });
          } else if (name === 'binding_posts_black') {
            mesh.material = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.45 });
          } else if (name === 'mount_feet') {
            mesh.material = this.feetMat;
          } else if (name === 'castors_bracket') {
            mesh.material = this.castorBracketMat;
          } else if (name === 'castors_wheel') {
            mesh.material = this.castorWheelMat;
          }
        });

        const upperNodes = [
          'cabinet_std_body',
          'cabinet_std_baffle',
          'cabinet_metal_body',
          'cabinet_metal_baffle',
          'front_metal_plate',
          'facade_avant_hp',
          'even_std',
          'even_metal',
          'horn_oval',
          'driver_oval',
          'driver_oval_metal',
          'woofer_frame',
          'woofer_screws',
          'woofer_surround',
          'woofer_cone',
          'woofer_dustcap',
          'terminal_plate',
          'binding_posts',
          'binding_posts_red',
          'binding_posts_black',
        ];
        for (const n of upperNodes) {
          const m = this.meshes.get(n);
          if (m) this.upperAssembly.add(m);
        }
        for (const n of ['mount_feet', 'castors_bracket', 'castors_wheel']) {
          const m = this.meshes.get(n);
          if (m) this.mountGroup.add(m);
        }

        onLoaded?.();
      },
      undefined,
      (err) => {
        console.error('Failed to load cubo4.glb:', err);
        onError?.(err);
      }
    );
  }

  private setMeshVisible(name: string, visible: boolean): void {
    const m = this.meshes.get(name);
    if (m) m.visible = visible;
  }

  private applyWoodOrPaint(
    mat: THREE.MeshPhysicalMaterial,
    type: 'plywood' | 'wood_veneer' | 'paint',
    paintId: string,
    paintSheen: 'mat' | 'satine'
  ): void {
    if (type === 'plywood') {
      mat.map = this.plywoodTex.map;
      mat.bumpMap = this.plywoodTex.bumpMap;
      mat.bumpScale = 0.0012;
      mat.color.setHex(0xffffff);
      mat.roughness = 0.72;
      mat.clearcoat = 0.06;
      mat.clearcoatRoughness = 0.5;
    } else if (type === 'wood_veneer') {
      mat.map = this.veneerTex.map;
      mat.bumpMap = this.veneerTex.bumpMap;
      mat.bumpScale = 0.0016;
      mat.color.setHex(0xffffff);
      mat.roughness = 0.56;
      mat.clearcoat = 0.22;
      mat.clearcoatRoughness = 0.35;
    } else {
      const paint = PAINT_COLORS.find((p) => p.id === paintId) || PAINT_COLORS[0];
      mat.map = null;
      mat.bumpMap = null;
      mat.color.set(paint.hex);
      if (paintSheen === 'satine') {
        mat.roughness = 0.34;
        mat.clearcoat = 0.28;
        mat.clearcoatRoughness = 0.25;
      } else {
        mat.roughness = 0.68;
        mat.clearcoat = 0.04;
        mat.clearcoatRoughness = 0.5;
      }
    }
    mat.needsUpdate = true;
  }

  public applyConfig(config: Cubo4Config): void {
    const isMetal = config.frontMode === 'metal_plate';

    this.setMeshVisible('cabinet_std_body', !isMetal);
    this.setMeshVisible('cabinet_std_baffle', !isMetal);
    this.setMeshVisible('cabinet_metal_body', isMetal);
    this.setMeshVisible('cabinet_metal_baffle', isMetal);
    this.setMeshVisible('front_metal_plate', isMetal);
    this.setMeshVisible('even_std', !isMetal);
    this.setMeshVisible('even_metal', isMetal);
    this.setMeshVisible('facade_avant_hp', !isMetal && config.showHpCover);

    // Metal plate covers the outer woofer flange & screws (mounted behind the 2mm plate)
    this.setMeshVisible('woofer_frame', !isMetal);
    this.setMeshVisible('woofer_screws', !isMetal);
    const wooferZ = isMetal ? -0.0025 : 0.0;
    for (const wn of ['woofer_frame', 'woofer_screws', 'woofer_surround', 'woofer_cone', 'woofer_dustcap']) {
      const wm = this.meshes.get(wn);
      if (wm) wm.position.z = wooferZ;
    }

    // Body finish
    this.applyWoodOrPaint(
      this.bodyMat,
      config.bodyFinish.type,
      config.bodyFinish.paintId,
      config.bodyFinish.paintSheen
    );

    // Front baffle finish
    if (config.frontFaceColor.sameAsBody) {
      this.applyWoodOrPaint(
        this.baffleMat,
        config.bodyFinish.type,
        config.bodyFinish.paintId,
        config.bodyFinish.paintSheen
      );
    } else {
      this.applyWoodOrPaint(
        this.baffleMat,
        'paint',
        config.frontFaceColor.paintId,
        config.frontFaceColor.paintSheen
      );
    }

    // Metal plate finish
    if (isMetal) {
      const mf = METAL_FINISHES.find((m) => m.id === config.frontPlate.finish) || METAL_FINISHES[0];
      const isBrushed = mf.id === 'brushed_alu';
      this.plateMat.color.set(mf.hex);
      this.plateMat.metalness = mf.metalness;
      this.plateMat.roughness = mf.roughness;
      this.plateMat.bumpMap = isBrushed ? this.brushedTex : null;
      this.plateMat.bumpScale = isBrushed ? 0.0007 : 0;
      this.plateMat.needsUpdate = true;
    }

    // Oval horn PETG
    const hornPetg = PETG_COLORS.find((c) => c.id === config.hornColorId) || PETG_COLORS[0];
    applyPetgMaterial(this.hornMat, hornPetg.hex, Boolean(hornPetg.translucent));

    // Front HP cover & port PETG
    const frontPetg = PETG_COLORS.find((c) => c.id === config.frontPetgId) || PETG_COLORS[0];
    applyPetgMaterial(this.frontPetgMat, frontPetg.hex, Boolean(frontPetg.translucent));

    // Mount & elevation
    this.setMeshVisible('mount_feet', config.mount === 'feet');
    this.setMeshVisible('castors_bracket', config.mount === 'castors');
    this.setMeshVisible('castors_wheel', config.mount === 'castors');
    const mountOpt = MOUNT_OPTIONS.find((m) => m.id === config.mount) || MOUNT_OPTIONS[0];
    this.upperAssembly.position.y = mountOpt.heightOffsetM;

    // Terminal & ID plaque
    const platePetg = PETG_COLORS.find((c) => c.id === config.badge.plateColorId) || PETG_COLORS[0];
    const txtColor = PLAQUE_TEXT_COLORS.find((t) => t.id === config.badge.textColorId) || PLAQUE_TEXT_COLORS[0];
    const isPlateTranslucent = Boolean(platePetg.translucent);
    const plaqueKey = `${platePetg.hex}|${isPlateTranslucent}|${txtColor.hex}|${config.badge.text}`;
    if (plaqueKey !== this.lastPlaqueKey) {
      this.lastPlaqueKey = plaqueKey;
      this.plaqueTex?.dispose();
      this.plaqueTex = createPlaqueTexture(platePetg.hex, txtColor.hex, config.badge.text, 'cubo 4');
      this.plaqueMat.map = this.plaqueTex;
      this.plaqueMat.transparent = isPlateTranslucent;
      this.plaqueMat.opacity = isPlateTranslucent ? 0.84 : 1.0;
      this.plaqueMat.roughness = isPlateTranslucent ? 0.28 : 0.45;
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
        if (allVis) box.expandByObject(obj);
      }
    });
    return box;
  }

  public getDimensionsCm(): { widthCm: number; heightCm: number; depthCm: number } {
    const box = this.computeVisibleBounds();
    if (box.isEmpty()) return { widthCm: 0, heightCm: 0, depthCm: 0 };
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
    if (visible) this.rebuildDimensionsHelper();
  }

  private rebuildDimensionsHelper(): void {
    while (this.dimGroup.children.length > 0) {
      const child = this.dimGroup.children[0];
      this.dimGroup.remove(child);
      if ((child as THREE.Line).geometry) (child as THREE.Line).geometry.dispose();
      if ((child as THREE.Sprite).isSprite) {
        const spMat = (child as THREE.Sprite).material as THREE.SpriteMaterial;
        spMat.map?.dispose();
        spMat.dispose();
      }
    }

    const box = this.computeVisibleBounds();
    if (box.isEmpty()) return;

    const { min, max } = box;
    const size = new THREE.Vector3();
    box.getSize(size);
    const widthCm = (Math.round(size.x * 1000) / 10).toFixed(1);
    const heightCm = (Math.round(size.y * 1000) / 10).toFixed(1);
    const depthCm = (Math.round(size.z * 1000) / 10).toFixed(1);

    const isDark = getSf3dTheme() === 'dark';
    const textHex = isDark ? '#f4f2ee' : '#151515';
    const lineMat = new THREE.LineBasicMaterial({ color: textHex, transparent: true, opacity: 0.85 });

    const addDimLabel = (label: string, pos: THREE.Vector3) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 72;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '700 32px "Source Sans 3", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = textHex;
        ctx.fillText(label, canvas.width / 2, canvas.height / 2);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(pos);
      sprite.scale.set(0.18, 0.052, 1);
      sprite.renderOrder = 20;
      this.dimGroup.add(sprite);
    };

    const off = 0.04;
    const tick = 0.014;
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
      this.dimGroup.add(new THREE.LineSegments(geo, lineMat));
    };

    addDimLine(
      new THREE.Vector3(min.x, min.y + 0.005, max.z + off),
      new THREE.Vector3(max.x, min.y + 0.005, max.z + off),
      new THREE.Vector3(0, 0, 1)
    );
    addDimLabel(
      `L ${widthCm} cm`,
      new THREE.Vector3((min.x + max.x) * 0.5, min.y + 0.012, max.z + off + 0.04)
    );

    addDimLine(
      new THREE.Vector3(max.x + off, min.y, max.z + off * 0.5),
      new THREE.Vector3(max.x + off, max.y, max.z + off * 0.5),
      new THREE.Vector3(1, 0, 0)
    );
    addDimLabel(
      `H ${heightCm} cm`,
      new THREE.Vector3(max.x + off + 0.085, (min.y + max.y) * 0.5, max.z + off * 0.5)
    );

    addDimLine(
      new THREE.Vector3(max.x + off, min.y + 0.005, min.z),
      new THREE.Vector3(max.x + off, min.y + 0.005, max.z),
      new THREE.Vector3(1, 0, 0)
    );
    addDimLabel(
      `P ${depthCm} cm`,
      new THREE.Vector3(max.x + off + 0.065, min.y + 0.02, (min.z + max.z) * 0.5)
    );
  }

  public refreshPlaque(config: Cubo4Config): void {
    this.lastPlaqueKey = '';
    this.applyConfig(config);
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
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('sf3d:themechange', this.handleThemeChange);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
