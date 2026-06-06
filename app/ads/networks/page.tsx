import { getNetworks } from "@/lib/ads/queries";
import { rub } from "@/lib/ads/format";
import { requireUser } from "@/lib/ads/auth";

export default async function NetworksPage() {
  await requireUser();
  const networks = await getNetworks();

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Сетки и каналы</p>
          <h1>Карточки сеток</h1>
          <p>Состав сеток из текущего Excel и извлечённых ссылок, включая закрытые составы на проверку.</p>
        </div>
      </header>
      <section className="ads-card-grid">
        {networks.map((network) => (
          <article className="ads-network-card" key={network.id}>
            <div className="ads-card-head">
              <div>
                <span>{network.platform}</span>
                <h2><a href={`/ads/networks/${network.id}`}>{network.name}</a></h2>
              </div>
              <b>{network._count.channels}</b>
            </div>
            <p>{network.compositionStatus}</p>
            <div className="ads-card-meta">
              <span>{rub(network.priceRub)}</span>
              <span>{network._count.placements} размещений</span>
            </div>
            <ul>
              {network.channels.slice(0, 8).map((channel) => (
                <li key={channel.id}>
                  <a href={`/ads/channels/${channel.id}`}>{channel.name}</a>
                  {channel.url ? <a className="ads-sub-link" href={channel.url}>внешняя</a> : null}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </>
  );
}
