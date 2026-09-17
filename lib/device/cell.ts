import * as THREE from "three";
import { DOT_POSITIONS, KEY_HEIGHT, type DotPosition } from "../config";
import { makeTextSprite } from "../utils";
import type { DeviceMaterials } from "../types";

export interface BuildCellOptions {
  baseOffset?: number;
  rotationX?: number;
  getDotOffset?: (position: DotPosition) => { x: number; z: number };
}

export function buildCell(
  keyDiameter: number,
  materials: DeviceMaterials,
  options?: BuildCellOptions
): THREE.Group {
  const cell = new THREE.Group();
  cell.userData = { dots: [] as THREE.Mesh[], labels: [] as THREE.Sprite[], letter: "A", letterLabel: null };

  const radius = keyDiameter / 2;
  const baseOffset = options && typeof options.baseOffset === "number"
    ? options.baseOffset
    : KEY_HEIGHT / 2;
  const rotationX = options && typeof options.rotationX === "number"
    ? options.rotationX
    : 0;
  const resolveDotOffset = options && typeof options.getDotOffset === "function"
    ? options.getDotOffset
    : () => ({ x: 0, z: 0 });

  DOT_POSITIONS.forEach((position) => {
    const offset = resolveDotOffset(position);
    const key = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, KEY_HEIGHT, 48, 1, false),
      materials.key
    );
    key.castShadow = true;
    key.receiveShadow = true;
    key.rotation.x = rotationX;

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      materials.key
    );
    cap.scale.y = 0.18;
    cap.position.y = KEY_HEIGHT / 2;
    cap.castShadow = true;
    cap.receiveShadow = true;
    key.add(cap);

    key.position.set(offset.x, baseOffset, offset.z);
    key.userData = {
      baseY: baseOffset,
      cap,
      kind: "dot",
      number: position.number,
      pressed: false,
      targetY: baseOffset,
    };
    cell.add(key);
    cell.userData.dots.push(key);

    const numberLabel = makeTextSprite(String(position.number), {
      background: "rgba(255,255,255,0.96)",
      color: "#14161c",
      font: "800 44px system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    });
    numberLabel.position.set(offset.x, 0.6, offset.z);
    numberLabel.visible = false;
    cell.add(numberLabel);
    cell.userData.labels.push(numberLabel);
  });

  const letterSprite = makeTextSprite("A", {
    background: "rgba(32,36,46,0.94)",
    color: "#ffffff",
    font: "800 52px system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  });
  letterSprite.position.set(0, 0.6, 0.85);
  letterSprite.visible = false;
  cell.add(letterSprite);
  cell.userData.letterLabel = letterSprite;

  return cell;
}
