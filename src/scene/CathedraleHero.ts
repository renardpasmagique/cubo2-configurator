import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createBrushedMetalTexture } from './textures';
import { getSf3dTheme } from '../theme';

export class CathedraleHero {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private pivotGroup = new THREE.Group();
  private floatGroup = new THREE.Group();
  private shadowDisc: THREE.Mesh;
  private animFrameId = 0;
  private clock = new THREE.Clock();

  private isVisible = true;
  private intersectionObs: IntersectionObserver | null = null;

  constructor(container: HTMLElement, onLoaded?: () => void) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(container.clientWidth, Math.max(1, container.clientHeight));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const isDark = getSf3dTheme() === 'dark';
    this.scene.background = new THREE.Color(isDark ? '#151515' : '#f4f2ee');

    window.addEventListener('sf3d-theme-change', (ev: Event) => {
      const dark = Boolean((ev as CustomEvent).detail?.isDark);
      this.scene.background = new THREE.Color(dark ? '#151515' : '#f4f2ee');
    });

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(roomEnv, 0.03).texture;
    this.scene.environmentIntensity = 1.15;
    roomEnv.dispose();
    pmrem.dispose();

    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(34, aspect, 0.05, 20);
    const initDist = aspect < 1.0 ? 2.28 / Math.max(0.46, aspect * 0.92) : 2.28;
    this.camera.position.set(0, 0.06, initDist);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.02, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.minPolarAngle = Math.PI / 3;
    this.controls.maxPolarAngle = (2 * Math.PI) / 3;

    // Studio lights for metallic highlights
    const keyLight = new THREE.DirectionalLight('#fff6e8', 3.0);
    keyLight.position.set(2.2, 2.5, 2.4);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#d0e2ff', 1.6);
    fillLight.position.set(-2.5, 1.0, 1.5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight('#ffffff', 2.4);
    rimLight.position.set(0.0, 2.2, -2.5);
    this.scene.add(rimLight);

    // Soft floating shadow disc below the levitating sculpture
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 6, 64, 64, 62);
    grad.addColorStop(0, 'rgba(21, 21, 21, 0.26)');
    grad.addColorStop(0.55, 'rgba(21, 21, 21, 0.09)');
    grad.addColorStop(1, 'rgba(21, 21, 21, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);

    const shadowGeo = new THREE.PlaneGeometry(0.95, 0.55);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    this.shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowDisc.position.y = -0.52;
    this.scene.add(this.shadowDisc);

    this.pivotGroup.add(this.floatGroup);
    this.scene.add(this.pivotGroup);

    this.loadCathedrale(onLoaded);
    window.addEventListener('resize', this.handleResize);
    if (typeof IntersectionObserver !== 'undefined') {
      this.intersectionObs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            this.isVisible = entry.isIntersecting;
          }
        },
        { threshold: 0.05 }
      );
      this.intersectionObs.observe(this.container);
    }
    this.animate();
  }

  private loadCathedrale(onLoaded?: () => void): void {
    const assetsBase = (window as unknown as { SF3D_ASSETS_BASE?: string }).SF3D_ASSETS_BASE || './';
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(assetsBase);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    const brushedTex = createBrushedMetalTexture();
    const metalMat = new THREE.MeshPhysicalMaterial({
      color: '#cfd4dc',
      metalness: 0.92,
      roughness: 0.22,
      clearcoat: 0.35,
      clearcoatRoughness: 0.2,
      bumpMap: brushedTex,
      bumpScale: 0.0008,
    });

    loader.load(
      `${assetsBase}cathedrale.glb`,
      (gltf) => {
        gltf.scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            m.material = metalMat;
          }
        });
        this.floatGroup.add(gltf.scene);
        onLoaded?.();
      },
      undefined,
      (err) => {
        console.error('Failed to load cathedrale.glb:', err);
        onLoaded?.();
      }
    );
  }

  private handleResize = (): void => {
    const w = this.container.clientWidth;
    const h = Math.max(1, this.container.clientHeight);
    const aspect = w / h;
    this.camera.aspect = aspect;
    const targetDist = aspect < 1.0 ? 2.28 / Math.max(0.46, aspect * 0.92) : 2.28;
    const dir = this.camera.position.clone().sub(this.controls.target);
    if (dir.lengthSq() > 0.0001) {
      dir.normalize().multiplyScalar(targetDist);
      this.camera.position.copy(this.controls.target).add(dir);
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);
    if (!this.isVisible) return;
    const t = this.clock.getElapsedTime();

    // Smooth continuous slow rotation + floating levitation
    this.pivotGroup.rotation.y = t * 0.16;
    const floatY = Math.sin(t * 1.35) * 0.032;
    this.floatGroup.position.y = floatY;
    this.floatGroup.rotation.z = Math.sin(t * 0.95) * 0.025;

    // Breathe ground shadow with levitation height
    const s = 1.0 - floatY * 1.4;
    this.shadowDisc.scale.set(s, 1, s);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    cancelAnimationFrame(this.animFrameId);
    this.intersectionObs?.disconnect();
    window.removeEventListener('resize', this.handleResize);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
