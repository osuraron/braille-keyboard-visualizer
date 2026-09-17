import * as THREE from "three";
import { KEY_HEIGHT, getDotOffset, type DotPosition } from "../config";
import { buildTriangularBody } from "../body/triangular-body";
import { DeviceMode } from "./base-mode";
import type { DeviceMaterials, ModeLayout } from "../types";

const BODY_DEPTH = 2.4;
const BODY_HEIGHT = 0.82;
const SIDE_HEIGHT = 0.2;
const SIDE_BASE_OFFSET = -0.3;
const SIDE_INDENT_FACTOR = 0.25;

export class TriangularMode extends DeviceMode {
  buildBody(materials: DeviceMaterials): THREE.Mesh {
    return buildTriangularBody(this.metrics, materials);
  }

  createLayout(): ModeLayout {
    return {
      bodyDepth: BODY_DEPTH,
      bodyHeight: BODY_HEIGHT,
      controlSurfacePositionY: BODY_HEIGHT / 2,
      controlSurfaceRotationX: Math.atan2(BODY_HEIGHT, BODY_DEPTH),
      dotBaseOffset: KEY_HEIGHT / 2,
      dotRotationX: 0,
      sideBaseOffset: SIDE_BASE_OFFSET,
      sideHeight: SIDE_HEIGHT,
      sideIndentFactor: SIDE_INDENT_FACTOR,
      sideOffsetZ: 0,
      sideRotationX: 0,
    };
  }

  override getTiltAngle(angleDeg: number = 0): number {
    return THREE.MathUtils.degToRad(angleDeg);
  }

  getDotOffset(position: DotPosition): { x: number; z: number } {
    return getDotOffset(position);
  }
}
