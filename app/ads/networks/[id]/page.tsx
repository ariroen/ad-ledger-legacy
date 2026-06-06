import { notFound } from "next/navigation";
import { requireUser } from "@/lib/ads/auth";
import { getNetworkDetail } from "@/lib/ads/queries";
import { dateTime, rub } from "@/lib/ads/format";

type NetworkDetail = NonNullable<Awaited<ReturnType<typeof getNetworkDetail>>>;
type NetworkPlacement = NetworkDetail["placements"][number];
type NetworkChannel = NetworkDetail["channels"][number];
type NetworkPayment = NetworkDetail["payments"][number];

export default async function NetworkPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const network = await getNetworkDetail(id);
  if (!network) notFound();
  const done = network.placements.filter((placement: NetworkPlacement) => placement.status === "вышло").length;
  const waiting = network.placements.filter((placement: NetworkPlacement) => ["запланировано", "ждём выход"].includes(placement.status)).length;
  const check = network.placements.filter((placement: NetworkPlacement) => placement.status === "требует проверки").length;
  const totalPrice = network.placements.reduce((sum: number, placement: NetworkPlacement) => sum + (placement.priceRub ?? 0), 0);

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">{network.platform}</p>
          <h1>{network.name}</h1>
          <p>{network.compositionStatus} · каналов: {network.channels.length} · прайс: {rub(network.priceRub)}</p>
        </div>
        {network.networkUrl ? <a className="ads-button" href={network.networkUrl}>Открыть сетку</a> : null}
      </header>
      <section className="ads-stats">
        <div className="ads-metric"><strong>{network.channels.length}</strong><small>каналов</small></div>
        <div className="ads-metric"><strong>{network.placements.length}</strong><small>куплено постов</small></div>
        <div className="ads-metric"><strong>{done}</strong><small>вышло</small></div>
        <div className="ads-metric"><strong>{waiting}</strong><small>ждёт</small></div>
        <div className="ads-metric ads-metric-warn"><strong>{check}</strong><small>требует проверки</small></div>
      </section>
      <section className="ads-grid-two">
        <div className="ads-panel">
          <div className="ads-panel-title"><h2>Каналы</h2><span>{rub(totalPrice)}</span></div>
          <div className="ads-list">
            {network.channels.map((channel: NetworkChannel) => (
              <div className="ads-list-row" key={channel.id}>
                <div><strong><a href={`/ads/channels/${channel.id}`}>{channel.name}</a></strong><span>{channel.url ?? "нет ссылки"}</span></div>
                <div><b>{channel.platform}</b></div>
              </div>
            ))}
          </div>
        </div>
        <div className="ads-panel">
          <div className="ads-panel-title"><h2>Оплаты по сетке</h2></div>
          <div className="ads-list">
            {network.payments.map((payment: NetworkPayment) => (
              <div className="ads-list-row" key={payment.id}>
                <div><strong>{rub(payment.amountRub)}</strong><span>{payment.invoice?.number ?? payment.note ?? "без счёта"}</span></div>
                <div><b>{payment.status}</b></div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="ads-panel">
        <div className="ads-panel-title"><h2>Размещения сетки</h2></div>
        <table className="ads-table">
          <thead><tr><th>Дата</th><th>Канал</th><th>Менеджер</th><th>Цена</th><th>Статус</th></tr></thead>
          <tbody>
            {network.placements.map((placement: NetworkPlacement) => (
              <tr key={placement.id}>
                <td>{dateTime(placement.plannedAt)}</td>
                <td><a href={`/ads/channels/${placement.channel.id}`}>{placement.channel.name}</a></td>
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
