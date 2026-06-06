"use client";

import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, Lock, UnlockKeyhole } from "lucide-react";
import { useState } from "react";
import { audioBus } from "@/lib/audio";
import { secretPayload } from "@/lib/data";
import { useInterfaceStore } from "@/store/useInterfaceStore";

export function ClassifiedSection() {
  const [code, setCode] = useState("");
  const unlocked = useInterfaceStore((state) => state.classifiedUnlocked);
  const unlock = useInterfaceStore((state) => state.unlockClassified);
  const soundEnabled = useInterfaceStore((state) => state.soundEnabled);

  const attempt = () => {
    if (code.trim().toUpperCase() === secretPayload.key) {
      unlock();
      audioBus.play("success", soundEnabled);
    } else {
      audioBus.play("error", soundEnabled);
    }
  };

  return (
    <section className="section-shell" data-section="classified" aria-label="Секретный раздел">
      <p className="section-kicker reveal">
        {unlocked ? <UnlockKeyhole size={16} /> : <Lock size={16} />}
        <span>секретный раздел / запечатанный пакет</span>
      </p>
      <h2 className="section-title reveal">Секретный раздел</h2>
      <div className="classified-lock hud-panel reveal">
        <AnimatePresence mode="wait">
          {!unlocked ? (
            <motion.div key="locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="hud-label">требуется фраза доступа</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Пакет запечатан. Используй команду терминала <span className="mono text-[var(--accent)]">classified blacksignal</span> или введи фразу вручную.
              </p>
              <div className="mt-5 flex max-w-xl flex-col gap-3 md:flex-row">
                <input
                  className="w-full rounded-md border border-white/10 bg-black/50 px-3 py-3 mono text-white outline-none"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      attempt();
                    }
                  }}
                  placeholder="BLACKSIGNAL"
                  aria-label="Фраза доступа к секретному разделу"
                />
                <button className="system-button interactive" type="button" onClick={attempt}>
                  <KeyRound size={16} />
                  Расшифровать
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="unlocked" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="mono text-sm text-[var(--success)]">[ДОСТУП РАЗРЕШЕН]</p>
              <h3 className="mt-2 font-display text-4xl font-black uppercase">{secretPayload.title}</h3>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)]">{secretPayload.body}</p>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {secretPayload.directives.map((directive) => (
                  <div className="rounded-md border border-[rgba(85,255,210,.28)] bg-[rgba(85,255,210,.06)] p-4 mono text-sm text-white" key={directive}>
                    {directive}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
