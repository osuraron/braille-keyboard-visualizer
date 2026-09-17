import * as THREE from "three";

export interface TextSpriteOptions {
  font?: string;
  color?: string;
  background?: string;
  padding?: number;
  radius?: number;
}

export function makeTextSprite(text: string, options?: TextSpriteOptions): THREE.Sprite {
  const {
    font = "700 54px system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    color = "#14161c",
    background = "rgba(255,255,255,0.94)",
    padding = 16,
    radius = 24,
  } = options || {};

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not acquire 2d context for text sprite");
  }

  context.font = font;
  const width = Math.ceil(context.measureText(text).width + padding * 2);
  const height = 84;

  canvas.width = width * 2;
  canvas.height = height * 2;

  context.scale(2, 2);
  context.font = font;
  context.textBaseline = "middle";
  context.fillStyle = background;
  context.beginPath();
  context.moveTo(radius, 0);
  context.arcTo(width, 0, width, height, radius);
  context.arcTo(width, height, 0, height, radius);
  context.arcTo(0, height, 0, 0, radius);
  context.arcTo(0, 0, width, 0, radius);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(20,24,35,0.1)";
  context.lineWidth = 1;
  context.stroke();

  context.fillStyle = color;
  context.fillText(text, padding, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  const scale = 0.0055;
  sprite.scale.set(width * scale, height * scale, 1);
  sprite.renderOrder = 999;

  return sprite;
}
