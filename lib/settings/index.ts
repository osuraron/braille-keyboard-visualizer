import {
  DEFAULT_KEY_TO_DOT,
  DEFAULT_SIDE_KEYS,
  DOT_NUMBERS,
  SIDE_NAMES,
  normaliseDotKey,
} from "../config";
import type {
  GeometrySettings,
  KeyBindingSpec,
  KeyToDotMap,
  ModeGeometryMap,
  ModeName,
  SceneSettings,
  SideKeysMap,
  VisualiserSettings,
} from "../types";

export const STORAGE_KEY = "braille-keyboard-visualiser.settings";
export const MODES: readonly ModeName[] = Object.freeze([
  "triangular",
  "integrated",
  "arc",
  "hable",
] as const);

const DEFAULT_GEOMETRY: Readonly<GeometrySettings> = Object.freeze({
  indent: 0.35,
  angleDeg: 16,
  keyDia: 0.52,
});

export function createDefaultSettings(): VisualiserSettings {
  return {
    mode: "triangular",
    modeGeometry: createDefaultModeGeometry(),
    showSides: true,
    showNumbers: false,
    showLetters: false,
    keyToDot: { ...DEFAULT_KEY_TO_DOT },
    sideKeys: { ...DEFAULT_SIDE_KEYS },
  };
}

export function loadSettings(): VisualiserSettings {
  if (typeof window === "undefined") {
    return createDefaultSettings();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitiseSettings(JSON.parse(raw)) : createDefaultSettings();
  } catch {
    return createDefaultSettings();
  }
}

export function persistSettings(settings: VisualiserSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mode: settings.mode,
        modeGeometry: settings.modeGeometry,
        showSides: settings.showSides,
        showNumbers: settings.showNumbers,
        showLetters: settings.showLetters,
        keyToDot: settings.keyToDot,
        sideKeys: settings.sideKeys,
      })
    );
  } catch {
    // Storage can be unavailable in private or restricted browser sessions.
  }
}

export function getActiveGeometry(settings: VisualiserSettings): GeometrySettings {
  return settings.modeGeometry[settings.mode] || DEFAULT_GEOMETRY;
}

export function createSceneSettings(settings: VisualiserSettings): SceneSettings {
  return {
    ...settings,
    ...getActiveGeometry(settings),
  };
}

export function getKeymapValidationError(
  settings: VisualiserSettings,
  binding: KeyBindingSpec,
  key: string | null
): string {
  const normalisedKey = normaliseDotKey(key);
  if (!normalisedKey) {
    return "Use a single printable key.";
  }

  const assignedDot = settings.keyToDot[normalisedKey];
  if (
    assignedDot !== undefined &&
    !(binding.type === "dot" && assignedDot === binding.id)
  ) {
    return (
      normalisedKey.toUpperCase() +
      " is already assigned to dot " +
      assignedDot +
      "."
    );
  }

  const assignedSide = (
    Object.entries(settings.sideKeys) as [ "left" | "right", string][]
  ).find((entry) => entry[1] === normalisedKey)?.[0];

  if (
    assignedSide &&
    !(binding.type === "side" && assignedSide === binding.id)
  ) {
    return (
      normalisedKey.toUpperCase() +
      " is already assigned to the " +
      assignedSide +
      " side button."
    );
  }

  return "";
}

export function updateKeyBinding(
  settings: VisualiserSettings,
  binding: KeyBindingSpec,
  key: string
): VisualiserSettings {
  if (binding.type === "side") {
    return {
      ...settings,
      sideKeys: {
        ...settings.sideKeys,
        [binding.id]: key,
      },
    };
  }

  return {
    ...settings,
    keyToDot: Object.fromEntries(
      Object.entries(settings.keyToDot).map(([k, dot]) => [
        dot === binding.id ? key : k,
        dot,
      ])
    ),
  };
}

