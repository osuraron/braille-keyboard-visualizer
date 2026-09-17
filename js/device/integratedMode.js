import { getDotOffset } from "../config.js";
import { buildIntegratedBody } from "./integratedBody.js";
import { DeviceMode } from "./mode.js";

const BODY_DEPTH = 2.4;
const BODY_HEIGHT = 0.68;
const SIDE_HEIGHT = 0.3;
const DOT_BASE_OFFSET = 0.6;
const INTEGRATED_DOT_OFFSET_Y = 0.2;
const SIDE_BASE_OFFSET = 0.2;

export class IntegratedMode extends DeviceMode {
  buildBody(materials) {
    return buildIntegratedBody(this.metrics, materials);
  }

  createLayout() {
    return {
      bodyDepth: BODY_DEPTH,
      bodyHeight: BODY_HEIGHT,
      controlSurfacePositionY: BODY_HEIGHT,
      controlSurfaceRotationX: 0,
      dotBaseOffset: DOT_BASE_OFFSET + INTEGRATED_DOT_OFFSET_Y,
      dotRotationX: 0,
      sideBaseOffset: SIDE_BASE_OFFSET,
      sideHeight: SIDE_HEIGHT,
      sideIndentFactor: 1,
      sideOffsetZ: 0,
      sideRotationX: 0,
    };
  }

  getTiltAngle() {
    return 0;
  }

  getDotOffset(position) {
    return getDotOffset(position);
  }
}
