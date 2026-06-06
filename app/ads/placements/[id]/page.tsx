import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireUser } from "@/lib/ads/auth";
import { prisma } from "@/lib/ads/db";
import { dateTime, rub } from "@/lib/ads/format";
import { getCampaignsForSelect } from "@/lib/ads/queries";
import { addPlacementProof, deletePlacement, updatePlacement } from "@/lib/ads/placements-service";

type PlacementDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlacementDetailPage({ params }: PlacementDetailPageProps) {
  await requireUser();
  const { id } = await params;
  const [placement, campaigns] = await Promise.all([
    prisma.placement.findUnique({
      where: { id },
      select: {
        id: true,
        plannedAt: true,
        actualAt: true,
        platform: true,
        priceRub: true,
        status: true,
        postUrl: true,
        note: true,
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
            url: true,
            platform: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        proofs: {
          select: {
            id: true,
            kind: true,
            url: true,
            filePath: true,
            note: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        payments: {
          select: {
            id: true,
            amountRub: true,
            status: true,
            paidAt: true,
            method: true,
            note: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    getCampaignsForSelect(),
  ]);

  if (!placement) notFound();
  const currentPlacement = placement;

  async function updatePlacementAction(formData: FormData) {
    "use server";

    await updatePlacement(id, {
      campaignId: String(formData.get("campaignId") || ""),
      plannedAt: String(formData.get("plannedAt") || ""),
      actualAt: String(formData.get("actualAt") || ""),
      platform: String(formData.get("platform") || currentPlacement.platform),
      channelName: String(formData.get("channelName") || ""),
      channelUrl: String(formData.get("channelUrl") || ""),
      managerName: String(formData.get("managerName") || ""),
      managerUsername: String(formData.get("managerUsername") || ""),
      priceRub: formData.get("priceRub") ? Number(formData.get("priceRub")) : null,
      status: String(formData.get("status") || ""),
      postUrl: String(formData.get("postUrl") || ""),
      note: String(formData.get("note") || ""),
    });

    redirect(`/ads/placements/${id}`);
  }

  async function addProofAction(formData: FormData) {
    "use server";

    await addPlacementProof(id, {
      kind: String(formData.get("kind") || "other"),
      url: String(formData.get("url") || ""),
      filePath: String(formData.get("filePath") || ""),
      note: String(formData.get("note") || ""),
    });

    redirect(`/ads/placements/${id}`);
  }

  async function deletePlacementAction() {
    "use server";

    await deletePlacement(id);
    redirect("/ads/placements");
  }

  const toDateTimeLocal = (value: Date | null) => {
    if (!value) return "";
    return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">РАЗМЕЩЕНИЕ</p>
          <h1>{currentPlacement.channel?.name ?? "Размещение"}</h1>
          <p>Карточка рекламного размещения: выход, подтверждения, финансы и комментарии.</p>
        </div>
        <div className="ads-actions">
          <Link className="ads-button" href="/ads/placements">
            ← Назад к размещениям
          </Link>
          {currentPlacement.campaign ? (
            <Link className="ads-button" href={`/ads/campaigns/${currentPlacement.campaign.id}`}>
              К кампании
            </Link>
          ) : null}
        </div>
      </header>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Основное</h2>
        </div>
        <div className="ads-list">
          <div className="ads-list-row"><div><strong>Кампания</strong></div><div><b>{currentPlacement.campaign?.name ?? "Без кампании"}</b></div></div>
          <div className="ads-list-row"><div><strong>Дата выхода</strong></div><div><b>{dateTime(currentPlacement.plannedAt)}</b></div></div>
          <div className="ads-list-row"><div><strong>Фактический выход</strong></div><div><b>{currentPlacement.actualAt ? dateTime(currentPlacement.actualAt) : "—"}</b></div></div>
          <div className="ads-list-row"><div><strong>Статус</strong></div><div><b>{currentPlacement.status}</b></div></div>
          <div className="ads-list-row"><div><strong>Платформа</strong></div><div><b>{currentPlacement.platform}</b></div></div>
          <div className="ads-list-row"><div><strong>Цена</strong></div><div><b>{rub(currentPlacement.priceRub)}</b></div></div>
          <div className="ads-list-row"><div><strong>Менеджер</strong></div><div><b>{currentPlacement.manager ? currentPlacement.manager.name : "без менеджера"}</b>{currentPlacement.manager?.username ? <span>{currentPlacement.manager.username}</span> : null}</div></div>
          <div className="ads-list-row"><div><strong>Ссылка на канал</strong></div><div>{currentPlacement.channel?.url ? <a href={currentPlacement.channel.url} target="_blank" rel="noreferrer">Открыть канал</a> : <b>—</b>}</div></div>
          <div className="ads-list-row"><div><strong>Ссылка на пост</strong></div><div>{currentPlacement.postUrl ? <a href={currentPlacement.postUrl} target="_blank" rel="noreferrer">Открыть пост</a> : <b>—</b>}</div></div>
        </div>
      </section>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Управление размещением</h2>
        </div>
        <form className="ads-filter" action={updatePlacementAction}>
          <select name="campaignId" defaultValue={currentPlacement.campaign?.id ?? ""}>
            <option value="">Без кампании</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          <input name="plannedAt" type="datetime-local" defaultValue={toDateTimeLocal(currentPlacement.plannedAt)} />
          <input name="actualAt" type="datetime-local" defaultValue={toDateTimeLocal(currentPlacement.actualAt)} />
          <select name="platform" defaultValue={currentPlacement.platform}>
            <option value="TG">TG</option>
            <option value="MAX">MAX</option>
            <option value="VK">VK</option>
            <option value="OK">OK</option>
          </select>
          <input name="channelName" defaultValue={currentPlacement.channel?.name ?? ""} placeholder="Канал" />
          <input name="channelUrl" defaultValue={currentPlacement.channel?.url ?? ""} placeholder="Ссылка на канал" />
          <input name="managerName" defaultValue={currentPlacement.manager?.name ?? ""} placeholder="Менеджер" />
          <input name="managerUsername" defaultValue={currentPlacement.manager?.username ?? ""} placeholder="Username менеджера" />
          <input name="priceRub" type="number" defaultValue={currentPlacement.priceRub ?? ""} placeholder="Цена" />
          <select name="status" defaultValue={currentPlacement.status}>
            <option value="запланировано">запланировано</option>
            <option value="ждём выход">ждём выход</option>
            <option value="вышло">вышло</option>
            <option value="требует проверки">требует проверки</option>
            <option value="перенос">перенос</option>
            <option value="отмена">отмена</option>
          </select>
          <input name="postUrl" defaultValue={currentPlacement.postUrl ?? ""} placeholder="Ссылка на пост" />
          <input name="note" defaultValue={currentPlacement.note ?? ""} placeholder="Комментарий" />
          <button className="ads-button ads-button-primary" type="submit">Сохранить изменения</button>
        </form>
      </section>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Подтверждения</h2>
        </div>
        {currentPlacement.proofs.length === 0 ? (
          <p className="ads-empty">Подтверждений пока нет.</p>
        ) : (
          <div className="ads-list">
            {currentPlacement.proofs.map((proof) => (
              <div className="ads-list-row" key={proof.id}>
                <div>
                  <strong>{proof.kind}</strong>
                  <span>{dateTime(proof.createdAt)}</span>
                </div>
                <div>
                  {proof.url ? <a href={proof.url} target="_blank" rel="noreferrer">Открыть ссылку</a> : null}
                  {proof.filePath ? <span>{proof.filePath}</span> : null}
                  {proof.note ? <span>{proof.note}</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Добавить подтверждение</h2>
        </div>
        <form className="ads-filter" action={addProofAction}>
          <select name="kind" defaultValue="link">
            <option value="screenshot">screenshot</option>
            <option value="link">link</option>
            <option value="file">file</option>
            <option value="other">other</option>
          </select>
          <input name="url" placeholder="URL подтверждения" />
          <input name="filePath" placeholder="Путь к файлу" />
          <input name="note" placeholder="Комментарий" />
          <button className="ads-button ads-button-primary" type="submit">Добавить подтверждение</button>
        </form>
      </section>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Финансы</h2>
        </div>
        {currentPlacement.payments.length === 0 ? (
          <p className="ads-empty">Оплат по размещению пока нет.</p>
        ) : (
          <div className="ads-list">
            {currentPlacement.payments.map((payment) => (
              <div className="ads-list-row" key={payment.id}>
                <div>
                  <strong>{rub(payment.amountRub)}</strong>
                  <span>{payment.status}</span>
                </div>
                <div>
                  <b>{payment.paidAt ? dateTime(payment.paidAt) : "—"}</b>
                  <span>{payment.method ?? "—"}</span>
                  {payment.note ? <span>{payment.note}</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Комментарий</h2>
        </div>
        {currentPlacement.note ? <p>{currentPlacement.note}</p> : <p className="ads-empty">Комментарий не указан.</p>}
      </section>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Удаление</h2>
        </div>
        <p>Удаление уберёт размещение и его proof. Использовать только если размещение добавлено ошибочно.</p>
        <form action={deletePlacementAction}>
          <button className="ads-button" type="submit">Удалить размещение</button>
        </form>
      </section>
    </>
  );
}
