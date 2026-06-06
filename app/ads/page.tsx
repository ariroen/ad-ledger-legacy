import Link from "next/link";
import { AlertTriangle, Inbox, Network, RadioTower } from "lucide-react";
import { ImportControls } from "./actions";
import { getAdsDashboard } from "@/lib/ads/queries";
import { dateTime, rub } from "@/lib/ads/format";
import { requireUser } from "@/lib/ads/auth";

export default async function AdsDashboardPage() {
  await requireUser();
  const data = await getAdsDashboard();

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Операционный центр</p>
          <h1>Рекламный кабинет</h1>
          <p>Размещения, сетки, Telegram-входящие, счета и отчёты в одной SQLite-базе.</p>
        </div>
        <ImportControls />
      </header>

      <section className="ads-stats">
        <Metric label="Размещений" value={data.placementsTotal} icon={<RadioTower size={18} />} />
        <Metric label="Каналов" value={data.channelsTotal} icon={<Network size={18} />} />
        <Metric label="Сеток" value={data.networksTotal} icon={<Network size={18} />} />
        <Metric label="Telegram в очереди" value={data.pendingTelegram} icon={<Inbox size={18} />} />
        <Metric label="Требует проверки" value={data.requiresCheck} icon={<AlertTriangle size={18} />} warn />
      </section>

      <section className="ads-grid-two">
        <div className="ads-panel">
          <div className="ads-panel-title">
            <h2>Ближайшие выходы</h2>
            <Link href="/ads/placements">все</Link>
          </div>
          <div className="ads-list">
            {data.upcoming.map((placement) => (
              <div className="ads-list-row" key={placement.id}>
                <div>
                  <strong>{placement.channel.name}</strong>
                  <span>{placement.network?.name ?? "без сетки"} · {placement.platform}</span>
                </div>
                <div>
                  <b>{dateTime(placement.plannedAt)}</b>
                  <span>{rub(placement.priceRub)}</span>
                </div>
              </div>
            ))}
            {!data.upcoming.length ? <p className="ads-empty">Ближайших размещений нет в базе.</p> : null}
          </div>
        </div>

        <div className="ads-panel">
          <div className="ads-panel-title">
            <h2>Статусы</h2>
          </div>
          <div className="ads-status-list">
            {data.statusGroups.map((group) => (
              <div key={group.status}>
                <span>{group.status}</span>
                <strong>{group._count}</strong>
              </div>
            ))}
            {!data.statusGroups.length ? <p className="ads-empty">Импорт ещё не запускался.</p> : null}
          </div>
        </div>
      </section>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Последние записи</h2>
          <Link href="/ads/placements">таблица</Link>
        </div>
        <table className="ads-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Канал</th>
              <th>Сетка</th>
              <th>Менеджер</th>
              <th>Цена</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {data.recentPlacements.map((placement) => (
              <tr key={placement.id}>
                <td>{dateTime(placement.plannedAt)}</td>
                <td>{placement.channel.name}</td>
                <td>{placement.network?.name ?? "—"}</td>
                <td>{placement.manager?.name ?? "—"}</td>
                <td>{rub(placement.priceRub)}</td>
                <td><span className="ads-pill">{placement.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Metric({
  label,
  value,
  icon,
  warn,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <div className={warn ? "ads-metric ads-metric-warn" : "ads-metric"}>
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}
