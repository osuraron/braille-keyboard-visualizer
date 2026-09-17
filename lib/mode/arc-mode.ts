import * as THREE from "three";
import { buildIntegratedBody } from "../body/integrated-body";
import { DeviceMode } from "./base-mode";
import type { DeviceMaterials, ModeLayout, SideButtonSpec } from "../types";
import type { DotPosition } from "../config";

const BODY_DEPTH = 3.9;
const BODY_HEIGHT = 0.68;
const DOT_BASE_OFFSET = 0.8;
const SIDE_BASE_OFFSET = 0.2;
const SIDE_HEIGHT = 0.3;
export const ARC_HALF_GAP_X = 0.14;
export const ARC_THUMB_BASE_X = 0.82;
const DOT_TO_THUMB_GAP = 0.68;

const ARC_DOT_OFFSETS: Readonly<Record<number, { x: number; z: number }>> = Object.freeze({
  1: { x: -0.36 - ARC_HALF_GAP_X, z: 0.92 },
  2: { x: -0.74 - ARC_HALF_GAP_X, z: 0.46 },
  3: { x: -1.02 - ARC_HALF_GAP_X, z: -0.14 },
  4: { x: 0.36 + ARC_HALF_GAP_X, z: 0.92 },
  5: { x: 0.74 + ARC_HALF_GAP_X, z: 0.46 },
  6: { x: 1.02 + ARC_HALF_GAP_X, z: -0.14 },
});
const THUMB_ROW_OFFSET_Z = ARC_DOT_OFFSETS[3].z - DOT_TO_THUMB_GAP;

export class ArcMode extends DeviceMode {
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
      sideOffsetZ: THUMB_ROW_OFFSET_Z,
      sideRotationX: 0,
    };
  }

  getDotOffset(position: DotPosition): { x: number; z: number } {
    return ARC_DOT_OFFSETS[position.number];
  }

  override getSideButtonSpec(
    direction: number,
    bodyWidth: number,
    bodyDepth: number
  ): SideButtonSpec {
    const spec = super.getSideButtonSpec(direction, bodyWidth, bodyDepth);

    return {
      ...spec,
      depth: spec.width,
      offsetX: direction * (ARC_THUMB_BASE_X + ARC_HALF_GAP_X),
      offsetZ: THUMB_ROW_OFFSET_Z,
      rotationX: 0,
      width: spec.depth,
    };
  }

  override getTiltAngle(): number {
    return 0;
  }
}
