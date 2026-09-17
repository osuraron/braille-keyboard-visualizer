import * as THREE from "three";
import { CELL_WIDTH, KEY_RISE_MAX, LETTER_TO_DOTS, PRESS_DEPTH } from "../config";
import { disposeGroup } from "../utils";
import {
  animateMeshY,
  buildInteractiveTargets,
  buildSideButtons,
  createDeviceMaterials,
} from "../body";
import { ARC_HALF_GAP_X } from "../mode/arc-mode";
import { createDeviceMode, DeviceMode } from "../mode";
import type {
  DeviceController,
  DeviceMaterials,
  DeviceMetrics,
  RuntimeInteractionState,
} from "../types";

const SIDE_BUTTON_PRESS_DEPTH = 0.05;

interface BuiltDevice {
  cellsGroup: THREE.Group;
  interactiveTargets: THREE.Object3D[];
  metrics: DeviceMetrics;
  mode: DeviceMode;
  sideButtons: THREE.Mesh[];
}

export function createDeviceController({
  root,
  state,
}: {
  root: THREE.Group;
  state: RuntimeInteractionState;
}): DeviceController {
  const materials = createDeviceMaterials();
  const bounds = new THREE.Box3();
  const focusTarget = new THREE.Vector3();
  let built: BuiltDevice | null = null;

  return {
    applyIndent,
    applyOverlays,
    buildDevice,
    dispose,
    getFocusTarget,
    pickObject,
    restoreSideVisuals,
    setDotPressed,
    updateAnimations,
  };

  function dispose(): void {
    disposeGroup(root);
    Object.values(materials).forEach((material) => {
      material.dispose();
    });
    built = null;
  }

  function buildDevice(): void {
    disposeGroup(root);

    const mode = createDeviceMode(state.mode);
    const metrics = getDeviceMetrics(state, mode);
    mode.metrics = metrics;
    const deck = new THREE.Group();
    deck.add(mode.buildBody(materials));

    const controlSurface = mode.createControlSurface();
    deck.add(controlSurface);

    const cellsGroup = buildCellsGroup(state, materials, mode);
    controlSurface.add(cellsGroup);

    const sideButtons = buildSideButtons({
      bodyDepth: metrics.bodyDepth,
      bodyWidth: metrics.bodyWidth,
      materials,
      mode,
      parent: controlSurface,
      showSides: state.showSides,
    });

    const pivot = buildPivot(deck, metrics.bodyDepth, mode, state.angleDeg);
    root.add(pivot);

    built = {
      cellsGroup,
      interactiveTargets: buildInteractiveTargets(cellsGroup, sideButtons),
      metrics,
      mode,
      sideButtons,
    };

    syncBuiltDevice();
  }

  function applyIndent(): void {
    if (!built) {
      return;
    }

    const rise = state.indent * KEY_RISE_MAX;
    const scaleY = getDotScaleY(state.indent);
    const showCap = state.indent >= -0.2;
    const dotBaseOffset = built.mode.layout.dotBaseOffset;

    forEachDot((dot) => {
      dot.userData.baseY = dotBaseOffset + rise;
      dot.userData.targetY = getDotTargetY(dot.userData.baseY, dot.userData.pressed);
      dot.scale.y = scaleY;

      if (dot.userData.cap) {
        dot.userData.cap.visible = showCap;
      }
    });

    built.sideButtons.forEach((button) => {
      const indentFactor = built!.mode.layout.sideIndentFactor;
      button.userData.baseY = button.userData.mountBaseY + rise * indentFactor;
      button.userData.targetY = button.userData.pressed
        ? button.userData.baseY - SIDE_BUTTON_PRESS_DEPTH
        : button.userData.baseY;
    });
  }

  function applyOverlays(): void {
    if (!built) {
      return;
    }

    forEachCell((cell) => {
      setCellOverlayVisibility(cell, state);
    });

    refreshAllDots();
  }

  function updateAnimations(): void {
    if (!built) {
      return;
    }

    forEachDot((dot) => {
      animateMeshY(dot, 0.28);
    });

    built.sideButtons.forEach((button) => {
      animateMeshY(button, 0.32);
    });
  }

  function setDotPressed(number: number, pressed: boolean): void {
    if (!built) {
      return;
    }

    forEachDotWithNumber(number, (dot, cell) => {
      syncDotPressState(dot, pressed);
      refreshDot(dot, cell);
    });
  }

  function restoreSideVisuals(snapToTarget?: boolean): void {
    if (!built) {
      return;
    }

    built.sideButtons.forEach((button) => {
      const side = button.userData.kind === "side-left" ? "left" : "right";
      syncSideButton(button, state.sidePressed[side], materials, snapToTarget);
    });
  }

  function pickObject(
    raycaster: THREE.Raycaster,
    camera: THREE.Camera,
    pointer: THREE.Vector2
  ): THREE.Object3D | null {
    if (!built) {
      return null;
    }

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(built.interactiveTargets, false);
    if (hits.length === 0) {
      return null;
    }

    let object: THREE.Object3D | null = hits[0].object;
    while (object && !(object.userData && object.userData.kind)) {
      object = object.parent;
    }

    return object && object.userData && object.userData.kind ? object : null;
  }

  function getFocusTarget(): THREE.Vector3 {
    if (!built) {
      return new THREE.Vector3();
    }

    root.updateWorldMatrix(true, true);
    bounds.setFromObject(root);

    if (bounds.isEmpty()) {
      return new THREE.Vector3();
    }

    bounds.getCenter(focusTarget);
    return focusTarget.clone();
  }

  function syncBuiltDevice(): void {
    applyIndent();
    restoreDotVisuals(true);
    applyOverlays();
    restoreSideVisuals(true);
  }

  function restoreDotVisuals(snapToTarget?: boolean): void {
    if (!built) {
      return;
    }

    forEachDot((dot, cell) => {
      const pressed = state.activeDots.has(dot.userData.number);
      syncDotPressState(dot, pressed);

      if (snapToTarget) {
        dot.position.y = dot.userData.targetY;
      }

      refreshDot(dot, cell);
    });
  }

  function refreshAllDots(): void {
    if (!built) {
      return;
    }

    forEachDot((dot, cell) => {
      refreshDot(dot, cell);
    });
  }

  function refreshDot(dot: THREE.Mesh, cell: THREE.Group): void {
    const material = getDotMaterial(dot, cell, materials, state);
    dot.material = material;

    if (dot.userData.cap) {
      dot.userData.cap.material = material;
    }
  }

  function forEachCell(callback: (cell: THREE.Group) => void): void {
    built!.cellsGroup.children.forEach((child) => callback(child as THREE.Group));
  }

  function forEachDot(callback: (dot: THREE.Mesh, cell: THREE.Group) => void): void {
    forEachCell((cell) => {
      (cell.userData.dots as THREE.Mesh[]).forEach((dot) => {
        callback(dot, cell);
      });
    });
  }

  function forEachDotWithNumber(
    number: number,
    callback: (dot: THREE.Mesh, cell: THREE.Group) => void
  ): void {
    forEachDot((dot, cell) => {
      if (dot.userData.number === number) {
        callback(dot, cell);
      }
    });
  }
}

