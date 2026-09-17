import * as THREE from "three";
import { BRAILLE_MAP } from "../config";
import type {
  DeviceController,
  HudState,
  InteractionController,
  RuntimeInteractionState,
  SceneController,
} from "../types";

const EMPTY_DISPLAY = "—";
const SIDE_HOLD_MS = 180;
const TAP_MOVE_THRESHOLD = 8;

export interface CreateInteractionControllerOptions {
  canvas: HTMLCanvasElement;
  device: DeviceController;
  sceneController: SceneController;
  state: RuntimeInteractionState;
  onStateChange: (hud: HudState) => void;
}

export function createInteractionController({
  canvas,
  device,
  sceneController,
  state,
  onStateChange,
}: CreateInteractionControllerOptions): InteractionController {
  const abortController = new AbortController();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const sideHoldTimers: Record<"left" | "right", number | null> = {
    left: null,
    right: null,
  };
  const pointerSession = {
    id: null as number | null,
    moved: false,
    startX: 0,
    startY: 0,
  };

  bindKeyboardEvents();
  bindPointerEvents();
  publishState();

  return {
    appendSpace,
    backspace,
    clearChord,
    commitChord,
    dispose,
    pressDot,
    releaseDot,
    toggleDot,
  };

  function listen<K extends keyof WindowEventMap>(
    target: Window,
    eventName: K,
    handler: (ev: WindowEventMap[K]) => any
  ): void;
  function listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    eventName: K,
    handler: (ev: HTMLElementEventMap[K]) => any
  ): void;
  function listen(
    target: EventTarget,
    eventName: string,
    handler: EventListenerOrEventListenerObject
  ): void {
    target.addEventListener(eventName, handler, { signal: abortController.signal });
  }

  function dispose(): void {
    abortController.abort();
    clearSideHoldTimer("left");
    clearSideHoldTimer("right");
    canvas.classList.remove("hit");
  }

  function pressDot(number: number, options?: { skipStatePublish?: boolean }): boolean {
    return setDotActive(number, true, options);
  }

  function releaseDot(number: number, options?: { skipStatePublish?: boolean }): boolean {
    return setDotActive(number, false, options);
  }

  function toggleDot(number: number): void {
    if (state.activeDots.has(number)) {
      releaseDot(number);
      return;
    }

    pressDot(number);
  }

  function setDotActive(
    number: number,
    pressed: boolean,
    options?: { skipStatePublish?: boolean }
  ): boolean {
    const shouldPublish = !(options && options.skipStatePublish);
    const isActive = state.activeDots.has(number);

    if (pressed === isActive) {
      return false;
    }

    if (pressed) {
      state.activeDots.add(number);
    } else {
      state.activeDots.delete(number);
    }

    device.setDotPressed(number, pressed);

    if (shouldPublish) {
      publishState();
    }

    return true;
  }

  function pressSide(side: "left" | "right"): void {
    clearSideHoldTimer(side);
    state.sidePressed[side] = true;
    device.restoreSideVisuals();
  }

  function releaseSide(side: "left" | "right", shouldTriggerAction?: boolean): void {
    clearSideHoldTimer(side);

    const wasPressed = state.sidePressed[side];
    state.sidePressed[side] = false;
    device.restoreSideVisuals();

    if (!wasPressed || !shouldTriggerAction) {
      return;
    }

    if (side === "left") {
      backspace();
      return;
    }

    appendSpace();
  }

  function backspace(): void {
    if (state.typed.length === 0) {
      return;
    }

    state.typed = state.typed.slice(0, -1);
    publishState();
  }

  function appendSpace(): void {
    state.typed += " ";
    publishState();
  }

  function activeChordString(): string {
    return Array.from(state.activeDots)
      .sort((a, b) => a - b)
      .join("");
  }

  function commitChord(): void {
    const chord = activeChordString();
    if (!chord) {
      return;
    }

    state.typed += BRAILLE_MAP[chord] || formatUnknownChord(chord);
    clearChord();
  }

  function clearChord(): void {
    Array.from(state.activeDots).forEach((number) => {
      releaseDot(number, { skipStatePublish: true });
    });

    state.kbHeld.clear();
    state.wasKbChording = false;
    publishState();
  }

  function publishState(): void {
    const dots = Array.from(state.activeDots).sort((a, b) => a - b);
    const chord = dots.join("");
    const letter = BRAILLE_MAP[chord];

    onStateChange({
      dots,
      letter: letter || (dots.length ? "?" : EMPTY_DISPLAY),
      typed: state.typed,
    });
  }

  function bindKeyboardEvents(): void {
    listen(window, "keydown", handleKeydown);
    listen(window, "keyup", handleKeyup);
    listen(window, "blur", handleWindowBlur);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (isTypingContext() || event.repeat) {
      return;
    }

    const key = normaliseKeyboardKey(event);

    if (handleDotKeydown(key, event)) {
      return;
    }

    if (handleSideKeydown(key, event)) {
      return;
    }

    handleCommandKeydown(key, event);
  }

  function handleKeyup(event: KeyboardEvent): void {
    const key = normaliseKeyboardKey(event);

    if (handleDotKeyup(key)) {
      return;
    }

    handleSideKeyup(key);
  }

  function handleWindowBlur(): void {
    clearChord();
    releaseSide("left", false);
    releaseSide("right", false);
  }

  function handleDotKeydown(key: string, event: KeyboardEvent): boolean {
    const dot = state.keyToDot[key];
    if (dot === undefined) {
      return false;
    }

    if (!state.kbHeld.has(dot)) {
      state.kbHeld.add(dot);
      state.wasKbChording = true;
      pressDot(dot);
    }

    event.preventDefault();
    return true;
  }

  function handleDotKeyup(key: string): boolean {
    const dot = state.keyToDot[key];
    if (dot === undefined) {
      return false;
    }

    state.kbHeld.delete(dot);

    if (state.kbHeld.size === 0 && state.wasKbChording) {
      state.wasKbChording = false;
      commitChord();
    }

    return true;
  }

  function handleSideKeydown(key: string, event: KeyboardEvent): boolean {
    const side = getSideForKey(state.sideKeys, key);
    if (!side) {
      return false;
    }

    pressSide(side);
    event.preventDefault();
    return true;
  }

  function handleSideKeyup(key: string): boolean {
    const side = getSideForKey(state.sideKeys, key);
    if (!side) {
      return false;
    }

    releaseSide(side, true);
    return true;
  }

  function handleCommandKeydown(key: string, event: KeyboardEvent): void {
    if (key === " ") {
      if (state.activeDots.size > 0) {
        commitChord();
      } else {
        appendSpace();
      }
      event.preventDefault();
      return;
    }

    if (key === "Escape") {
      clearChord();
      event.preventDefault();
      return;
    }

    if (key === "Backspace") {
      backspace();
      event.preventDefault();
    }
  }

  function bindPointerEvents(): void {
    listen(canvas, "pointerdown", handlePointerDown);
    listen(canvas, "pointermove", handlePointerMove);
    listen(canvas, "pointerup", handlePointerUp);
    listen(canvas, "pointercancel", handlePointerCancel);
    listen(canvas, "pointerleave", handlePointerLeave);
  }

  function handlePointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    pointerSession.id = event.pointerId;
    pointerSession.moved = false;
    pointerSession.startX = event.clientX;
    pointerSession.startY = event.clientY;
  }

  function handlePointerMove(event: PointerEvent): void {
    if (pointerSession.id === event.pointerId) {
      const deltaX = event.clientX - pointerSession.startX;
      const deltaY = event.clientY - pointerSession.startY;
      pointerSession.moved =
        pointerSession.moved ||
        Math.hypot(deltaX, deltaY) > TAP_MOVE_THRESHOLD;
    }

    if (event.buttons !== 0) {
      canvas.classList.remove("hit");
      return;
    }

    const object = pickAtEvent(event);
    canvas.classList.toggle("hit", Boolean(object));
  }

  function handlePointerUp(event: PointerEvent): void {
    const isTrackedPointer = pointerSession.id === event.pointerId;
    const shouldActivate =
      isTrackedPointer && !pointerSession.moved && event.button === 0;

    resetPointerSession();
    canvas.classList.remove("hit");

    if (!shouldActivate) {
      return;
    }

    const object = pickAtEvent(event);
    if (!object) {
      return;
    }

    if (object.userData.kind === "dot") {
      toggleDot(object.userData.number);
      event.stopPropagation();
      return;
    }

    const side = getSideFromObject(object);
    if (!side) {
      return;
    }

    pressSide(side);
    sideHoldTimers[side] = window.setTimeout(() => {
      releaseSide(side, true);
    }, SIDE_HOLD_MS);
    event.stopPropagation();
  }

  function handlePointerCancel(): void {
    resetPointerSession();
    canvas.classList.remove("hit");
  }

  function handlePointerLeave(event: PointerEvent): void {
    if (event.buttons === 0) {
      canvas.classList.remove("hit");
    }
  }

  function pickAtEvent(event: PointerEvent): THREE.Object3D | null {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    return device.pickObject(raycaster, sceneController.camera, pointer);
  }

  function resetPointerSession(): void {
    pointerSession.id = null;
    pointerSession.moved = false;
    pointerSession.startX = 0;
    pointerSession.startY = 0;
  }

  function clearSideHoldTimer(side: "left" | "right"): void {
    if (sideHoldTimers[side] === null) {
      return;
    }

    window.clearTimeout(sideHoldTimers[side] as number);
    sideHoldTimers[side] = null;
  }
}

function formatUnknownChord(chord: string): string {
  return "[" + chord.split("").join(",") + "]";
}

function getSideFromObject(object: THREE.Object3D): "left" | "right" | "" {
  if (object.userData.kind === "side-left") {
    return "left";
  }

  if (object.userData.kind === "side-right") {
    return "right";
  }

  return "";
}

function normaliseKeyboardKey(event: KeyboardEvent): string {
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

function getSideForKey(
  sideKeys: Record<"left" | "right", string>,
  key: string
): "left" | "right" | "" {
  const entry = (Object.entries(sideKeys) as ["left" | "right", string][]).find(
    (item) => item[1] === key
  );
  return entry ? entry[0] : "";
}

function isTypingContext(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) {
    return false;
  }

  const tagName = activeElement.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    (activeElement as HTMLElement).isContentEditable
  );
}
