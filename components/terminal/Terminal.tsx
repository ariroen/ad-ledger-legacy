"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CornerDownRight, Maximize2, Minimize2, Terminal as TerminalIcon } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { audioBus } from "@/lib/audio";
import { terminalHelp } from "@/lib/data";
import { scrollToSection } from "@/lib/utils";
import { useInterfaceStore } from "@/store/useInterfaceStore";

type Entry = {
  id: string;
  kind: "input" | "output" | "error";
  text: string;
};

const initialEntries: Entry[] = [
  { id: "boot-1", kind: "output", text: "Терминальный интерфейс активен. Введи help." },
  { id: "boot-2", kind: "output", text: "Подсказка: classified blacksignal открывает запечатанный пакет." },
];

export function Terminal() {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [value, setValue] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mode = useInterfaceStore((state) => state.mode);
  const setMode = useInterfaceStore((state) => state.setMode);
  const soundEnabled = useInterfaceStore((state) => state.soundEnabled);
  const unlockClassified = useInterfaceStore((state) => state.unlockClassified);
  const open = useInterfaceStore((state) => state.terminalOpen);
  const setOpen = useInterfaceStore((state) => state.setTerminalOpen);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [entries]);

  const push = (items: Array<Omit<Entry, "id">>) => {
    setEntries((current) => [
      ...current,
      ...items.map((item, index) => ({ ...item, id: `${Date.now()}-${index}-${Math.random()}` })),
    ]);
  };

  const runCommand = (raw: string) => {
    const command = raw.trim().toLowerCase();
    push([{ kind: "input", text: `operator@досье:~$ ${raw}` }]);

    if (!command) {
      return;
    }

    if (command === "clear") {
      setEntries([]);
      return;
    }

    if (command === "help") {
      push([
        {
          kind: "output",
          text: terminalHelp.map((item) => `${item.command.padEnd(24, " ")} ${item.description}`).join("\n"),
        },
      ]);
      return;
    }

    const jumps: Record<string, string> = {
      about: "dossier",
      skills: "skills",
      projects: "projects",
      services: "services",
      contact: "contact",
    };

    if (jumps[command]) {
      scrollToSection(jumps[command]);
      push([{ kind: "output", text: `[OK] Перенаправляю экран в модуль ${jumps[command].toUpperCase()}.` }]);
      audioBus.play("transition", soundEnabled);
      return;
    }

    if (command === "chaos" || command === "executive" || command === "minimal") {
      setMode(command);
      push([
        {
          kind: "output",
          text:
            command === "chaos"
              ? "[WARN] Режим хаоса включен. Визуальная дисциплина снижена, наглость повышена."
              : `[OK] Режим ${command.toUpperCase()} включен.`,
        },
      ]);
      return;
    }

    if (command === "classified") {
      scrollToSection("classified");
      push([{ kind: "output", text: "[ЗАКРЫТО] Нужна фраза доступа: classified blacksignal" }]);
      audioBus.play("error", soundEnabled);
      return;
    }

    if (command === "classified blacksignal" || command === "blacksignal") {
      unlockClassified();
      scrollToSection("classified");
      push([{ kind: "output", text: "[ДОСТУП РАЗРЕШЕН] Секретный раздел расшифрован." }]);
      audioBus.play("success", soundEnabled);
      return;
    }

    if (command === "chaos status") {
      push([{ kind: "output", text: `Текущий режим: ${mode}. Системный сарказм откалиброван.` }]);
      return;
    }

    push([{ kind: "error", text: `[ОШИБКА] Неизвестная команда: ${raw}. Введи help, пока терминал не начал тебя презирать.` }]);
    audioBus.play("error", soundEnabled);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    executeInputCommand();
  };

  const executeInputCommand = () => {
    const input = inputRef.current;
    runCommand(input?.value ?? value);
    setValue("");
    if (input) {
      input.value = "";
    }
  };

  return (
    <section className="terminal-shell" data-section="terminal" aria-label="Терминальная навигация">
      <div className="terminal-window hud-panel">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <TerminalIcon size={17} className="text-[var(--accent)]" />
            <span className="hud-label">терминальная навигация</span>
          </div>
          <button
            className="system-button interactive !min-h-8 !px-2"
            type="button"
            aria-label={open ? "Свернуть терминал" : "Развернуть терминал"}
            onClick={() => setOpen(!open)}
          >
            {open ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}>
              <div className="terminal-body">
                {entries.map((entry) => (
                  <p
                    key={entry.id}
                    className="terminal-line"
                    style={{ color: entry.kind === "error" ? "var(--danger)" : undefined }}
                  >
                    {entry.kind === "input" ? <strong>{entry.text}</strong> : entry.text}
                  </p>
                ))}
                <div ref={endRef} />
              </div>
              <form className="terminal-input" onSubmit={submit}>
                <span className="text-[var(--accent)]">&gt;</span>
                <input
                  ref={inputRef}
                  aria-label="Команда терминала"
                  name="terminal-command"
                  autoComplete="off"
                  spellCheck={false}
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value);
                    audioBus.play("type", soundEnabled);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      runCommand(event.currentTarget.value);
                      setValue("");
                      event.currentTarget.value = "";
                    }
                  }}
                  placeholder="help / projects / classified blacksignal"
                />
                <button
                  className="system-button interactive !min-h-8 !px-2"
                  type="button"
                  aria-label="Выполнить команду терминала"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    executeInputCommand();
                  }}
                >
                  <CornerDownRight size={14} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