function getDeviceMetrics(
  state: RuntimeInteractionState,
  mode: DeviceMode
): DeviceMetrics {
  const sidePadding = getSidePadding(state);

  return {
    bodyDepth: mode.layout.bodyDepth,
    bodyHeight: mode.layout.bodyHeight,
    bodyWidth: CELL_WIDTH + sidePadding * 2 + 0.3,
  };
}

function buildCellsGroup(
  state: RuntimeInteractionState,
  materials: DeviceMaterials,
  mode: DeviceMode
): THREE.Group {
  const cellsGroup = new THREE.Group();
  cellsGroup.add(mode.buildCell(state, materials));
  return cellsGroup;
}

function getSidePadding(state: RuntimeInteractionState): number {
  if (!state.showSides) {
    return 0.45;
  }

  if (state.mode === "arc") {
    const arcBodySidePadding = 1.31 + ARC_HALF_GAP_X;
    return arcBodySidePadding;
  }

  if (state.mode === "hable") {
    return 0.75;
  }

  return 1.1;
}

function buildPivot(
  deck: THREE.Group,
  bodyDepth: number,
  mode: DeviceMode,
  angleDeg: number
): THREE.Group {
  const tiltAngle = mode.getTiltAngle(angleDeg);
  const pivot = new THREE.Group();
  const frontZ = bodyDepth / 2;

  deck.position.z = -frontZ;
  pivot.position.set(0, 0, frontZ);
  pivot.add(deck);
  pivot.rotation.x = -tiltAngle;

  return pivot;
}

function setCellOverlayVisibility(
  cell: THREE.Group,
  state: RuntimeInteractionState
): void {
  (cell.userData.labels as THREE.Sprite[]).forEach((label) => {
    label.visible = state.showNumbers;
  });

  if (cell.userData.letterLabel) {
    (cell.userData.letterLabel as THREE.Sprite).visible = state.showLetters;
  }
}

function syncDotPressState(dot: THREE.Mesh, pressed: boolean): void {
  dot.userData.pressed = pressed;
  dot.userData.targetY = getDotTargetY(dot.userData.baseY, pressed);
}

function getDotTargetY(baseY: number, pressed: boolean): number {
  return pressed ? baseY - PRESS_DEPTH : baseY;
}

function getDotScaleY(indent: number): number {
  const flatten = indent < 0 ? 1 + indent * 0.4 : 1;
  return Math.max(0.4, flatten);
}

function getDotMaterial(
  dot: THREE.Mesh,
  cell: THREE.Group,
  materials: DeviceMaterials,
  state: RuntimeInteractionState
): THREE.MeshStandardMaterial {
  if (dot.userData.pressed) {
    return materials.keyActive;
  }

  if (!state.showLetters) {
    return materials.key;
  }

  const activeDots = LETTER_TO_DOTS[cell.userData.letter] || [];
  return activeDots.includes(dot.userData.number) ? materials.keyActive : materials.key;
}

function syncSideButton(
  button: THREE.Mesh,
  pressed: boolean,
  materials: DeviceMaterials,
  snapToTarget?: boolean
): void {
  button.userData.pressed = pressed;
  button.userData.targetY = pressed
    ? button.userData.baseY - SIDE_BUTTON_PRESS_DEPTH
    : button.userData.baseY;
  button.material = pressed ? materials.sideButtonActive : materials.sideButton;

  if (snapToTarget) {
    button.position.y = button.userData.targetY;
  }
}
