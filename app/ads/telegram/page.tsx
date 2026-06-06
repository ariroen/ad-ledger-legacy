import { getTelegramInbox } from "@/lib/ads/queries";
import { dateTime } from "@/lib/ads/format";
import { requireUser } from "@/lib/ads/auth";

export default async function TelegramPage() {
  await requireUser();
  const messages = await getTelegramInbox();

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">Полуавтомат</p>
          <h1>Очередь Telegram</h1>
          <p>Бот складывает сообщения в JSONL, импортёр создаёт очередь, admin подтверждает действия.</p>
        </div>
        <form action="/api/ads/telegram/import" method="post">
          <button className="ads-button ads-button-primary" type="submit">Импортировать входящие</button>
        </form>
      </header>
      <section className="ads-panel ads-inbox">
        {messages.map((message) => {
          const actions = message.suggestedActions ? JSON.parse(message.suggestedActions) as string[] : [];
          return (
            <article key={message.id} className="ads-message">
              <div className="ads-message-head">
                <div>
                  <strong>{message.senderName ?? message.senderUsername ?? message.chatId}</strong>
                  <span>{dateTime(message.receivedAt)} · {message.reviewStatus}</span>
                </div>
                <div className="ads-actions">
                  <form action="/api/ads/telegram/review" method="post">
                    <input type="hidden" name="id" value={message.id} />
                    <input type="hidden" name="reviewStatus" value="reviewed" />
                    <button className="ads-button" type="submit">Проверено</button>
                  </form>
                  <form action="/api/ads/telegram/review" method="post">
                    <input type="hidden" name="id" value={message.id} />
                    <input type="hidden" name="reviewStatus" value="needs_review" />
                    <button className="ads-button" type="submit">На проверку</button>
                  </form>
                </div>
              </div>
              <p>{message.text || "Без текста"}</p>
              <div className="ads-tags">
                {actions.map((action) => <span key={action}>{action}</span>)}
              </div>
              <div className="ads-proposals">
                {message.proposedChanges.map((change) => {
                  const payload = JSON.parse(change.payloadJson || "{}") as Record<string, unknown>;
                  return (
                    <div className="ads-proposal" key={change.id}>
                      <div>
                        <strong>{change.actionType}</strong>
                        <span>{change.status} · {change.confidence ? `${Math.round(change.confidence * 100)}%` : "без оценки"}</span>
                        <small>
                          {[payload.date, payload.channelName, payload.channelUrl, payload.priceRub ? `${payload.priceRub} ₽` : null, payload.postUrl]
                            .filter(Boolean)
                            .join(" · ") || change.requiresCheckReason || "данные не распознаны"}
                        </small>
                      </div>
                      <div className="ads-actions">
                        <form action={`/api/ads/proposed-changes/${change.id}/apply`} method="post">
                          <button className="ads-button ads-button-primary" type="submit" disabled={change.status === "applied"}>Применить</button>
                        </form>
                        <form action={`/api/ads/proposed-changes/${change.id}/status`} method="post">
                          <input type="hidden" name="status" value="needs_review" />
                          <button className="ads-button" type="submit">На проверку</button>
                        </form>
                        <form action={`/api/ads/proposed-changes/${change.id}/status`} method="post">
                          <input type="hidden" name="status" value="ignored" />
                          <button className="ads-button" type="submit">Игнор</button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
              {message.attachments.length ? <small>{message.attachments.length} вложений</small> : null}
            </article>
          );
        })}
      </section>
    </>
  );
}
