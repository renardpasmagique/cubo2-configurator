import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CameraPreset } from './Cubo2Viewer';
import { getSf3dTheme } from '../theme';

const RELICA_CAM_PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  three_quarter: { pos: [0.22, 0.24, 0.28], target: [0, 0.015, 0] },
  front: { pos: [0, 0.14, 0.34], target: [0, 0.015, 0] },
  profile: { pos: [0.34, 0.12, 0.0], target: [0, 0.015, 0] },
  top: { pos: [0.0, 0.42, 0.02], target: [0, 0.01, 0] },
};

/**
 * Calibrates Relica 3 Crossover PCB + components PBR materials to match
 * the real-world product photographs (matte black FR4 solder mask, white silkscreen,
 * ENIG gold pads, glossy black film capacitors, vivid red/copper enameled coils,
 * ceramic cement resistors, and matte black terminal blocks with brass screws).
 */
export function applyRelica3Materials(root: THREE.Object3D, assetsBase: string, onTexLoaded?: () => void): void {
  const texLoader = new THREE.TextureLoader();
  texLoader.setCrossOrigin('anonymous');
  const pcbTex = texLoader.load(`${assetsBase}relica3_pcb_top.png`, () => {
    onTexLoaded?.();
  });
  pcbTex.colorSpace = THREE.SRGBColorSpace;
  pcbTex.flipY = false;
  pcbTex.anisotropy = 4;

  const mats: Record<string, THREE.Material> = {
    relica_pcb: new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      map: pcbTex,
      roughness: 0.72,
      metalness: 0.04,
      clearcoat: 0.14,
      clearcoatRoughness: 0.45,
    }),
    relica_pcb_body: new THREE.MeshStandardMaterial({
      color: '#141619',
      roughness: 0.75,
      metalness: 0.04,
    }),
    relica_pads: new THREE.MeshStandardMaterial({
      color: '#d4af37',
      metalness: 0.95,
      roughness: 0.18,
    }),
    relica_cap_body: new THREE.MeshPhysicalMaterial({
      color: '#141619',
      roughness: 0.26,
      metalness: 0.05,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18,
    }),
    relica_cap_end: new THREE.MeshStandardMaterial({
      color: '#1c1e22',
      roughness: 0.42,
      metalness: 0.1,
    }),
    relica_cap_leads: new THREE.MeshStandardMaterial({
      color: '#cfd4dc',
      metalness: 0.92,
      roughness: 0.2,
    }),
    relica_coil_air_bobbin: new THREE.MeshStandardMaterial({
      color: '#ebe8e0',
      roughness: 0.55,
      metalness: 0.02,
    }),
    relica_coil_air_wire: new THREE.MeshPhysicalMaterial({
      color: '#c83218',
      metalness: 0.62,
      roughness: 0.26,
      clearcoat: 0.35,
      clearcoatRoughness: 0.2,
    }),
    relica_coil_ferrite_bobbin: new THREE.MeshStandardMaterial({
      color: '#282a2e',
      roughness: 0.62,
      metalness: 0.15,
    }),
    relica_coil_ferrite_wire: new THREE.MeshPhysicalMaterial({
      color: '#b84a18',
      metalness: 0.65,
      roughness: 0.28,
      clearcoat: 0.35,
      clearcoatRoughness: 0.2,
    }),
    relica_resistor: new THREE.MeshStandardMaterial({
      color: '#e4e2dc',
      roughness: 0.8,
      metalness: 0.02,
    }),
    relica_tb_body: new THREE.MeshStandardMaterial({
      color: '#151618',
      roughness: 0.52,
      metalness: 0.05,
    }),
    relica_tb_screws: new THREE.MeshStandardMaterial({
      color: '#d4af37',
      metalness: 0.92,
      roughness: 0.22,
    }),
  };

  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      if (mats[m.name]) {
        m.material = mats[m.name];
      }
    }
  });
}

export class Relica3Viewer {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private boardGroup = new THREE.Group();
  private animFrameId = 0;
  private camAnim: {
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    progress: number;
  } | null = null;

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
    this.renderer.setSize(container.clientWidth, Math.max(1, container.clientHeight));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);

    const isDark = getSf3dTheme() === 'dark';
    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = null;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
    this.scene.environmentIntensity = isDark ? 1.05 : 0.72;
    roomEnv.dispose();
    pmrem.dispose();

    window.addEventListener('sf3d-theme-change', (ev: Event) => {
      const dark = Boolean((ev as CustomEvent).detail?.isDark);
      this.scene.environmentIntensity = dark ? 1.05 : 0.72;
    });

    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(34, aspect, 0.01, 10);
    this.camera.position.set(...RELICA_CAM_PRESETS.three_quarter.pos);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(...RELICA_CAM_PRESETS.three_quarter.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 0.14;
    this.controls.maxDistance = 1.1;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.minPolarAngle = 0.05;
    this.controls.enablePan = false;

    this.setupLighting();
    this.scene.add(this.boardGroup);
    this.loadModel(onLoaded, onError);

    window.addEventListener('resize', this.handleResize);
    this.animate();
  }

  private setupLighting(): void {
    const keyLight = new THREE.DirectionalLight('#fff8ee', 2.4);
    keyLight.position.set(0.8, 1.4, 0.9);
    keyLight.castShadow = false;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#dbe8ff', 0.85);
    fillLight.position.set(-1.0, 0.7, 0.6);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight('#ffffff', 1.4);
    rimLight.position.set(-0.2, 1.0, -1.0);
    this.scene.add(rimLight);
  }

  private loadModel(onLoaded?: () => void, onError?: (err: unknown) => void): void {
    const assetsBase = (window as unknown as { SF3D_ASSETS_BASE?: string }).SF3D_ASSETS_BASE || './';
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(assetsBase);

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      `${assetsBase}relica3.glb`,
      (gltf) => {
        applyRelica3Materials(gltf.scene, assetsBase);
        gltf.scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
          }
        });
        this.boardGroup.add(gltf.scene);
        onLoaded?.();
      },
      undefined,
      (err) => {
        console.error('Failed to load relica3.glb:', err);
        onError?.(err);
      }
    );
  }

  public setCameraPreset(preset: CameraPreset): void {
    const p = RELICA_CAM_PRESETS[preset];
    this.camAnim = {
      startPos: this.camera.position.clone(),
      endPos: new THREE.Vector3(...p.pos),
      startTarget: this.controls.target.clone(),
      endTarget: new THREE.Vector3(...p.target),
      progress: 0,
    };
  }

  public handleResize = (): void => {
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
