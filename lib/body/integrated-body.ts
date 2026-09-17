import * as THREE from "three";
import { extrudedSlab, roundedRectShape } from "../utils";
import type { DeviceMaterials, DeviceMetrics } from "../types";

export function buildIntegratedBody(
  metrics: DeviceMetrics,
  materials: DeviceMaterials
): THREE.Mesh {
  const body = new THREE.Mesh(
    extrudedSlab(
      roundedRectShape(metrics.bodyWidth, metrics.bodyDepth, 0.38),
      metrics.bodyHeight,
      0.07
    ),
    materials.body
  );
  body.castShadow = true;
  body.receiveShadow = true;

  return body;
}
