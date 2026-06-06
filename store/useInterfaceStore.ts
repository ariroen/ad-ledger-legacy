"use client";

import { create } from "zustand";

export type InterfaceMode = "executive" | "chaos" | "minimal";

type InterfaceState = {
  mode: InterfaceMode;
  bootComplete: boolean;
  soundEnabled: boolean;
  classifiedUnlocked: boolean;
  terminalOpen: boolean;
  setMode: (mode: InterfaceMode) => void;
  completeBoot: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  unlockClassified: () => void;
  setTerminalOpen: (open: boolean) => void;
};

export const useInterfaceStore = create<InterfaceState>((set) => ({
  mode: "executive",
  bootComplete: false,
  soundEnabled: false,
  classifiedUnlocked: false,
  terminalOpen: true,
  setMode: (mode) => set({ mode }),
  completeBoot: () => set({ bootComplete: true }),
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  unlockClassified: () => set({ classifiedUnlocked: true }),
  setTerminalOpen: (open) => set({ terminalOpen: open }),
}));
