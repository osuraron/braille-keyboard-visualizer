import { THREE } from "../deps.js";
import { KEY_HEIGHT, getDotOffset } from "../config.js";
import { buildTriangularBody } from "./triangularBody.js";
import { DeviceMode } from "./mode.js";

const BODY_DEPTH = 2.4;
const BODY_HEIGHT = 0.82;
const SIDE_HEIGHT = 0.2;
const SIDE_BASE_OFFSET = -0.3;
const SIDE_INDENT_FACTOR = 0.25;

export class TriangularMode extends DeviceMode {
  buildBody(materials) {
    return buildTriangularBody(this.metrics, materials);
  }

  createLayout() {
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

  getTiltAngle(angleDeg) {
    return THREE.MathUtils.degToRad(angleDeg);
  }

  getDotOffset(position) {
    return getDotOffset(position);
  }
}
