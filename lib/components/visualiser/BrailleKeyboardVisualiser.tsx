"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ControlPanel } from "../panel/ControlPanel";
import { KeyboardHud } from "../hud/KeyboardHud";
import { normaliseDotKey } from "../../config";
import {
  createDefaultSettings,
  createSceneSettings,
  getActiveGeometry,
  getKeymapValidationError,
  loadSettings,
  persistSettings,
  updateKeyBinding,
} from "../../settings";
import type {
  CameraViewName,
  GeometrySettings,
  HudState,
  KeyBindingSpec,
  ModeName,
  SceneApi,
  VisualiserSettings,
} from "../../types";

const KeyboardScene = dynamic(
  () => import("../scene/KeyboardScene").then((module) => module.KeyboardScene),
  {
    ssr: false,
    loading: function SceneLoadingState() {
      return (
        <div className="scene-loading" role="status">
          Preparing the 3D keyboard…
        </div>
      );
    },
  }
);

const INITIAL_HUD: Readonly<HudState> = Object.freeze({
  dots: [],
  letter: "—",
  typed: "",
});

export function BrailleKeyboardVisualiser() {
  const [settings, setSettings] = useState<VisualiserSettings>(createDefaultSettings);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [cameraView, setCameraView] = useState<CameraViewName>("ergonomic");
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const sceneApiRef = useRef<SceneApi | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
    setHasLoadedSettings(true);
  }, []);

  useEffect(() => {
    if (hasLoadedSettings) {
      persistSettings(settings);
    }
  }, [hasLoadedSettings, settings]);

  const geometry = getActiveGeometry(settings);
  const sceneSettings = useMemo(() => createSceneSettings(settings), [settings]);

  const handleInteractionChange = useCallback((nextHud: HudState) => {
    setHud(nextHud);
  }, []);

  const handleModeChange = useCallback((mode: ModeName) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      mode,
    }));
  }, []);

  const handleGeometryChange = useCallback(
    (key: keyof GeometrySettings, value: number) => {
      setSettings((currentSettings) => ({
        ...currentSettings,
        modeGeometry: {
          ...currentSettings.modeGeometry,
          [currentSettings.mode]: {
            ...currentSettings.modeGeometry[currentSettings.mode],
            [key]: value,
          },
        },
      }));
    },
    []
  );

  const handleOverlayChange = useCallback(
    (key: "showSides" | "showNumbers" | "showLetters", value: boolean) => {
      setSettings((currentSettings) => ({
        ...currentSettings,
        [key]: value,
      }));
    },
    []
  );

  const handleKeyBinding = useCallback(
    (binding: KeyBindingSpec, rawKey: string) => {
      const key = normaliseDotKey(rawKey);
      const error = getKeymapValidationError(settings, binding, key);

      if (error) {
        return { error };
      }

      if (!key) {
        return { error: "Invalid key." };
      }

      setSettings((currentSettings) => updateKeyBinding(currentSettings, binding, key));

      const label =
        binding.type === "dot"
          ? "Dot " + binding.id
          : "The " + binding.id + " side button";

      return {
        message: label + " now uses " + key.toUpperCase() + ".",
      };
    },
    [settings]
  );

  const handleResetKeymap = useCallback(() => {
    setSettings((currentSettings) => {
      const defaults = createDefaultSettings();
      return {
        ...currentSettings,
        keyToDot: defaults.keyToDot,
        sideKeys: defaults.sideKeys,
      };
    });
  }, []);

  const handleCameraView = useCallback((view: CameraViewName) => {
    sceneApiRef.current?.setView(view);
    setCameraView(view);
  }, []);

  const handleSceneReady = useCallback((ready: boolean) => {
    setIsSceneReady(ready);
  }, []);

  const handleSnapshot = useCallback(() => {
    sceneApiRef.current?.saveScreenshot();
  }, []);

  return (
    <main className="visualiser-app">
      <section className="scene-stage" aria-label="Interactive braille keyboard">
        <KeyboardScene
          settings={sceneSettings}
          sceneApiRef={sceneApiRef}
          onInteractionChange={handleInteractionChange}
          onReady={handleSceneReady}
        />
        <KeyboardHud dots={hud.dots} letter={hud.letter} typed={hud.typed} />
      </section>

      <ControlPanel
        settings={settings}
        geometry={geometry}
        cameraView={cameraView}
        isSceneReady={isSceneReady}
        onModeChange={handleModeChange}
        onGeometryChange={handleGeometryChange}
        onOverlayChange={handleOverlayChange}
        onKeyBinding={handleKeyBinding}
        onResetKeymap={handleResetKeymap}
        onCameraView={handleCameraView}
        onSnapshot={handleSnapshot}
      />
    </main>
  );
}
