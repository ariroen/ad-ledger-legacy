"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Send, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { audioBus } from "@/lib/audio";
import { budgetRanges, contactModes, urgencyLevels } from "@/lib/data";
import { useInterfaceStore } from "@/store/useInterfaceStore";

export function ContactProtocol() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const soundEnabled = useInterfaceStore((store) => store.soundEnabled);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("sending");
    audioBus.play("transition", soundEnabled);
    window.setTimeout(() => {
      setState("sent");
      audioBus.play("success", soundEnabled);
    }, 1300);
  };

  return (
    <section className="section-shell" data-section="contact" aria-label="Контактный протокол">
      <p className="section-kicker reveal">
        <Send size={16} />
        <span>контактный протокол / передать сигнал</span>
      </p>
      <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <h2 className="section-title reveal">Запустить контактный протокол</h2>
          <p className="section-copy reveal">
            Отправь короткий сигнал. Мок-передатчик проверит пакет и вернет красивое состояние успеха.
          </p>
          <div className="hud-panel reveal mt-6 p-4">
            <p className="hud-label">правила передачи</p>
            <ul className="mt-3 grid gap-2 mono text-sm text-[var(--muted)]">
              <li>[OK] Серьезные проекты получают приоритет.</li>
              <li>[OK] Странные интерфейсы приветствуются.</li>
              <li>[WARN] Расплывчатое &quot;сделайте красиво&quot; уходит в карантин.</li>
            </ul>
          </div>
        </div>
        <form className="hud-panel reveal p-5" onSubmit={submit}>
          <div className="form-grid">
            <label className="field">
              <span className="hud-label">имя</span>
              <input required name="name" placeholder="Имя оператора" />
            </label>
            <label className="field">
              <span className="hud-label">канал связи</span>
              <input required name="channel" placeholder="@telegram / email" />
            </label>
            <label className="field">
              <span className="hud-label">тип проекта</span>
              <select name="type" defaultValue={contactModes[0]}>
                {contactModes.map((mode) => (
                  <option key={mode}>{mode}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="hud-label">срочность</span>
              <select name="urgency" defaultValue={urgencyLevels[1]}>
                {urgencyLevels.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="hud-label">бюджет</span>
              <select name="budget" defaultValue={budgetRanges[1]}>
                {budgetRanges.map((range) => (
                  <option key={range}>{range}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="hud-label">приоритет</span>
              <select name="priority" defaultValue="Качество сигнала">
                <option>Качество сигнала</option>
                <option>Скорость</option>
                <option>Максимальный эффект</option>
                <option>Операционная ясность</option>
              </select>
            </label>
            <label className="field full">
              <span className="hud-label">сообщение</span>
              <textarea required name="message" placeholder="Опиши операцию, цель и ограничения." />
            </label>
          </div>
          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <button className="system-button interactive" type="submit" disabled={state === "sending"}>
              <Send size={16} />
              {state === "sending" ? "Передача..." : "Передать сигнал"}
            </button>
            <AnimatePresence mode="wait">
              {state === "sent" && (
                <motion.p
                  className="mono text-sm text-[var(--success)]"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <ShieldCheck className="mr-2 inline" size={16} />
                  СИГНАЛ ПРИНЯТ / мок-пакет доставлен
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </form>
      </div>
    </section>
  );
}