function sanitiseSettings(rawSettings: any): VisualiserSettings {
  const defaults = createDefaultSettings();
  if (!rawSettings || typeof rawSettings !== "object") {
    return defaults;
  }

  const mode: ModeName = MODES.includes(rawSettings.mode)
    ? rawSettings.mode
    : defaults.mode;
  const keyToDot = sanitiseKeyToDot(rawSettings.keyToDot);
  const sideKeys = sanitiseSideKeys(rawSettings.sideKeys);
  const hasMappingConflict = Object.keys(keyToDot).some((key) =>
    Object.values(sideKeys).includes(key)
  );

  return {
    ...defaults,
    mode,
    modeGeometry: sanitiseModeGeometry(rawSettings),
    showSides: readBoolean(rawSettings.showSides, defaults.showSides),
    showNumbers: readBoolean(rawSettings.showNumbers, defaults.showNumbers),
    showLetters: readBoolean(rawSettings.showLetters, defaults.showLetters),
    keyToDot: hasMappingConflict ? { ...DEFAULT_KEY_TO_DOT } : keyToDot,
    sideKeys: hasMappingConflict ? { ...DEFAULT_SIDE_KEYS } : sideKeys,
  };
}

function createDefaultModeGeometry(): ModeGeometryMap {
  return MODES.reduce((geometry, mode) => {
    geometry[mode] = { ...DEFAULT_GEOMETRY };
    return geometry;
  }, {} as ModeGeometryMap);
}

function sanitiseModeGeometry(rawSettings: any): ModeGeometryMap {
  const geometry = createDefaultModeGeometry();
  const storedGeometry = getStoredModeGeometry(rawSettings);

  MODES.forEach((mode) => {
    const source = storedGeometry?.[mode] || rawSettings;
    geometry[mode] = {
      indent: readNumber(source?.indent, DEFAULT_GEOMETRY.indent, -1, 1),
      angleDeg: readNumber(source?.angleDeg, DEFAULT_GEOMETRY.angleDeg, 0, 35),
      keyDia: readNumber(source?.keyDia, DEFAULT_GEOMETRY.keyDia, 0.4, 0.62),
    };
  });

  return geometry;
}

function getStoredModeGeometry(rawSettings: any): Record<string, any> | null {
  return rawSettings?.modeGeometry && typeof rawSettings.modeGeometry === "object"
    ? rawSettings.modeGeometry
    : null;
}

function sanitiseKeyToDot(rawKeyToDot: any): KeyToDotMap {
  if (!rawKeyToDot || typeof rawKeyToDot !== "object") {
    return { ...DEFAULT_KEY_TO_DOT };
  }

  const entries = Object.entries(rawKeyToDot);
  if (entries.length !== DOT_NUMBERS.length) {
    return { ...DEFAULT_KEY_TO_DOT };
  }

  const keyToDot: KeyToDotMap = {};
  const seenDots = new Set<number>();
  const seenKeys = new Set<string>();

  for (const [rawKey, rawDot] of entries) {
    const key = normaliseDotKey(rawKey);
    const dot = Number(rawDot);

    if (
      !key ||
      !DOT_NUMBERS.includes(dot) ||
      seenKeys.has(key) ||
      seenDots.has(dot)
    ) {
      return { ...DEFAULT_KEY_TO_DOT };
    }

    keyToDot[key] = dot;
    seenKeys.add(key);
    seenDots.add(dot);
  }

  return keyToDot;
}

function sanitiseSideKeys(rawSideKeys: any): SideKeysMap {
  if (!rawSideKeys || typeof rawSideKeys !== "object") {
    return { ...DEFAULT_SIDE_KEYS };
  }

  const sideKeys: Partial<SideKeysMap> = {};
  const seenKeys = new Set<string>();

  for (const side of SIDE_NAMES) {
    const key = normaliseDotKey(rawSideKeys[side]);
    if (!key || seenKeys.has(key)) {
      return { ...DEFAULT_SIDE_KEYS };
    }

    sideKeys[side] = key;
    seenKeys.add(key);
  }

  return sideKeys as SideKeysMap;
}

function readBoolean(value: any, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: any, fallback: number, minimum: number, maximum: number): number {
  return typeof value === "number" &&
    !Number.isNaN(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : fallback;
}
