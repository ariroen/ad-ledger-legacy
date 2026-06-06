import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/ads/auth";
import { prisma } from "@/lib/ads/db";
import { dateTime, rub } from "@/lib/ads/format";

type PlacementDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlacementDetailPage({ params }: PlacementDetailPageProps) {
  await requireUser();
  const { id } = await params;

  const placement = await prisma.placement.findUnique({
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
  });

  if (!placement) notFound();

  return (
    <>
      <header className="ads-header">
        <div>
          <p className="ads-kicker">РАЗМЕЩЕНИЕ</p>
          <h1>{placement.channel?.name ?? "Размещение"}</h1>
          <p>Карточка рекламного размещения: выход, подтверждения, финансы и комментарии.</p>
        </div>
        <Link className="ads-button" href="/ads/placements">
          ← Назад к размещениям
        </Link>
      </header>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Основное</h2>
        </div>
        <div className="ads-list">
          <div className="ads-list-row">
            <div>
              <strong>Дата выхода</strong>
            </div>
            <div>
              <b>{dateTime(placement.plannedAt)}</b>
            </div>
          </div>
          <div className="ads-list-row">
            <div>
              <strong>Фактический выход</strong>
            </div>
            <div>
              <b>{placement.actualAt ? dateTime(placement.actualAt) : "—"}</b>
            </div>
          </div>
          <div className="ads-list-row">
            <div>
              <strong>Статус</strong>
            </div>
            <div>
              <b>{placement.status}</b>
            </div>
          </div>
          <div className="ads-list-row">
            <div>
              <strong>Платформа</strong>
            </div>
            <div>
              <b>{placement.platform}</b>
            </div>
          </div>
          <div className="ads-list-row">
            <div>
              <strong>Цена</strong>
            </div>
            <div>
              <b>{rub(placement.priceRub)}</b>
            </div>
          </div>
          <div className="ads-list-row">
            <div>
              <strong>Менеджер</strong>
            </div>
            <div>
              <b>{placement.manager ? placement.manager.name : "без менеджера"}</b>
              {placement.manager?.username ? <span>{placement.manager.username}</span> : null}
            </div>
          </div>
          <div className="ads-list-row">
            <div>
              <strong>Ссылка на канал</strong>
            </div>
            <div>
              {placement.channel?.url ? (
                <a href={placement.channel.url} target="_blank" rel="noreferrer">
                  Открыть канал
                </a>
              ) : (
                <b>—</b>
              )}
            </div>
          </div>
          <div className="ads-list-row">
            <div>
              <strong>Ссылка на пост</strong>
            </div>
            <div>
              {placement.postUrl ? (
                <a href={placement.postUrl} target="_blank" rel="noreferrer">
                  Открыть пост
                </a>
              ) : (
                <b>—</b>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="ads-panel">
        <div className="ads-panel-title">
          <h2>Подтверждения</h2>
        </div>
        {placement.proofs.length === 0 ? (
          <p className="ads-empty">Подтверждений пока нет.</p>
        ) : (
          <div className="ads-list">
            {placement.proofs.map((proof) => (
              <div className="ads-list-row" key={proof.id}>
                <div>
                  <strong>{proof.kind}</strong>
                  <span>{dateTime(proof.createdAt)}</span>
                </div>
                <div>
                  {proof.url ? (
                    <a href={proof.url} target="_blank" rel="noreferrer">
                      Открыть ссылку
                    </a>
                  ) : null}
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
          <h2>Финансы</h2>
        </div>
        {placement.payments.length === 0 ? (
          <p className="ads-empty">Оплат по размещению пока нет.</p>
        ) : (
          <div className="ads-list">
            {placement.payments.map((payment) => (
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
        {placement.note ? <p>{placement.note}</p> : <p className="ads-empty">Комментарий не указан.</p>}
      </section>
    </>
  );
}
