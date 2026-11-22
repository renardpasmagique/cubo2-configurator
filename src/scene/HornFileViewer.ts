import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HornType } from '../config/pricing';
import { create3DPrintLayerTexture } from './textures';
import { applyPetgMaterial } from './petgMaterial';
import { CameraPreset } from './Cubo2Viewer';
import { getSf3dTheme } from '../theme';

const HORN_CAM_PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  three_quarter: { pos: [0.42, 0.24, 0.56], target: [0, 0.12, 0.04] },
  front: { pos: [0, 0.14, 0.68], target: [0, 0.12, 0.04] },
  profile: { pos: [0.64, 0.15, 0.04], target: [0, 0.12, 0.04] },
  top: { pos: [0.01, 0.72, 0.14], target: [0, 0.12, 0.04] },
};

export class HornFileViewer {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private hornGroup = new THREE.Group();
  private hornMat: THREE.MeshPhysicalMaterial;
  private hornEdgeMat: THREE.LineBasicMaterial;
  private printTex = create3DPrintLayerTexture();
  private animFrameId = 0;
  private camAnim: {
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    progress: number;
  } | null = null;

  constructor(
    container: HTMLElement,
    hornType: HornType,
    onLoaded?: () => void,
    onError?: (err: unknown) => void
  ) {
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
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);

    const isDark = getSf3dTheme() === 'dark';
    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = null;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
    this.scene.environmentIntensity = isDark ? 0.95 : 0.65;
    roomEnv.dispose();
    pmrem.dispose();

    window.addEventListener('sf3d-theme-change', (ev: Event) => {
      const dark = Boolean((ev as CustomEvent).detail?.isDark);
      this.scene.environmentIntensity = dark ? 0.95 : 0.65;
    });

    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(34, aspect, 0.02, 10);
    this.camera.position.set(...HORN_CAM_PRESETS.three_quarter.pos);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(...HORN_CAM_PRESETS.three_quarter.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 0.25;
    this.controls.maxDistance = 1.6;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.minPolarAngle = 0.08;
    this.controls.enablePan = false;

    this.setupLighting();

    this.hornMat = new THREE.MeshPhysicalMaterial({
      color: '#e5e7eb',
      roughness: 0.32,
      metalness: 0.06,
      clearcoat: 0.35,
      clearcoatRoughness: 0.22,
      bumpMap: this.printTex,
      bumpScale: 0.0005,
      side: THREE.DoubleSide,
    });

    this.hornEdgeMat = new THREE.LineBasicMaterial({
      color: '#1e2024',
      transparent: true,
      opacity: 0.2,
    });

    this.scene.add(this.hornGroup);
    this.loadHorn(hornType, onLoaded, onError);
    window.addEventListener('resize', this.handleResize);
    this.animate();
  }

  private setupLighting(): void {
    const keyLight = new THREE.DirectionalLight('#fff8ee', 2.5);
    keyLight.position.set(1.2, 1.8, 1.4);
    keyLight.castShadow = false;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#dbe8ff', 0.8);
    fillLight.position.set(-1.5, 0.9, 0.9);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight('#ffffff', 1.5);
    rimLight.position.set(-0.3, 1.4, -1.5);
    this.scene.add(rimLight);
  }

  private loadHorn(hornType: HornType, onLoaded?: () => void, onError?: (err: unknown) => void): void {
    const assetsBase = (window as unknown as { SF3D_ASSETS_BASE?: string }).SF3D_ASSETS_BASE || './';
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(assetsBase);

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    const targetMeshName = hornType === '3x4' ? 'horn_3x4' : hornType === 'oval' ? 'horn_oval' : 'horn_2x5';

    loader.load(
      `${assetsBase}cubo2.glb`,
      (gltf) => {
        let foundMesh: THREE.Mesh | null = null;
        gltf.scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh && obj.name === targetMeshName) {
            foundMesh = obj as THREE.Mesh;
          }
        });

        if (foundMesh) {
          const mesh = (foundMesh as THREE.Mesh).clone();
          mesh.material = this.hornMat;
          mesh.scale.x = -1;
          mesh.castShadow = false;
          mesh.receiveShadow = false;

          // Center horizontally & depth-wise, and rest bottom on Y = 0
          mesh.geometry.computeBoundingBox();
          const bbox = mesh.geometry.boundingBox!;
          const centerX = (bbox.min.x + bbox.max.x) * 0.5;
          const minY = bbox.min.y;
          const centerZ = (bbox.min.z + bbox.max.z) * 0.5;
          mesh.position.set(-centerX, -minY, -centerZ);

          const edges = new THREE.EdgesGeometry(mesh.geometry, 24);
          const lines = new THREE.LineSegments(edges, this.hornEdgeMat);
          lines.raycast = () => {};
          mesh.add(lines);

          this.hornGroup.add(mesh);
        }

        onLoaded?.();
      },
      undefined,
      (err) => {
        console.error('Failed to load horn 3D model:', err);
        onError?.(err);
      }
    );
  }

  public setPreviewColor(hex: string, translucent = false): void {
    applyPetgMaterial(this.hornMat, hex, translucent);

    const lum = new THREE.Color(hex).getHSL({ h: 0, s: 0, l: 0 }).l;
    this.hornEdgeMat.color.set(lum < 0.25 ? '#ffffff' : '#1e2024');
    this.hornEdgeMat.opacity = lum < 0.25 ? 0.22 : 0.18;
  }

  public setCameraPreset(preset: CameraPreset): void {
    const p = HORN_CAM_PRESETS[preset];
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
