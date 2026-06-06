"use client";

type ToneName = "boot" | "hover" | "type" | "click" | "transition" | "success" | "error";

const tones: Record<ToneName, { frequency: number; duration: number; type: OscillatorType; gain: number }> = {
  boot: { frequency: 86, duration: 0.18, type: "sawtooth", gain: 0.045 },
  hover: { frequency: 720, duration: 0.035, type: "sine", gain: 0.018 },
  type: { frequency: 1040, duration: 0.025, type: "square", gain: 0.012 },
  click: { frequency: 320, duration: 0.06, type: "triangle", gain: 0.025 },
  transition: { frequency: 170, duration: 0.12, type: "sawtooth", gain: 0.032 },
  success: { frequency: 880, duration: 0.16, type: "sine", gain: 0.035 },
  error: { frequency: 150, duration: 0.16, type: "square", gain: 0.028 },
};

class AudioBus {
  private context: AudioContext | null = null;

  play(name: ToneName, enabled: boolean) {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    this.context ??= new AudioContextClass();
    const tone = tones[name];
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.frequency, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, tone.frequency * 0.58),
      this.context.currentTime + tone.duration,
    );
    gain.gain.setValueAtTime(tone.gain, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + tone.duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + tone.duration);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export const audioBus = new AudioBus();
