"use client";

import React, { useEffect, useRef, useState } from "react";
import { createDeviceController } from "../../device";
import { createInteractionController } from "../../interaction";
import { createScene } from "../../scene";
import { OrbitGizmo, type OrbitGizmoHandle } from "./OrbitGizmo";
import type {
  DeviceController,
  HudState,
  InteractionController,
  RuntimeInteractionState,
  SceneApi,
  SceneController,
  SceneSettings,
} from "../../types";

export interface KeyboardSceneProps {
  settings: SceneSettings;
  sceneApiRef: React.MutableRefObject<SceneApi | null>;
  onInteractionChange: (hud: HudState) => void;
  onReady: (ready: boolean) => void;
}

export function KeyboardScene({
  settings,
  sceneApiRef,
  onInteractionChange,
  onReady,
}: KeyboardSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneControllerRef = useRef<SceneController | null>(null);
  const deviceRef = useRef<DeviceController | null>(null);
  const runtimeStateRef = useRef<RuntimeInteractionState | null>(null);
  const previousSettingsRef = useRef<SceneSettings | null>(null);
  const orbitGizmoRef = useRef<OrbitGizmoHandle | null>(null);
  const onInteractionChangeRef = useRef(onInteractionChange);
  const onReadyRef = useRef(onReady);
  const [isWebglUnavailable, setIsWebglUnavailable] = useState(false);

  useEffect(() => {
    onInteractionChangeRef.current = onInteractionChange;
  }, [onInteractionChange]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    if (!supportsWebGL()) {
      setIsWebglUnavailable(true);
      return undefined;
    }

    const state = createRuntimeState(settings);
    let sceneController: SceneController;

    try {
      sceneController = createScene(canvas);
    } catch {
      setIsWebglUnavailable(true);
      return undefined;
    }

    const device = createDeviceController({
      root: sceneController.root,
      state,
    });
    const interaction: InteractionController = createInteractionController({
      canvas,
      device,
      sceneController,
      state,
      onStateChange: (nextHud) => {
        onInteractionChangeRef.current(nextHud);
      },
    });

    sceneControllerRef.current = sceneController;
    deviceRef.current = device;
    runtimeStateRef.current = state;
    previousSettingsRef.current = { ...settings };

    device.buildDevice();
    sceneController.setTarget(device.getFocusTarget());

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        sceneController.resize();
      });
      resizeObserver.observe(canvas);
    }

    let animationFrame = 0;
    let isMounted = true;

    function tick() {
      if (!isMounted) {
        return;
      }

      device.updateAnimations();
      sceneController.render();
      orbitGizmoRef.current?.sync(sceneController);
      animationFrame = window.requestAnimationFrame(tick);
    }

    tick();
    onReadyRef.current(true);

    sceneApiRef.current = {
      orbitTo: (view) => {
        sceneController.orbitTo(view);
      },
      saveScreenshot: () => {
        saveCanvasScreenshot(canvas, settings.mode);
      },
      setView: (view) => {
        sceneController.setView(view);
      },
    };

    return () => {
      isMounted = false;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      sceneApiRef.current = null;
      onReadyRef.current(false);
      interaction.dispose();
      device.dispose();
      sceneController.dispose();
      sceneControllerRef.current = null;
      deviceRef.current = null;
      runtimeStateRef.current = null;
      previousSettingsRef.current = null;
    };
  }, []);

  useEffect(() => {
    const device = deviceRef.current;
    const sceneController = sceneControllerRef.current;
    const runtimeState = runtimeStateRef.current;
    const previousSettings = previousSettingsRef.current;

    if (!device || !sceneController || !runtimeState || !previousSettings) {
      return;
    }

    const modeChanged = previousSettings.mode !== settings.mode;
    const angleChanged = previousSettings.angleDeg !== settings.angleDeg;
    const keyDiaChanged = previousSettings.keyDia !== settings.keyDia;
    const sidesChanged = previousSettings.showSides !== settings.showSides;
    const indentChanged = previousSettings.indent !== settings.indent;
    const numbersChanged = previousSettings.showNumbers !== settings.showNumbers;
    const lettersChanged = previousSettings.showLetters !== settings.showLetters;
    const keyToDotChanged = shallowCompareKeys(previousSettings.keyToDot, settings.keyToDot);
    const sideKeysChanged = shallowCompareKeys(previousSettings.sideKeys, settings.sideKeys);

    runtimeState.mode = settings.mode;
    runtimeState.angleDeg = settings.angleDeg;
    runtimeState.keyDia = settings.keyDia;
    runtimeState.showSides = settings.showSides;
    runtimeState.indent = settings.indent;
    runtimeState.showNumbers = settings.showNumbers;
    runtimeState.showLetters = settings.showLetters;
    runtimeState.keyToDot = { ...settings.keyToDot };
    runtimeState.sideKeys = { ...settings.sideKeys };

    if (modeChanged || angleChanged || keyDiaChanged || sidesChanged) {
      device.buildDevice();
      sceneController.setTarget(device.getFocusTarget());
    } else {
      if (indentChanged) {
        device.applyIndent();
      }

      if (numbersChanged || lettersChanged) {
        device.applyOverlays();
      }
    }

    if (keyToDotChanged || sideKeysChanged) {
      device.restoreSideVisuals();
    }

    previousSettingsRef.current = { ...settings };
  }, [settings]);

  if (isWebglUnavailable) {
    return (
      <div className="scene-fallback" role="alert">
        <h2>WebGL is unavailable</h2>
        <p>
          Your browser or device does not appear to support hardware-accelerated 3D graphics.
          Try enabling hardware acceleration in your browser settings.
        </p>
      </div>
    );
  }

  return (
    <div className="scene-viewport">
      <canvas className="scene-canvas" ref={canvasRef} />
      <OrbitGizmo ref={orbitGizmoRef} sceneControllerRef={sceneControllerRef} />
    </div>
  );
}

function createRuntimeState(settings: SceneSettings): RuntimeInteractionState {
  return {
    activeDots: new Set<number>(),
    angleDeg: settings.angleDeg,
    indent: settings.indent,
    kbHeld: new Set<number>(),
    keyDia: settings.keyDia,
    keyToDot: { ...settings.keyToDot },
    mode: settings.mode,
    showLetters: settings.showLetters,
    showNumbers: settings.showNumbers,
    showSides: settings.showSides,
    sideKeys: { ...settings.sideKeys },
    sidePressed: {
      left: false,
      right: false,
    },
    typed: "",
    wasKbChording: false,
  };
}

function shallowCompareKeys(a: Record<string, any>, b: Record<string, any>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) {
    return true;
  }

  return keysA.some((key) => a[key] !== b[key]);
}

function supportsWebGL(): boolean {
  try {
    const testCanvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function saveCanvasScreenshot(canvas: HTMLCanvasElement, mode: string): void {
  const link = document.createElement("a");
  link.download = "braille-keyboard-" + mode + ".png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}
