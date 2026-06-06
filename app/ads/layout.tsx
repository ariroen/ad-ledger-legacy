import Link from "next/link";
import { BarChart3, CalendarDays, CreditCard, History, Inbox, Network, ShieldCheck, Table2 } from "lucide-react";
import { getCurrentUser } from "@/lib/ads/auth";

const nav = [
  { href: "/ads", label: "Дашборд", icon: BarChart3 },
  { href: "/ads/placements", label: "Размещения", icon: Table2 },
  { href: "/ads/networks", label: "Сетки", icon: Network },
  { href: "/ads/telegram", label: "Telegram", icon: Inbox },
  { href: "/ads/finance", label: "Финансы", icon: CreditCard },
  { href: "/ads/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/ads/reports", label: "Отчёты", icon: CalendarDays },
  { href: "/ads/audit", label: "Audit", icon: History },
  { href: "/ads/backups", label: "Backups", icon: ShieldCheck },
];

export default async function AdsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return children;
  }

  return (
    <main className="ads-shell">
      <aside className="ads-sidebar">
        <div className="ads-brand">
          <span>Ad Ledger</span>
          <small>единый учёт рекламы</small>
        </div>
        <nav className="ads-nav">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link href={item.href} key={item.href}>
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action="/api/ads/auth/logout" method="post" className="ads-user">
          <span>{user.name}</span>
          <small>{user.role}</small>
          <button type="submit">Выйти</button>
        </form>
      </aside>
      <section className="ads-main">{children}</section>
    </main>
  );
}
