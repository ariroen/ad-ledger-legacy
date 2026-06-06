"use client";

import { Volume2, VolumeX } from "lucide-react";
import { audioBus } from "@/lib/audio";
import { useInterfaceStore } from "@/store/useInterfaceStore";

export function SoundToggle() {
  const soundEnabled = useInterfaceStore((state) => state.soundEnabled);
  const setSoundEnabled = useInterfaceStore((state) => state.setSoundEnabled);
  const Icon = soundEnabled ? Volume2 : VolumeX;

  return (
    <button
      className="system-button interactive"
      type="button"
      aria-label={soundEnabled ? "Выключить звук интерфейса" : "Включить звук интерфейса"}
      data-active={soundEnabled}
      onClick={() => {
        setSoundEnabled(!soundEnabled);
        audioBus.play(soundEnabled ? "click" : "success", true);
      }}
    >
      <Icon size={16} aria-hidden="true" />
      <span>{soundEnabled ? "Звук" : "Тихо"}</span>
    </button>
  );
}
