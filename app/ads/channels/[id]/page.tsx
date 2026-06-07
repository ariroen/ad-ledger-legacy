import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ReferralLinksList } from "@/app/ads/ReferralLinksList";
import { requireUser } from "@/lib/ads/auth";
import { getChannelDetail } from "@/lib/ads/queries";
import { dateTime, rub } from "@/lib/ads/format";
import { createReferralLink } from "@/lib/ads/referrals";

type ChannelDetail = NonNullable<Awaited<ReturnType<typeof getChannelDetail>>>;
type ChannelPlacement = ChannelDetail["placements"][number];

export default async function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const channel = await getChannelDetail(id);
  if (!channel) notFound();
  const currentChannel = channel;
  const problemCount = currentChannel.placements.filter((placement: ChannelPlacement) => placement.status === "требует проверки").length;

  async function createReferralLinkAction(formData: FormData) {
    "use server";

    await createReferralLink({
      channelId: currentChannel.id,
      sourceUrl: String(formData.get("sourceUrl") || ""),
      status: String(formData.get("status") || "active"),
    });

    redirect(`/ads/channels/${currentChannel.id}`);
  }

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">{currentChannel.platform}</p>
          <h1>{currentChannel.name}</h1>
          <p>{currentChannel.network?.name ?? "без сетки"} · {currentChannel.url ?? "нет ссылки"} · проблемных записей: {problemCount}</p>
        </div>
        <div className="ads-actions">
          {currentChannel.url ? <a className="ads-button" href={currentChannel.url}>Открыть канал</a> : null}
          {currentChannel.statsUrl ? <a className="ads-button" href={currentChannel.statsUrl}>Статистика</a> : null}
        </div>
      </header>
      <section className="ads-stats">
        <div className="ads-metric"><strong>{currentChannel.placements.length}</strong><small>размещений</small></div>
        <div className="ads-metric"><strong>{currentChannel.placements.filter((p: ChannelPlacement) => p.status === "вышло").length}</strong><small>вышло</small></div>
        <div className="ads-metric ads-metric-warn"><strong>{problemCount}</strong><small>требует проверки</small></div>
      </section>
      <section className="ads-panel">
        <div className="ads-panel-title"><h2>История выходов</h2></div>
        <table className="ads-table">
          <thead><tr><th>Дата</th><th>Сетка</th><th>Менеджер</th><th>Цена</th><th>Статус</th><th>Proof</th></tr></thead>
          <tbody>
            {currentChannel.placements.map((placement: ChannelPlacement) => (
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
      <section className="ads-panel">
        <div className="ads-panel-title"><h2>Реферальные ссылки</h2></div>
        <form className="ads-filter" action={createReferralLinkAction}>
          <input name="sourceUrl" placeholder="Исходная ссылка" />
          <select name="status" defaultValue="active">
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="archived">archived</option>
          </select>
          <button className="ads-button ads-button-primary" type="submit">Добавить ссылку</button>
        </form>
        <ReferralLinksList links={currentChannel.referralLinks} emptyText="Реферальных ссылок канала пока нет." />
        {currentChannel.placements.length ? (
          <p className="ads-empty">
            Для точной привязки к дате выхода открывай конкретное размещение:{" "}
            <Link href={`/ads/placements/${currentChannel.placements[0].id}`}>последнее размещение</Link>.
          </p>
        ) : null}
      </section>
    </>
  );
}
