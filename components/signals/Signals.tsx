import { RadioTower } from "lucide-react";
import { signals } from "@/lib/data";

export function Signals() {
  return (
    <section className="section-shell" data-section="signals" aria-label="Отзывы и сигналы">
      <p className="section-kicker reveal">
        <RadioTower size={16} />
        <span>внешние сигналы / телеметрия репутации</span>
      </p>
      <h2 className="section-title reveal">Сигналы</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {signals.map((signal) => (
          <article className="signal-card hud-panel reveal" key={signal.source}>
            <p className="mono text-3xl font-black text-[var(--accent)]">{signal.metric}</p>
            <blockquote className="mt-5 text-lg leading-7 text-white">&ldquo;{signal.quote}&rdquo;</blockquote>
            <p className="hud-label mt-5">{signal.source}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
