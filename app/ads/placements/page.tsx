import { getPlacements } from "@/lib/ads/queries";
import { dateTime, rub } from "@/lib/ads/format";
import { requireUser } from "@/lib/ads/auth";
import { getManagers } from "@/lib/ads/queries";
import { PlacementEditor } from "./PlacementEditor";

export default async function PlacementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; platform?: string; q?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const placements = await getPlacements({
    status: params.status,
    platform: params.platform,
    query: params.q,
  });
  const managers = await getManagers();

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Учёт выходов</p>
          <h1>Размещения</h1>
          <p>Фильтрованная таблица закупок, плановых дат, ссылок, статусов и источников Excel.</p>
        </div>
        <form className="ads-filter">
          <input name="q" placeholder="Канал, сетка, менеджер" defaultValue={params.q ?? ""} />
          <select name="platform" defaultValue={params.platform ?? ""}>
            <option value="">Все платформы</option>
            <option value="TG">TG</option>
            <option value="MAX">MAX</option>
            <option value="VK">VK</option>
            <option value="OK">OK</option>
          </select>
          <select name="status" defaultValue={params.status ?? ""}>
            <option value="">Все статусы</option>
            <option value="запланировано">запланировано</option>
            <option value="ждём выход">ждём выход</option>
            <option value="вышло">вышло</option>
            <option value="требует проверки">требует проверки</option>
          </select>
          <button className="ads-button" type="submit">Фильтр</button>
        </form>
      </header>
      <section className="ads-panel">
        <table className="ads-table ads-table-dense">
          <thead>
            <tr>
              <th>План</th>
              <th>Платформа</th>
              <th>Канал</th>
              <th>Сетка</th>
              <th>Менеджер</th>
              <th>Цена</th>
              <th>Статус</th>
              <th>Источник</th>
              <th>Редактирование</th>
              <th>Proof</th>
            </tr>
          </thead>
          <tbody>
            {placements.map((placement) => (
              <tr key={placement.id}>
                <td>{dateTime(placement.plannedAt)}</td>
                <td>{placement.platform}</td>
                <td>
                  <a href={`/ads/channels/${placement.channel.id}`}>{placement.channel.name}</a>
                  {placement.channel.url ? <a className="ads-sub-link" href={placement.channel.url}>внешняя</a> : null}
                </td>
                <td>{placement.network ? <a href={`/ads/networks/${placement.network.id}`}>{placement.network.name}</a> : "—"}</td>
                <td>{placement.manager?.name ?? "—"}</td>
                <td>{rub(placement.priceRub)}</td>
                <td><span className="ads-pill">{placement.status}</span></td>
                <td>{placement.sourceSheet ? `${placement.sourceSheet}:${placement.sourceRow ?? ""}` : "—"}</td>
                <td><PlacementEditor placement={placement} managers={managers} /></td>
                <td>
                  <form className="ads-proof-form" action={`/api/ads/placements/${placement.id}/proofs`} method="post" encType="multipart/form-data">
                    <input name="url" placeholder="ссылка/skrin" />
                    <input name="file" type="file" />
                    <button className="ads-button" type="submit">Proof</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
