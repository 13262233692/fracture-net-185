import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VolumeData, MeshData } from '../types';

export class VolumeRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private volumeMesh: THREE.Mesh | null = null;
  private fractureMesh: THREE.Mesh | null = null;
  private wireframeBox: THREE.LineSegments | null = null;
  private animationId: number | null = null;
  private volumeData: VolumeData | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000);
    this.camera.position.set(100, 100, 150);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 1000;

    this.setupLighting();
    this.setupEventListeners();
    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(100, 100, 50);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-100, -50, -50);
    this.scene.add(directionalLight2);

    const pointLight = new THREE.PointLight(0x4a9eff, 0.5, 500);
    pointLight.position.set(50, 50, 50);
    this.scene.add(pointLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  setVolumeData(volumeData: VolumeData): void {
    this.volumeData = volumeData;
    this.updateWireframeBox();
  }

  private updateWireframeBox(): void {
    if (this.wireframeBox) {
      this.scene.remove(this.wireframeBox);
    }

    if (!this.volumeData) return;

    const { dimensions, spacing } = this.volumeData;
    const width = dimensions.x * spacing.x;
    const height = dimensions.y * spacing.y;
    const depth = dimensions.z * spacing.z;

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ 
      color: 0x4a9eff, 
      transparent: true, 
      opacity: 0.5 
    });

    this.wireframeBox = new THREE.LineSegments(edges, material);
    this.wireframeBox.position.set(width / 2, height / 2, depth / 2);
    this.scene.add(this.wireframeBox);

    this.camera.position.set(width * 1.5, height * 1.2, depth * 1.5);
    this.controls.target.set(width / 2, height / 2, depth / 2);
    this.controls.update();
  }

  createVolumeMesh(meshData: MeshData, color: number = 0x4a9eff): void {
    if (this.volumeMesh) {
      this.scene.remove(this.volumeMesh);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));

    if (meshData.values) {
      geometry.setAttribute('value', new THREE.BufferAttribute(meshData.values, 1));
    }

    const material = new THREE.MeshPhongMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      shininess: 50,
      specular: 0x111111
    });

    this.volumeMesh = new THREE.Mesh(geometry, material);
    this.volumeMesh.castShadow = true;
    this.volumeMesh.receiveShadow = true;
    this.scene.add(this.volumeMesh);
  }

  createFractureMesh(meshData: MeshData): void {
    if (this.fractureMesh) {
      this.scene.remove(this.fractureMesh);
    }

    if (meshData.positions.length === 0) {
      return;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));

    if (meshData.values) {
      geometry.setAttribute('value', new THREE.BufferAttribute(meshData.values, 1));
      
      const colors = new Float32Array(meshData.positions.length);
      const colorMap = this.createColorMap();
      
      for (let i = 0; i < meshData.values.length; i++) {
        const value = meshData.values[i];
        const color = colorMap(value);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }

    const material = new THREE.MeshPhongMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      shininess: 100,
      specular: 0x333333,
      vertexColors: meshData.values ? true : false
    });

    this.fractureMesh = new THREE.Mesh(geometry, material);
    this.fractureMesh.castShadow = true;
    this.fractureMesh.receiveShadow = true;
    this.scene.add(this.fractureMesh);
  }

  private createColorMap(): (value: number) => { r: number; g: number; b: number } {
    return (value: number) => {
      const t = Math.max(0, Math.min(1, value));
      
      if (t < 0.25) {
        return { r: 0, g: t * 4, b: 1 };
      } else if (t < 0.5) {
        return { r: 0, g: 1, b: 1 - (t - 0.25) * 4 };
      } else if (t < 0.75) {
        return { r: (t - 0.5) * 4, g: 1, b: 0 };
      } else {
        return { r: 1, g: 1 - (t - 0.75) * 4, b: 0 };
      }
    };
  }

  setVolumeOpacity(opacity: number): void {
    if (this.volumeMesh) {
      (this.volumeMesh.material as THREE.MeshPhongMaterial).opacity = opacity;
    }
  }

  setFractureOpacity(opacity: number): void {
    if (this.fractureMesh) {
      (this.fractureMesh.material as THREE.MeshPhongMaterial).opacity = opacity;
    }
  }

  setVolumeVisible(visible: boolean): void {
    if (this.volumeMesh) {
      this.volumeMesh.visible = visible;
    }
  }

  setFractureVisible(visible: boolean): void {
    if (this.fractureMesh) {
      this.fractureMesh.visible = visible;
    }
  }

  setWireframeVisible(visible: boolean): void {
    if (this.wireframeBox) {
      this.wireframeBox.visible = visible;
    }
  }

  resetCamera(): void {
    if (!this.volumeData) return;

    const { dimensions, spacing } = this.volumeData;
    const width = dimensions.x * spacing.x;
    const height = dimensions.y * spacing.y;
    const depth = dimensions.z * spacing.z;

    this.camera.position.set(width * 1.5, height * 1.2, depth * 1.5);
    this.controls.target.set(width / 2, height / 2, depth / 2);
    this.controls.update();
  }

  setView(view: 'front' | 'side' | 'top' | '3d'): void {
    if (!this.volumeData) return;

    const { dimensions, spacing } = this.volumeData;
    const width = dimensions.x * spacing.x;
    const height = dimensions.y * spacing.y;
    const depth = dimensions.z * spacing.z;
    const maxDim = Math.max(width, height, depth);

    switch (view) {
      case 'front':
        this.camera.position.set(width / 2, height / 2, maxDim * 2);
        this.controls.target.set(width / 2, height / 2, depth / 2);
        break;
      case 'side':
        this.camera.position.set(maxDim * 2, height / 2, depth / 2);
        this.controls.target.set(width / 2, height / 2, depth / 2);
        break;
      case 'top':
        this.camera.position.set(width / 2, maxDim * 2, depth / 2);
        this.controls.target.set(width / 2, height / 2, depth / 2);
        break;
      case '3d':
        this.resetCamera();
        break;
    }
    this.controls.update();
  }

  addAxesHelper(size: number = 50): void {
    const axesHelper = new THREE.AxesHelper(size);
    this.scene.add(axesHelper);
  }

  addGridHelper(size: number = 100, divisions: number = 10): void {
    const gridHelper = new THREE.GridHelper(size, divisions, 0x444444, 0x222222);
    this.scene.add(gridHelper);
  }

  clearVolume(): void {
    if (this.volumeMesh) {
      this.scene.remove(this.volumeMesh);
      this.volumeMesh.geometry.dispose();
      (this.volumeMesh.material as THREE.Material).dispose();
      this.volumeMesh = null;
    }
  }

  clearFracture(): void {
    if (this.fractureMesh) {
      this.scene.remove(this.fractureMesh);
      this.fractureMesh.geometry.dispose();
      (this.fractureMesh.material as THREE.Material).dispose();
      this.fractureMesh = null;
    }
  }

  clearAll(): void {
    this.clearVolume();
    this.clearFracture();
    if (this.wireframeBox) {
      this.scene.remove(this.wireframeBox);
      this.wireframeBox = null;
    }
    this.volumeData = null;
  }

  getFractureMesh(): THREE.Mesh | null {
    return this.fractureMesh;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getControls(): OrbitControls {
    return this.controls;
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.clearAll();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
