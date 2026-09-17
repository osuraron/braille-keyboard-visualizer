import { ArcMode } from "./arc-mode";
import { HableMode } from "./hable-mode";
import { IntegratedMode } from "./integrated-mode";
import { TriangularMode } from "./triangular-mode";
import { DeviceMode } from "./base-mode";
import type { DeviceMetrics, ModeName } from "../types";

export { DeviceMode, ArcMode, HableMode, IntegratedMode, TriangularMode };

const MODE_CLASSES: Record<ModeName, new (metrics?: Partial<DeviceMetrics>) => DeviceMode> = Object.freeze({
  arc: ArcMode,
  hable: HableMode,
  integrated: IntegratedMode,
  triangular: TriangularMode,
});

export function createDeviceMode(mode: ModeName, metrics?: Partial<DeviceMetrics>): DeviceMode {
  const ModeClass = MODE_CLASSES[mode] || MODE_CLASSES.integrated;
  return new ModeClass(metrics);
}
