import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AttachmentList } from "@/app/ads/AttachmentList";
import { AttachmentUploader } from "@/app/ads/AttachmentUploader";
import { ReferralLinksList } from "@/app/ads/ReferralLinksList";
import { requireUser } from "@/lib/ads/auth";
import { dateTime, rub } from "@/lib/ads/format";
import { getCampaignDetail } from "@/lib/ads/queries";
import { createReferralLink } from "@/lib/ads/referrals";

type CampaignDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  await requireUser();
  const { id } = await params;
  const data = await getCampaignDetail(id);
  if (!data) notFound();
  const { campaign, placements, proofSet, stats, withoutProof, withoutStatus, upcomingPlacements, recentPlacements } = data;

  async function createReferralLinkAction(formData: FormData) {
    "use server";

    await createReferralLink({
      campaignId: campaign.id,
      sourceUrl: String(formData.get("sourceUrl") || ""),
      status: String(formData.get("status") || "active"),
    });

    redirect(`/ads/campaigns/${campaign.id}`);
  }

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Кампания</p>
          <h1>{campaign.name}</h1>
          <p>Месячная рекламная кампания и связанные размещения.</p>
        </div>
        <div className="ads-actions">
          <Link className="ads-button" href="/ads/campaigns">
            Назад к кампаниям
          </Link>
          <Link className="ads-button ads-button-primary" href={`/ads/placements/new?campaignId=${campaign.id}`}>
            Добавить размещение
          </Link>
          <Link className="ads-button" href={`/ads/placements?campaignId=${campaign.id}`}>
            Все размещения кампании
          </Link>
        </div>
      </header>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Основное</h2>
        </div>
        <div className="ads-list">
          <div className="ads-list-row"><div><strong>Название</strong></div><div><b>{campaign.name}</b></div></div>
          <div className="ads-list-row"><div><strong>Месяц</strong></div><div><b>{campaign.month}</b></div></div>
          <div className="ads-list-row"><div><strong>Год</strong></div><div><b>{campaign.year}</b></div></div>
          <div className="ads-list-row"><div><strong>Бюджет</strong></div><div><b>{rub(campaign.budgetRub)}</b></div></div>
          <div className="ads-list-row"><div><strong>Статус</strong></div><div><b>{campaign.status}</b></div></div>
          <div className="ads-list-row"><div><strong>Заметка</strong></div><div><b>{campaign.note ?? "—"}</b></div></div>
        </div>
      </section>

      <AttachmentUploader campaignId={campaign.id} />

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Файлы кампании</h2>
        </div>
        <AttachmentList attachments={campaign.attachments} emptyText="Файлов кампании пока нет." />
      </section>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Реферальные ссылки</h2>
        </div>
        <form className="ads-filter" action={createReferralLinkAction}>
          <input name="sourceUrl" placeholder="Исходная ссылка" />
          <select name="status" defaultValue="active">
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="archived">archived</option>
          </select>
          <button className="ads-button ads-button-primary" type="submit">Добавить ссылку</button>
        </form>
        <ReferralLinksList links={campaign.referralLinks} emptyText="Реферальных ссылок кампании пока нет." />
      </section>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Статистика</h2>
        </div>
        <div className="ads-list">
          <div className="ads-list-row"><div><strong>Размещений</strong></div><div><b>{stats.placementsCount}</b></div></div>
          <div className="ads-list-row"><div><strong>Каналов</strong></div><div><b>{stats.channelsCount}</b></div></div>
          <div className="ads-list-row"><div><strong>Менеджеров</strong></div><div><b>{stats.managersCount}</b></div></div>
          <div className="ads-list-row"><div><strong>С proof</strong></div><div><b>{stats.proofCount}</b></div></div>
          <div className="ads-list-row"><div><strong>Без proof</strong></div><div><b>{stats.withoutProofCount}</b></div></div>
          <div className="ads-list-row"><div><strong>Без статуса</strong></div><div><b>{stats.withoutStatusCount}</b></div></div>
          <div className="ads-list-row"><div><strong>Требует проверки</strong></div><div><b>{stats.requiresCheckCount}</b></div></div>
        </div>
      </section>

      <section className="ads-grid-two">
        <div className="ads-panel">
          <div className="ads-panel-title">
            <h2>Без proof</h2>
            <Link href={`/ads/placements?campaignId=${campaign.id}`}>к размещениям</Link>
          </div>
          <div className="ads-list">
            {withoutProof.map((placement) => (
              <div className="ads-list-row" key={placement.id}>
                <div>
                  <strong>{placement.channel.name}</strong>
                  <span>{placement.manager?.name ?? "без менеджера"} · {placement.platform}</span>
                </div>
                <div>
                  <b>{dateTime(placement.plannedAt)}</b>
                  <Link href={`/ads/placements/${placement.id}`}>Открыть</Link>
                </div>
              </div>
            ))}
            {!withoutProof.length ? <p className="ads-empty">Все размещения с proof.</p> : null}
          </div>
        </div>

        <div className="ads-panel">
          <div className="ads-panel-title">
            <h2>Без статуса</h2>
          </div>
          <div className="ads-list">
            {withoutStatus.map((placement) => (
              <div className="ads-list-row" key={placement.id}>
                <div>
                  <strong>{placement.channel.name}</strong>
                  <span>{placement.manager?.name ?? "без менеджера"} · {placement.platform}</span>
                </div>
                <div>
                  <b>{dateTime(placement.plannedAt)}</b>
                  <Link href={`/ads/placements/${placement.id}`}>Открыть</Link>
                </div>
              </div>
            ))}
            {!withoutStatus.length ? <p className="ads-empty">Размещений без статуса нет.</p> : null}
          </div>
        </div>
      </section>

      <section className="ads-grid-two">
        <div className="ads-panel">
          <div className="ads-panel-title">
            <h2>Ближайшие размещения</h2>
          </div>
          <div className="ads-list">
            {upcomingPlacements.map((placement) => (
              <div className="ads-list-row" key={placement.id}>
                <div>
                  <strong>{placement.channel.name}</strong>
                  <span>{placement.manager?.name ?? "без менеджера"} · {placement.platform}</span>
                </div>
                <div>
                  <b>{dateTime(placement.plannedAt)}</b>
                  <Link href={`/ads/placements/${placement.id}`}>Открыть</Link>
                </div>
              </div>
            ))}
            {!upcomingPlacements.length ? <p className="ads-empty">Ближайших размещений нет.</p> : null}
          </div>
        </div>

        <div className="ads-panel">
          <div className="ads-panel-title">
            <h2>Последние размещения</h2>
          </div>
          <div className="ads-list">
            {recentPlacements.map((placement) => (
              <div className="ads-list-row" key={placement.id}>
                <div>
                  <strong>{placement.channel.name}</strong>
                  <span>{placement.manager?.name ?? "без менеджера"} · {placement.platform}</span>
                </div>
                <div>
                  <b>{dateTime(placement.plannedAt)}</b>
                  <Link href={`/ads/placements/${placement.id}`}>Открыть</Link>
                </div>
              </div>
            ))}
            {!recentPlacements.length ? <p className="ads-empty">Последних размещений нет.</p> : null}
          </div>
        </div>
      </section>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Размещения кампании</h2>
          <Link href={`/ads/placements?campaignId=${campaign.id}`}>открыть таблицу</Link>
        </div>
        <table className="ads-table ads-table-dense">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Канал</th>
              <th>Менеджер</th>
              <th>Платформа</th>
              <th>Цена</th>
              <th>Статус</th>
              <th>Подтверждение</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {placements.map((placement) => (
              <tr key={placement.id}>
                <td>{dateTime(placement.plannedAt)}</td>
                <td>{placement.channel.name}</td>
                <td>{placement.manager?.name ?? "—"}</td>
                <td>{placement.platform}</td>
                <td>{rub(placement.priceRub)}</td>
                <td><span className="ads-pill">{placement.status || "Без статуса"}</span></td>
                <td>{proofSet.has(placement.id) ? "proof есть" : "нет proof"}</td>
                <td>
                  <Link className="ads-button" href={`/ads/placements/${placement.id}`}>
                    Открыть
                  </Link>
                </td>
              </tr>
            ))}
            {!placements.length ? (
              <tr>
                <td className="ads-empty" colSpan={8}>Размещений в кампании пока нет.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
