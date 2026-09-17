import * as THREE from "three";
import { buildIntegratedBody } from "../body/integrated-body";
import { DeviceMode } from "./base-mode";
import type { DeviceMaterials, ModeLayout, SideButtonSpec } from "../types";
import type { DotPosition } from "../config";

const BODY_DEPTH = 3.2;
const BODY_HEIGHT = 0.68;
const DOT_BASE_OFFSET = 0.8;
const SIDE_BASE_OFFSET = 0.2;
const SIDE_HEIGHT = 0.3;

const THUMB_OFFSET_X = 0.50;
const THUMB_OFFSET_Z = 1.10;
const THUMB_WIDTH = 0.90;
const THUMB_DEPTH = 0.40;

const HABLE_DOT_OFFSETS: Readonly<Record<number, { x: number; z: number }>> = Object.freeze({
  1: { x: -0.30, z: -0.55 },
  2: { x: -0.67, z: -0.02 },
  3: { x: -1.00, z:  0.52 },
  4: { x:  0.30, z: -0.55 },
  5: { x:  0.67, z: -0.02 },
  6: { x:  1.00, z:  0.52 },
});

export class HableMode extends DeviceMode {
  buildBody(materials: DeviceMaterials): THREE.Mesh {
    return buildIntegratedBody(this.metrics, materials);
  }

  createLayout(): ModeLayout {
    return {
      bodyDepth: BODY_DEPTH,
      bodyHeight: BODY_HEIGHT,
      controlSurfacePositionY: BODY_HEIGHT,
      controlSurfaceRotationX: 0,
      dotBaseOffset: DOT_BASE_OFFSET,
      dotRotationX: 0,
      sideBaseOffset: SIDE_BASE_OFFSET,
      sideHeight: SIDE_HEIGHT,
      sideIndentFactor: 1,
      sideOffsetZ: THUMB_OFFSET_Z,
      sideRotationX: 0,
    };
  }

  getDotOffset(position: DotPosition): { x: number; z: number } {
    return HABLE_DOT_OFFSETS[position.number];
  }

  override getSideButtonSpec(direction: number): SideButtonSpec {
    return {
      baseY: this.getSideBaseY(),
      depth: THUMB_DEPTH,
      height: SIDE_HEIGHT,
      offsetX: direction * THUMB_OFFSET_X,
      offsetZ: THUMB_OFFSET_Z,
      rotationX: 0,
      width: THUMB_WIDTH,
    };
  }

  override getTiltAngle(): number {
    return 0;
  }
}
