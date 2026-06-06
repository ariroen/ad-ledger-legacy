import Link from "next/link";
import { BarChart3, BriefcaseBusiness, CalendarDays, CreditCard, Settings, Table2, Upload, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/ads/auth";

const nav = [
  { href: "/ads", label: "Обзор", icon: BarChart3 },
  { href: "/ads/campaigns", label: "Кампании", icon: BriefcaseBusiness },
  { href: "/ads/calendar", label: "Выходы", icon: CalendarDays },
  { href: "/ads/placements", label: "Размещения", icon: Table2 },
  { href: "/ads/import", label: "Импорт", icon: Upload },
  { href: "/ads/managers", label: "Менеджеры", icon: Users },
  { href: "/ads/finance", label: "Финансы", icon: CreditCard },
  { href: "/ads/reports", label: "Отчёты", icon: CalendarDays },
  { href: "/ads/service", label: "Сервис", icon: Settings },
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
          <small>Контроль рекламных размещений</small>
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
