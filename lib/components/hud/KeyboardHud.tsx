import React from "react";
import type { HudState } from "../../types";

const EMPTY_VALUE = "—";

export interface KeyboardHudProps {
  dots: HudState["dots"];
  letter: HudState["letter"];
  typed: HudState["typed"];
}

export function KeyboardHud({ dots, letter, typed }: KeyboardHudProps) {
  const dotsLabel = dots.length > 0 ? dots.join(", ") : EMPTY_VALUE;

  return (
    <section className="keyboard-hud" aria-live="polite" aria-label="Braille input status">
      <HudCard label="Dots" value={dotsLabel} />
      <HudCard label="Letter" value={letter || EMPTY_VALUE} />
      <HudCard label="Typed" value={typed || "\u00A0"} className="hud-card--typed" />
    </section>
  );
}

interface HudCardProps {
  label: string;
  value: string;
  className?: string;
}

function HudCard({ label, value, className = "" }: HudCardProps) {
  return (
    <div className={"hud-card " + className}>
      <span className="hud-card__label">{label}</span>
      <strong className="hud-card__value">{value}</strong>
    </div>
  );
}
