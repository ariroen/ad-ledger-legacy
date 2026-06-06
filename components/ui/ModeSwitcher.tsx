"use client";

import { Gauge, Sparkles, Zap } from "lucide-react";
import { audioBus } from "@/lib/audio";
import { InterfaceMode, useInterfaceStore } from "@/store/useInterfaceStore";

const modes: Array<{ mode: InterfaceMode; label: string; icon: typeof Gauge }> = [
  { mode: "executive", label: "Строго", icon: Gauge },
  { mode: "chaos", label: "Хаос", icon: Zap },
  { mode: "minimal", label: "Лайт", icon: Sparkles },
];

export function ModeSwitcher() {
  const mode = useInterfaceStore((state) => state.mode);
  const setMode = useInterfaceStore((state) => state.setMode);
  const soundEnabled = useInterfaceStore((state) => state.soundEnabled);

  return (
    <div className="hud-panel flex items-center gap-1 p-1" role="group" aria-label="Режим интерфейса">
      {modes.map(({ mode: itemMode, label, icon: Icon }) => (
        <button
          key={itemMode}
          className="system-button interactive"
          data-active={mode === itemMode}
          type="button"
          aria-pressed={mode === itemMode}
          onMouseEnter={() => audioBus.play("hover", soundEnabled)}
          onClick={() => {
            setMode(itemMode);
            audioBus.play("transition", soundEnabled);
          }}
        >
          <Icon size={15} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
