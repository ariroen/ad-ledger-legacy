import { notFound } from "next/navigation";
import { requireUser } from "@/lib/ads/auth";
import { getChannelDetail } from "@/lib/ads/queries";
import { dateTime, rub } from "@/lib/ads/format";

export default async function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const channel = await getChannelDetail(id);
  if (!channel) notFound();
  const problemCount = channel.placements.filter((placement) => placement.status === "требует проверки").length;

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">{channel.platform}</p>
          <h1>{channel.name}</h1>
          <p>{channel.network?.name ?? "без сетки"} · {channel.url ?? "нет ссылки"} · проблемных записей: {problemCount}</p>
        </div>
        <div className="ads-actions">
          {channel.url ? <a className="ads-button" href={channel.url}>Открыть канал</a> : null}
          {channel.statsUrl ? <a className="ads-button" href={channel.statsUrl}>Статистика</a> : null}
        </div>
      </header>
      <section className="ads-stats">
        <div className="ads-metric"><strong>{channel.placements.length}</strong><small>размещений</small></div>
        <div className="ads-metric"><strong>{channel.placements.filter((p) => p.status === "вышло").length}</strong><small>вышло</small></div>
        <div className="ads-metric ads-metric-warn"><strong>{problemCount}</strong><small>требует проверки</small></div>
      </section>
      <section className="ads-panel">
        <div className="ads-panel-title"><h2>История выходов</h2></div>
        <table className="ads-table">
          <thead><tr><th>Дата</th><th>Сетка</th><th>Менеджер</th><th>Цена</th><th>Статус</th><th>Proof</th></tr></thead>
          <tbody>
            {channel.placements.map((placement) => (
              <tr key={placement.id}>
                <td>{dateTime(placement.plannedAt)}</td>
                <td>{placement.network?.name ?? "—"}</td>
                <td>{placement.manager?.name ?? "—"}</td>
                <td>{rub(placement.priceRub)}</td>
                <td><span className="ads-pill">{placement.status}</span></td>
                <td>{placement.proofs.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
