import Link from "next/link";
import { requireUser } from "@/lib/ads/auth";

const serviceLinks = [
  { href: "/ads/networks", label: "Сетки" },
  { href: "/ads/telegram", label: "Telegram" },
  { href: "/ads/audit", label: "Audit" },
  { href: "/ads/backups", label: "Backups" },
];

export default async function ServicePage() {
  await requireUser();

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Сервис</p>
          <h1>Сервис</h1>
          <p>Технические разделы Ad Ledger.</p>
        </div>
      </header>

      <section className="ads-panel">
        <div className="ads-list">
          {serviceLinks.map((item) => (
            <div className="ads-list-row" key={item.href}>
              <div>
                <strong>{item.label}</strong>
                <span>{item.href}</span>
              </div>
              <div>
                <Link className="ads-button" href={item.href}>
                  Открыть
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
