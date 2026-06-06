import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/ads/auth";
import { buildSingleImportPreview, getManualImportContext, parseBulkImportText, saveManualImportEntries } from "@/lib/ads/manual-import";

type ImportPageProps = {
  searchParams: Promise<{
    view?: string;
    campaignId?: string;
    bulkText?: string;
    plannedAt?: string;
    channelName?: string;
    managerName?: string;
    status?: string;
    link?: string;
    proof?: string;
    note?: string;
  }>;
};

export default async function AdsImportPage({ searchParams }: ImportPageProps) {
  await requireUser();
  const params = await searchParams;
  const context = await getManualImportContext();
  const selectedCampaignId = params.campaignId ?? context.defaultCampaign.id;

  let bulkPreview = [] as ReturnType<typeof parseBulkImportText>;
  let singlePreview: ReturnType<typeof buildSingleImportPreview> | null = null;

  if (params.view === "bulk" && params.bulkText?.trim()) {
    bulkPreview = parseBulkImportText(params.bulkText, selectedCampaignId, {
      campaigns: context.campaigns,
      existingChannels: context.existingChannels,
      existingManagers: context.existingManagers,
    });
  }

  if (params.view === "single" && params.plannedAt?.trim() && params.channelName?.trim()) {
    singlePreview = buildSingleImportPreview(
      {
        campaignId: selectedCampaignId,
        plannedAt: params.plannedAt,
        channelName: params.channelName,
        managerName: params.managerName,
        status: params.status,
        link: params.link,
        proof: params.proof,
        note: params.note,
      },
      {
        campaigns: context.campaigns,
        existingChannels: context.existingChannels,
        existingManagers: context.existingManagers,
      },
    );
  }

  const bulkSavable = bulkPreview.filter((item) => item.canSave);
  const singleSavable = singlePreview?.canSave ? [singlePreview] : [];

  async function savePreviewAction(formData: FormData) {
    "use server";

    const payload = formData.get("payload");
    if (typeof payload !== "string" || !payload.trim()) {
      redirect("/ads/import");
    }

    const entries = JSON.parse(payload) as Array<{
      rawLine: string;
      campaignId: string;
      campaignName: string;
      plannedAtIso: string;
      channelName: string;
      managerName: string | null;
      status: string;
      note: string | null;
      postUrl: string | null;
      channelUrl: string | null;
      proofUrl: string | null;
      proofNote: string | null;
      platform: string;
    }>;

    await saveManualImportEntries(entries);
    redirect("/ads/placements");
  }

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Импорт</p>
          <h1>Ручной импорт</h1>
          <p>Быстрое добавление размещений, каналов, менеджеров и подтверждений без ручного ада.</p>
        </div>
        <div className="ads-actions">
          <Link className="ads-button" href="/ads">
            К обзору
          </Link>
          <Link className="ads-button" href="/ads/placements">
            К размещениям
          </Link>
        </div>
      </header>

      <section className="ads-grid-two">
        <section className="ads-panel">
          <div className="ads-panel-title">
            <h2>Одиночное добавление</h2>
          </div>
          <form className="ads-filter" method="get">
            <input type="hidden" name="view" value="single" />
            <input type="date" name="plannedAt" defaultValue={params.plannedAt ?? ""} />
            <select name="campaignId" defaultValue={selectedCampaignId}>
              {context.campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
            <input name="channelName" placeholder="Канал" defaultValue={params.channelName ?? ""} />
            <input name="managerName" placeholder="Менеджер" defaultValue={params.managerName ?? ""} />
            <input name="status" placeholder="Статус" defaultValue={params.status ?? ""} />
            <input name="link" placeholder="Ссылка на пост/канал" defaultValue={params.link ?? ""} />
            <input name="proof" placeholder="Proof / ссылка на подтверждение" defaultValue={params.proof ?? ""} />
            <input name="note" placeholder="Комментарий" defaultValue={params.note ?? ""} />
            <button className="ads-button" type="submit">Показать preview</button>
          </form>

          {singlePreview ? (
            <div className="ads-list">
              <div className="ads-list-row">
                <div>
                  <strong>{singlePreview.channelName}</strong>
                  <span>{singlePreview.campaignName}</span>
                  <span>{singlePreview.managerName ?? "без менеджера"} · {singlePreview.status}</span>
                </div>
                <div>
                  <b>{singlePreview.plannedAtIso ? new Date(singlePreview.plannedAtIso).toLocaleString("ru-RU") : "—"}</b>
                  <span>{singlePreview.createChannel ? "будет создан новый канал" : "канал уже есть"}</span>
                  <span>{singlePreview.createManager ? "будет создан новый менеджер" : "менеджер уже есть или не указан"}</span>
                </div>
              </div>
              {singlePreview.warnings.map((warning) => (
                <p className="ads-empty" key={warning}>{warning}</p>
              ))}
              {singlePreview.blockingIssues.map((issue) => (
                <p className="ads-empty" key={issue}>{issue}</p>
              ))}
              {singlePreview.canSave ? (
                <form action={savePreviewAction}>
                  <input
                    type="hidden"
                    name="payload"
                    value={JSON.stringify(singleSavable.map(({ createChannel, createManager, warnings, blockingIssues, canSave, ...entry }) => entry))}
                  />
                  <button className="ads-button ads-button-primary" type="submit">Сохранить размещение</button>
                </form>
              ) : null}
            </div>
          ) : (
            <p className="ads-empty">Заполни поля и посмотри preview перед сохранением.</p>
          )}
        </section>

        <section className="ads-panel">
          <div className="ads-panel-title">
            <h2>Массовый ввод</h2>
          </div>
          <form className="ads-filter" method="get">
            <input type="hidden" name="view" value="bulk" />
            <select name="campaignId" defaultValue={selectedCampaignId}>
              {context.campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
            <textarea
              name="bulkText"
              rows={10}
              defaultValue={params.bulkText ?? ""}
              placeholder={"02.06 — Канал 1 — Менеджер Иван — вышло — proof есть\n03.06 — Канал 2 — Менеджер Олег — не вышло — нет proof"}
            />
            <button className="ads-button" type="submit">Разобрать строки</button>
          </form>

          {bulkPreview.length ? (
            <>
              <table className="ads-table ads-table-dense">
                <thead>
                  <tr>
                    <th>Строка</th>
                    <th>Кампания</th>
                    <th>Что будет создано</th>
                    <th>Статус preview</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkPreview.map((item, index) => (
                    <tr key={`${item.rawLine}-${index}`}>
                      <td>{item.rawLine}</td>
                      <td>{item.campaignName}</td>
                      <td>
                        {item.canSave ? "новая запись размещения" : "строка пропущена"}
                        {item.createChannel ? " · новый канал" : ""}
                        {item.createManager ? " · новый менеджер" : ""}
                        {item.proofUrl || item.proofNote ? " · proof" : ""}
                      </td>
                      <td>
                        {item.blockingIssues.length ? item.blockingIssues.join(" · ") : item.warnings.join(" · ") || "готово к сохранению"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bulkSavable.length ? (
                <form action={savePreviewAction}>
                  <input
                    type="hidden"
                    name="payload"
                    value={JSON.stringify(bulkSavable.map(({ createChannel, createManager, warnings, blockingIssues, canSave, ...entry }) => entry))}
                  />
                  <button className="ads-button ads-button-primary" type="submit">Сохранить распознанное</button>
                </form>
              ) : (
                <p className="ads-empty">Нет строк, которые безопасно сохранять.</p>
              )}
            </>
          ) : (
            <p className="ads-empty">Вставь список строк, чтобы увидеть preview распознавания.</p>
          )}
        </section>
      </section>
    </>
  );
}
