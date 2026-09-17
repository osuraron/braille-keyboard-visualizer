import * as THREE from "three";
import { extrudedSlab, roundedRectShape } from "../utils";
import type { DeviceMaterials } from "../types";
import type { DeviceMode } from "../mode/base-mode";

export interface BuildSideButtonsOptions {
  bodyDepth: number;
  bodyWidth: number;
  materials: DeviceMaterials;
  mode: DeviceMode;
  parent: THREE.Group;
  showSides: boolean;
}

export function buildSideButtons(options: BuildSideButtonsOptions): THREE.Mesh[] {
  const { bodyDepth, bodyWidth, materials, mode, parent, showSides } = options;
  const sideButtons: THREE.Mesh[] = [];

  if (!showSides) {
    return sideButtons;
  }

  [-1, 1].forEach((direction) => {
    const spec = mode.getSideButtonSpec(direction, bodyWidth, bodyDepth);
    const sideShape = roundedRectShape(
      spec.width,
      spec.depth,
      Math.min(spec.width, spec.depth) / 2
    );
    const sideGeometry = extrudedSlab(sideShape, spec.height, 0.025);
    const button = new THREE.Mesh(sideGeometry, materials.sideButton);
    button.castShadow = true;
    button.receiveShadow = true;
    button.rotation.x = spec.rotationX;
    button.position.set(spec.offsetX, spec.baseY, spec.offsetZ);
    button.userData = {
      baseY: spec.baseY,
      kind: direction === -1 ? "side-left" : "side-right",
      mountBaseY: spec.baseY,
      pressed: false,
      targetY: spec.baseY,
    };

    parent.add(button);
    sideButtons.push(button);
  });

  return sideButtons;
}

export function buildInteractiveTargets(
  cellsGroup: THREE.Group,
  sideButtons: THREE.Mesh[]
): THREE.Object3D[] {
  const targets: THREE.Object3D[] = [];

  cellsGroup.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      targets.push(object);
    }
  });

  sideButtons.forEach((button) => {
    targets.push(button);
  });

  return targets;
}

export function animateMeshY(mesh: THREE.Object3D, speed: number): void {
  if (typeof mesh.userData.targetY !== "number") {
    return;
  }

  const delta = mesh.userData.targetY - mesh.position.y;
  if (Math.abs(delta) < 0.001) {
    mesh.position.y = mesh.userData.targetY;
    return;
  }

  mesh.position.y += delta * speed;
}
