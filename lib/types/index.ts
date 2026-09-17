import type * as THREE from "three";

export type ModeName = "triangular" | "integrated" | "arc" | "hable";

export interface GeometrySettings {
  indent: number;
  angleDeg: number;
  keyDia: number;
}

export type ModeGeometryMap = Record<ModeName, GeometrySettings>;

export type KeyToDotMap = Record<string, number>;
export type SideKeysMap = Record<"left" | "right", string>;

export interface VisualiserSettings {
  mode: ModeName;
  modeGeometry: ModeGeometryMap;
  showSides: boolean;
  showNumbers: boolean;
  showLetters: boolean;
  keyToDot: KeyToDotMap;
  sideKeys: SideKeysMap;
}

export interface SceneSettings extends VisualiserSettings {
  indent: number;
  angleDeg: number;
  keyDia: number;
}

export type DotBinding = {
  type: "dot";
  id: number;
  label?: string;
};

export type SideBinding = {
  type: "side";
  id: "left" | "right";
  label?: string;
};

export type KeyBindingSpec = DotBinding | SideBinding;

export type CameraViewName = "ergonomic" | "top" | "side";
export type OrbitViewName = "top" | "left" | "right" | "bottom" | "front" | "back" | "iso";

export interface HudState {
  dots: number[];
  letter: string;
  typed: string;
}

export interface DeviceMetrics {
  bodyDepth: number;
  bodyHeight: number;
  bodyWidth: number;
}

export interface DeviceMaterials {
  body: THREE.MeshStandardMaterial;
  key: THREE.MeshStandardMaterial;
  keyActive: THREE.MeshStandardMaterial;
  sideButton: THREE.MeshStandardMaterial;
  sideButtonActive: THREE.MeshStandardMaterial;
}

export interface SideButtonSpec {
  baseY: number;
  depth: number;
  height: number;
  offsetX: number;
  offsetZ: number;
  rotationX: number;
  width: number;
}

export interface ModeLayout {
  bodyDepth: number;
  bodyHeight: number;
  controlSurfacePositionY: number;
  controlSurfaceRotationX: number;
  dotBaseOffset: number;
  dotRotationX: number;
  sideBaseOffset: number;
  sideHeight: number;
  sideIndentFactor: number;
  sideOffsetZ: number;
  sideRotationX: number;
}

export interface RuntimeInteractionState {
  activeDots: Set<number>;
  angleDeg: number;
  indent: number;
  kbHeld: Set<number>;
  keyDia: number;
  keyToDot: KeyToDotMap;
  mode: ModeName;
  showLetters: boolean;
  showNumbers: boolean;
  showSides: boolean;
  sideKeys: SideKeysMap;
  sidePressed: {
    left: boolean;
    right: boolean;
  };
  typed: string;
  wasKbChording: boolean;
}

export interface SceneController {
  camera: THREE.PerspectiveCamera;
  controls: any;
  dispose: () => void;
  getOrbitDirection: () => THREE.Vector3;
  getOrbitView: () => OrbitViewName;
  nudgeOrbit: (deltaAzimuth: number, deltaPolar: number) => void;
  orbitTo: (name: OrbitViewName) => void;
  render: () => void;
  renderer: THREE.WebGLRenderer;
  resize: () => void;
  root: THREE.Group;
  scene: THREE.Scene;
  setTarget: (target: THREE.Vector3) => void;
  setView: (name: CameraViewName) => void;
}

export interface DeviceController {
  applyIndent: () => void;
  applyOverlays: () => void;
  buildDevice: () => void;
  dispose: () => void;
  getFocusTarget: () => THREE.Vector3;
  pickObject: (
    raycaster: THREE.Raycaster,
    camera: THREE.Camera,
    pointer: THREE.Vector2
  ) => THREE.Object3D | null;
  restoreSideVisuals: (snapToTarget?: boolean) => void;
  setDotPressed: (number: number, pressed: boolean) => void;
  updateAnimations: () => void;
}

export interface InteractionController {
  appendSpace: () => void;
  backspace: () => void;
  clearChord: () => void;
  commitChord: () => void;
  dispose: () => void;
  pressDot: (number: number, options?: { skipStatePublish?: boolean }) => boolean;
  releaseDot: (number: number, options?: { skipStatePublish?: boolean }) => boolean;
  toggleDot: (number: number) => void;
}

export interface SceneApi {
  orbitTo: (view: OrbitViewName) => void;
  saveScreenshot: () => void;
  setView: (view: CameraViewName) => void;
}
