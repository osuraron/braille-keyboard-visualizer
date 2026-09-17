import * as THREE from "three";
import { buildCell } from "../device/cell";
import type { DeviceMaterials, DeviceMetrics, ModeLayout, SideButtonSpec } from "../types";
import type { DotPosition } from "../config";

export abstract class DeviceMode {
  metrics: DeviceMetrics;
  layout: ModeLayout;

  constructor(metrics: Partial<DeviceMetrics> = {}) {
    this.metrics = {
      bodyDepth: metrics.bodyDepth ?? 2.4,
      bodyHeight: metrics.bodyHeight ?? 0.8,
      bodyWidth: metrics.bodyWidth ?? 2.5,
    };
    this.layout = this.createLayout();
  }

  abstract createLayout(): ModeLayout;
  abstract buildBody(materials: DeviceMaterials): THREE.Mesh;
  abstract getDotOffset(position: DotPosition): { x: number; z: number };

  createControlSurface(): THREE.Group {
    const controlSurface = new THREE.Group();
    controlSurface.position.y = this.layout.controlSurfacePositionY;
    controlSurface.rotation.x = this.layout.controlSurfaceRotationX;
    return controlSurface;
  }

  buildCell(
    state: { keyDia: number },
    materials: DeviceMaterials
  ): THREE.Group {
    return buildCell(state.keyDia, materials, {
      baseOffset: this.layout.dotBaseOffset,
      getDotOffset: this.getDotOffset.bind(this),
      rotationX: this.layout.dotRotationX,
    });
  }

  getSideBaseY(): number {
    return this.layout.sideBaseOffset || 0;
  }

  getSideButtonSpec(
    direction: number,
    bodyWidth: number,
    bodyDepth: number
  ): SideButtonSpec {
    const sideWidth = 0.34;
    const sideDepth = Math.min(bodyDepth * 0.62, 1.5);
    const offsetX = bodyWidth / 2 - sideWidth / 2 - 0.22;

    return {
      baseY: this.getSideBaseY(),
      depth: sideDepth,
      height: this.layout.sideHeight,
      offsetX: direction * offsetX,
      offsetZ: this.layout.sideOffsetZ || 0,
      rotationX: this.layout.sideRotationX,
      width: sideWidth,
    };
  }

  getTiltAngle(angleDeg?: number): number {
    return 0;
  }
}
